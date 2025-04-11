import type { BunRequest } from "bun";
import { AiTrainingService } from "./services";
import { z } from "zod";
import type { Document } from "../../db/schema";

const createTrainingDatasetSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    trainingDocIds: z.array(z.string()),
    verificationDocIds: z.array(z.string()),
});

const createTrainingTaskSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    trainingDatasetId: z.string(),
    prompt: z.string().min(0).optional(),
    documentType: z.string().min(0).optional(),
});

const bindModelByTaskIdSchema = z.object({
    modelPath: z.string()
});


export class AiTrainingController {
    private readonly aiTrainingService: AiTrainingService;

    constructor() {
        this.aiTrainingService = new AiTrainingService();
    }

    async getTrainingDocuments(customerId: string): Promise<Response> {
        const documents: Document[] = await this.aiTrainingService.getAvailableDocuments(customerId);
        const metaDocs = documents.map(doc => ({
            id: doc.id,
            file_path: doc.file_path
        }));
        return Response.json(metaDocs);
    }

    async getTrainingDocumentsByDatasetId(datasetId: string): Promise<Response> {
        const documents = await this.aiTrainingService.getTrainingDocumentsByDatasetId(datasetId);
        const trainingMetaDocs = documents.training.map(doc => ({
            id: doc.id,
            file_path: doc.file_path
        }));
        const verificationMetaDocs = documents.verification.map(doc => ({
            id: doc.id,
            file_path: doc.file_path
        }));
        return Response.json({
            trainingDocs: trainingMetaDocs,
            verificationDocs: verificationMetaDocs
        });
    }

    async getTrainingDatasets(customerId: string): Promise<Response> {
        const datasets = await this.aiTrainingService.getTrainingDatasets(customerId);
        return Response.json(datasets);
    }
    
    async createTrainingDataset(customerId: string, req: BunRequest): Promise<Response> {
        const body = await req.json();

        const { success, data, error } = createTrainingDatasetSchema.safeParse(body);

        if (!success) {
            return Response.json({
                success: false,
                message: "Invalid request body",
                error: error
            }, {status: 400});
        }

        const name = data.name;
        const trainingDocIds = data.trainingDocIds;
        const verificationDocIds = data.verificationDocIds;

        if (trainingDocIds.length === 0 || verificationDocIds.length === 0) {
            return Response.json({
                success: false,
                message: "Training and verification document IDs are required"
            });
        }

        const trainingDataset = await this.aiTrainingService.createTrainingDataset(customerId, name, trainingDocIds, verificationDocIds);

        if (!trainingDataset.success) {
            return Response.json({
                success: false,
                message: trainingDataset.message
            });
        }

        await this.aiTrainingService.createTrainingJSONFiles(trainingDocIds, trainingDataset.dataset.name);
        

        return Response.json({
            success: true,
            message: "Training dataset created successfully"
        });
    }

    async createTrainingTask(customerId: string, req: BunRequest): Promise<Response> {
        const body = await req.json();
        const { success, data, error } = createTrainingTaskSchema.safeParse(body);

        if (!success) {
            return Response.json({
                success: false,
                message: "Invalid request body",
                error: error
            }, {status: 400});
        }

        const task = await this.aiTrainingService.createTrainingTask(
            customerId,
            data.name,
            data.trainingDatasetId,
            data.prompt,
            data.documentType
        );

        if (!task.success) {
            return Response.json({
                success: false,
                message: task.message
            }, {status: 500});
        }

        return Response.json({
            success: true,
            message: "Training task created successfully",
            task: task.task
        });
    }
    
    async getTrainingTasks(customerId: string, req: BunRequest): Promise<Response> {
        if (!customerId) {
            return Response.json({
                success: false,
                message: "Customer ID is required"
            }, {status: 400});
        }

        const status = new URL(req.url).searchParams.get("status") || undefined;
        const tasks = await this.aiTrainingService.getTrainingTasks(customerId, status);
        return Response.json(tasks);
    }

    async getTrainingTaskVerificationResults(taskId: string): Promise<Response> {
        const results = await this.aiTrainingService.getTtvResults(taskId);
        return Response.json(results);
    }
    
    async startTrainingTask(customerId: string, taskId: string): Promise<Response> {
        if (!customerId || !taskId) {
            return Response.json({
                success: false,
                message: "Customer ID and Task ID are required"
            }, {status: 400});
        }

        const result = await this.aiTrainingService.startTrainingTask(customerId, taskId);
        
        if (!result.success) {
            return Response.json({
                success: false,
                message: result.message || "Failed to start training task"
            }, {status: 400});
        }

        return Response.json({
            success: true,
            message: "Training task started successfully",
            task: result.task
        });
    }
    
    async completeTrainingTask(taskId: string): Promise<Response> {
        if (!taskId) {
            return Response.json({
                success: false,
                message: "Task ID is required"
            }, {status: 400});
        }

        const result = await this.aiTrainingService.completeTrainingTask(taskId);
        
        if (!result.success) {
            return Response.json({
                success: false,
                message: result.message || "Failed to complete training task"
            }, {status: 400});
        }

        return Response.json({
            success: true,
            message: "Training task completed successfully",
            task: result.task
        });
    }

    async bindModelByTaskId(customerId: string, taskId: string, req: BunRequest): Promise<Response> {
        const body = await req.json();

        const { success, data, error } = bindModelByTaskIdSchema.safeParse(body);
        if (!success) {
            return Response.json({
                success: false,
                message: "Invalid request body",
                error: error
            }, {status: 400});
        }

        const result = await this.aiTrainingService.bindModelByTaskId(customerId, taskId, data.modelPath);

        if (!result.success) {
            return Response.json({
                success: false,
                message: result.message || "Failed to bind model to task"
            }, {status: 400});
        }

        return Response.json({
            success: true,
            message: "Model bound to task",
            customer: result.customer
        });
    }

    async checkTrainingTasks(): Promise<Response> {
        const tasks = await this.aiTrainingService.getRunningTrainingTasks();
        
        if (tasks.length === 0) {
            return Response.json({
                hasRunningTasks: false,
                tasks: []
            });
        }
        
        return Response.json({
            hasRunningTasks: true,
            tasks: tasks
        });
    }
}
