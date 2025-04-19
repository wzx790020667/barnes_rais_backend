import { drizzleDb } from "../../lib";
import { customers, document_items, documents, t_datasets, t_tasks, ttv_results, type Document, type DocumentWithItems, type TrainingDataset, type TrainingTask, type TrainingTaskVerificationResult } from "../../db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { generateCustomerInfoHash } from "../../lib/utils";
import type { BunRequest } from "bun";
import type { AiTrainingStatus, ImportTrainingData, POTrainingData } from "./types";
import { calculateAccuracy, createAnnotationsForImportDocument, createAnnotationsForPODocument, getModelPath, toImportDocumentFromAnnotation, toPODocumentFromAnnotation } from "./util";
import { TRAINING_DATA_CONFIG } from "../../config";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { supabase, db } from "../../lib";
import { AI_SERVICE_CONFIG } from "../../config";
import moment from "moment";
import { DocumentService } from "../documents/services";

export class AiTrainingService {
    private documentService: DocumentService;

    constructor() {
        this.documentService = new DocumentService();
    }

    async loadInferenceModel(modelName: string) {
        const url = `${AI_SERVICE_CONFIG.URL}/api/load_inference_model`;
        
        console.log("[aiTrainingService.loadInferenceModel] - prepare to call url: ", url, "modelName: ", modelName);

        // Create form data for fetch request
        const formData = new FormData();
        formData.append("model_name", modelName);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            console.log("[aiTrainingService.loadInferenceModel] - response: ", data);
            
            if (data.status !== 'success') {
                return {
                    success: false,
                    message: data.message
                };
            }
            
            return {
                success: true,
                message: data.message
            };
        } catch (error) {
            console.error("[aiTrainingService.loadInferenceModel] - error: ", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }
    
    async getAvailableDocuments(customerId: string): Promise<Document[]> {
        // Get the customer's info hash
        const customer = await drizzleDb
            .select()
            .from(customers)
            .where(eq(customers.id, customerId))
            .limit(1)
            .then(results => results[0]);
        
        if (!customer || !customer.file_format) {
            return [];
        }

        const customerInfoHash = generateCustomerInfoHash(
            customer.customer_name, 
            customer.co_code, 
            customer.file_format,
            customer.document_type || ""
        );
        
        // Get all documents with matching customer_info_hash
        const matchingDocuments = await drizzleDb
            .select()
            .from(documents)
            .where(and(
                eq(documents.customer_info_hash, customerInfoHash),
                eq(documents.from_full_ard, false)
            ));
        
        // Return the file paths
        return matchingDocuments;
    }


    async getTrainingDocumentsByDatasetId(datasetId: string): Promise<{ training: Document[], verification: Document[] }> {
        // Get the dataset
        const dataset = await drizzleDb
            .select()
            .from(t_datasets)
            .where(eq(t_datasets.id, datasetId))
            .limit(1)
            .then(results => results[0]);
        
        if (!dataset) {
            return { training: [], verification: [] };
        }
        
        // Get training documents
        const trainingDocs = dataset.training_docs && (dataset.training_docs as string[]).length > 0 
            ? await drizzleDb
                .select()
                .from(documents)
                .where(inArray(documents.id, dataset.training_docs as string[]))
            : [];
            
        // Get verification documents
        const verificationDocs = dataset.verification_docs && (dataset.verification_docs as string[]).length > 0
            ? await drizzleDb
                .select()
                .from(documents)
                .where(inArray(documents.id, dataset.verification_docs as string[]))
            : [];
            
        return {
            training: trainingDocs,
            verification: verificationDocs
        };
    }

    
    async getTrainingDatasets(customerId: string): Promise<TrainingDataset[]> {
        const datasets = await drizzleDb.select().from(t_datasets)
            .where(eq(t_datasets.customer_id, customerId));
        
        if (!datasets || datasets.length === 0) {
            return [];
        }

        return datasets;
    }

    async createTrainingJSONFiles(trainingDocIds: string[], traningDatasetName: string): Promise<any> {
        // First, fetch the documents
        const docs = await drizzleDb.select().from(documents)
            .where(inArray(documents.id, trainingDocIds));
        
        if (!docs || docs.length === 0) {
            return {
                success: false,
                message: "Documents not found"
            };
        }

        // Separately fetch all document items for these documents
        const items = await drizzleDb.select().from(document_items)
            .where(inArray(document_items.document_id, trainingDocIds));
        
        // Group items by document_id
        const itemsByDocId = items.reduce((acc, item) => {
            if (!acc[item.document_id as string]) {
                acc[item.document_id as string] = [];
            }
            acc[item.document_id as string].push(item);
            return acc;
        }, {} as Record<string, typeof items>);

        // Create dataset directory
        const datasetFolderPath = join(TRAINING_DATA_CONFIG.BASE_DATASET_OUTPUT_PATH, traningDatasetName);
        await mkdir(datasetFolderPath, { recursive: true });
        
        const results = [];

        // Now process each document with all its items
        for (const doc of docs) {
            let trainingData: ImportTrainingData | POTrainingData;
            let docType = '';
            
            if (doc.document_type === "import_declaration") {
                trainingData = {
                    Doc_type: "Import",
                    content: doc.t_page_texts as string[],
                    annotations: createAnnotationsForImportDocument(doc, itemsByDocId[doc.id])
                };
                docType = 'Import';
            } else if (doc.document_type === "purchase_order") {
                trainingData = {
                    Doc_type: "PO",
                    content: doc.t_page_texts as string[],
                    annotations: createAnnotationsForPODocument(doc, itemsByDocId[doc.id])
                };
                docType = 'PO';
            } else {
                continue; // Skip unknown document types
            }
            
            // Generate a filename for each document
            const fileName = `${docType}_${doc.id}.json`;
            const filePath = join(datasetFolderPath, fileName);
            
            // Write each training data to its own file
            await Bun.write(filePath, JSON.stringify(trainingData, null, 2));
            console.log(`[aiTrainingService.createTrainingJSONFiles] - created file: ${filePath}`);
            
            results.push({
                docId: doc.id,
                filePath: filePath,
                docType: docType
            });
        }

        return {
            success: true,
            datasetPath: datasetFolderPath,
            files: results
        };
    }

    async createTrainingDataset(customerId: string, name: string, trainingDocIds: string[], verificationDocIds: string[]): Promise<any> {
        // Check if a dataset with the same name already exists for this customer
        const existingDataset = await drizzleDb.select()
            .from(t_datasets)
            .where(and(
                eq(t_datasets.customer_id, customerId),
                eq(t_datasets.name, name)
            ))
            .limit(1);
        
        if (existingDataset && existingDataset.length > 0) {
            return {
                success: false,
                message: `A dataset with this name (${name}) already exists`
            };
        }

        const dataset = await drizzleDb.insert(t_datasets).values({
            id: name,
            customer_id: customerId,
            training_docs: trainingDocIds,
            verification_docs: verificationDocIds,
            name: name
        }).returning();

        if (!dataset || dataset.length === 0) {
            return {
                success: false,
                message: "Failed to create dataset"
            };
        }

        return {
            success: true,
            dataset: dataset[0]
        };
    }

    async createTrainingTask(customerId: string, name: string, trainingDatasetId: string, prompt?: string, documentType?: string): Promise<any> {
        // Check if a task with the same name already exists for this customer
        const existingTask = await drizzleDb.select()
            .from(t_tasks)
            .where(and(
                eq(t_tasks.customer_id, customerId),
                eq(t_tasks.name, name)
            ))
            .limit(1);
        
        if (existingTask && existingTask.length > 0) {
            return {
                success: false,
                message: `A training task with this name (${name}) already exists`
            };
        }

        // Verify the dataset exists and belongs to the customer
        const dataset = await drizzleDb.select()
            .from(t_datasets)
            .where(and(
                eq(t_datasets.id, trainingDatasetId),
                eq(t_datasets.customer_id, customerId)
            ))
            .limit(1);
        
        if (!dataset || dataset.length === 0) {
            return {
                success: false,
                message: "Training dataset not found or does not belong to the customer"
            };
        }

        const task = await drizzleDb.insert(t_tasks).values({
            id: name,
            name: name,
            t_dataset_id: trainingDatasetId,
            customer_id: customerId,
            prompt: prompt || "",
            document_type: documentType || "",
            status: "pending",
            created_at: new Date(),
            updated_at: new Date()
        }).returning();

        if (!task || task.length === 0) {
            return {
                success: false,
                message: "Failed to create training task"
            };
        }

        return {
            success: true,
            task: task[0]
        };
    }

    async getTrainingTasks(customerId: string, status?: string): Promise<TrainingTask[]> {
        let query = supabase.from("t_tasks")
            .select("*")
            .eq("customer_id", customerId);
            
        if (status) {
            query = query.eq("status", status);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error("Error fetching training tasks:", error);
            return [];
        }
        
        if (!data || data.length === 0) {
            return [];
        }

        return data as unknown as TrainingTask[];
    }

    async getRunningTrainingTasks(): Promise<AiTrainingStatus | null> {
        const url = `${AI_SERVICE_CONFIG.URL}/api/training_status`;
        const mockUrl = "http://127.0.0.1:4523/m1/6048702-5738699-default/api/training_status"; // TODO: remove mock url later
        try {
            // Get tasks from database
            const tasks = await drizzleDb.select().from(t_tasks)
                .where(eq(t_tasks.status, "training"));

            if (!tasks || tasks.length === 0) {
                return null;
            }
            
            // Enable API call here later.
            const response = await fetch(url);
            const statusData = await response.json();
            console.log(`[aiTrainingService.getRunningTrainingTasks] - statusData.task_id: ${statusData.task_id}, statusData.is_training: ${statusData.is_training}`);
            
            return {
                ...statusData,
                start_time: tasks[0].start_time || new Date(),
            };
        } catch (error: any) {
            console.error("Error fetching running training tasks:", error.message, "url: ", url);
            return null;
        }
    }
    
    async startTrainingTask(customerId: string, taskId: string, req?: BunRequest): Promise<any> {
        // Get task first to get the dataset ID
        const task = await drizzleDb.select()
            .from(t_tasks)
            .where(and(
                eq(t_tasks.id, taskId),
                eq(t_tasks.customer_id, customerId)
            ))
            .limit(1)
            .then(results => results[0]);
            
        if (!task) {
            return {
                success: false,
                message: "Training task not found or does not belong to the customer"
            };
        }
        
        if (task.status === "training" || task.status === "completed") {
            return {
                success: false,
                message: `Training task is already in ${task.status} state`
            };
        }
        
        // Now fetch customer and dataset in parallel
        const [customer, dataset] = await Promise.all([
            // Get customer
            drizzleDb.select().from(customers)
                .where(eq(customers.id, customerId))
                .limit(1)
                .then(results => results[0]),
                
            // Get dataset using task's dataset ID
            drizzleDb.select()
                .from(t_datasets)
                .where(eq(t_datasets.id, task.t_dataset_id))
                .limit(1)
                .then(results => results[0])
        ]);

        // Validate customer
        if (!customer) {
            return {
                success: false,
                message: "Customer not found"
            };
        }
        if (!dataset) {
            return {
                success: false,
                message: "Dataset not found"
            };
        }
        
        // In a real implementation, we would make an HTTP request to the AI service
        try {
            const datasetName = dataset?.id || 'unknown';
            const formData = new FormData();
            formData.append("task_id", taskId);
            formData.append("dataset_name", datasetName);
            formData.append("document_type", customer.document_type || "");
            formData.append("prompt", task.prompt || "");
            formData.append("callback_url", `/api/webhook/training/tasks/${taskId}/complete`);

            console.log("[aiTrainingService.startTrainingTask] - requestPayload: ", formData);
            
            // Make the actual API call to the external AI service
            const response = await fetch(`${AI_SERVICE_CONFIG.URL}/api/pretrain`, {
                method: 'POST',
                body: formData
            });
            const responseData = await response.json();

            console.log("[aiTrainingService.startTrainingTask] - response: ", responseData);
            
            // Update task status to "training"
            const updatedTask = await drizzleDb.update(t_tasks)
                .set({
                    status: "training",
                    updated_at: new Date(),
                    start_time: new Date(),
                    target_time: new Date(Date.now() + 3600 * 1000) // 1 hour from now
                })
                .where(eq(t_tasks.id, taskId))
                .returning();
                
            if (!updatedTask || updatedTask.length === 0) {
                return {
                    success: false,
                    message: "Failed to update task status"
                };
            }
            
            return {
                success: true,
                message: "Training task started"
            };
        } catch (error) {
            console.error("Error starting training task:", error);
            return {
                success: false,
                message: "Failed to start training task"
            };
        }
    }
    
    async completeTrainingTask(taskId: string): Promise<any> {
        // Verify the task exists
        const task = await drizzleDb.select()
            .from(t_tasks)
            .where(eq(t_tasks.id, taskId))
            .limit(1)
            .then(results => results[0]);
        
        if (!task) {
            return {
                success: false,
                message: "Training task not found"
            };
        }

        try {
            // Load the inference model for data verification
            const result = await this.loadInferenceModel(task.t_dataset_id);
            if (!result.success) {
                return {
                    success: false,
                    message: "Failed to load inference model"
                };
            }

            // First run the document verification in parallel (outside transaction)
            const ttvResult = await this._createTtvResult(task, task.t_dataset_id);
            if (!ttvResult.success) {
                return {
                    success: false,
                    message: "Failed to create TTV result"
                };
            }

            // Then update the task status in a transaction
            const updatedTask = await drizzleDb.update(t_tasks)
                .set({
                    status: "completed",
                    updated_at: new Date(),
                    completed_time: new Date(),
                    model_name: task.t_dataset_id,
                    accuracy: ttvResult.meanAccuracy?.toFixed(2) || "0.00"
                })
                .where(eq(t_tasks.id, taskId))
                .returning();
                
            if (!updatedTask || updatedTask.length === 0) {
                return {
                    success: false,
                    message: "Failed to update task status"
                };
            }
            
            return {
                success: true,
                message: "Training task completed",
                task: updatedTask[0],
            };
        } catch (error) {
            console.error("Error completing training task:", error);
            return {
                success: false,
                message: "Failed to complete training task"
            };
        }
    }

    async _createTtvResult(trainingTask: TrainingTask, modelName: string, tx?: any) {
        const queryExecutor = tx || drizzleDb;
        
        const trainingDataset = await queryExecutor.select().from(t_datasets)
            .where(eq(t_datasets.id, trainingTask.t_dataset_id))
            .limit(1)
            .then((results: any) => results[0]);
            
        if (!trainingDataset) {
            return {
                success: false,
                message: "Training dataset not found"
            };
        }

        const verificationDocIds = trainingDataset.verification_docs as string[];
        const verificationDocs = await db.query(async () => {
            const { data, error } = await supabase.from("documents").select("*, document_items(*)").in("id", verificationDocIds);
            if (error) throw error;
            return data as Document[];
        }).then(results => results.data || []);

        if (!verificationDocs || verificationDocs.length === 0) {
            return {
                success: false,
                message: "No verification documents found"
            };
        }

        // Process all documents sequentially
        const verificationResults = [];
        for (const doc of verificationDocs) {
            console.log("[aiTrainingService._createTtvResult] - start to verify document: ", doc.id);
            const result = await this._verifyDocument(doc, trainingTask);
            verificationResults.push(result);
        }

        const accuracyList = verificationResults.map(result => result.data?.accuracy || 0);
        const meanAccuracy = accuracyList.reduce((acc, curr) => acc + curr, 0) / accuracyList.length;

        // Filter successful results and prepare data for insertion
        const ttvsToInsert = verificationResults
            .filter(result => result.success && result.data)
            .map((result, index) => {
                const { originalDoc, verifiedDoc, accuracy, unmatchedFieldPaths } = result.data!;
                return {
                    id: `TTVR_${moment().unix()}_${index}`,
                    t_task_id: trainingTask.id,
                    original_doc: originalDoc,
                    verified_doc: verifiedDoc,
                    accuracy: accuracy.toFixed(2),
                    unmatched_field_paths: unmatchedFieldPaths,
                };
            });

        // Batch insert TTV results if we have any
        if (ttvsToInsert.length > 0) {
            await queryExecutor.insert(ttv_results).values(ttvsToInsert);
        }

        return {
            success: true,
            results: verificationResults.filter(r => r.success && r.data).map(r => r.data),
            meanAccuracy: meanAccuracy
        };
    }

    async _verifyDocument(doc: Document, task: TrainingTask) {
        const originalDoc = doc;
        try {
            const verifiedDoc = await this.documentService.pdfFullARD(null, doc.document_type || "", task.prompt || "", JSON.stringify(doc.t_page_texts)) ;
            if (!verifiedDoc) {
                return {
                    success: false,
                    message: "Failed to convert verified document"
                };
            }

            const { accuracy, unmatchedFieldPaths } = calculateAccuracy(originalDoc, verifiedDoc);
            console.log(`[aiTrainingService._verifyDocument] - conmpleted a document verification, accuracy: ${accuracy}`);
            
            return {
                success: true,
                data: {
                    originalDoc,
                    verifiedDoc,
                    accuracy,
                    unmatchedFieldPaths 
                }
            };
        } catch (error) {
            console.error("Document verification error:", error);
            return {
                success: false,
                message: `Failed to verify document: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    async getTtvResults(taskId: string): Promise<TrainingTaskVerificationResult[]> {
        return drizzleDb.select().from(ttv_results)
            .where(eq(ttv_results.t_task_id, taskId));
    }

    async bindModelByDatasetId(customerId: string, datasetId: string) {
        const updatedCustomer = await drizzleDb.update(customers).set({
            t_model_name: datasetId
        }).where(eq(customers.id, customerId));

        return {
            success: true,
            message: "Model bound to customer",
            customer: updatedCustomer
        };
    }

    async getTrainingTaskByDatasetId(datasetId: string) {
        const task = await drizzleDb.select()
            .from(t_tasks)
            .where(eq(t_tasks.t_dataset_id, datasetId))
            .limit(1)
            .then(results => results[0]);

        if (!task) {
            return null;
        }

        return task;
    }

    async stopTraining() {
        const url = `${AI_SERVICE_CONFIG.URL}/api/stop_training`;
        const response = await fetch(url, {
            method: 'POST'
        });
        return await response.json();
    }
}