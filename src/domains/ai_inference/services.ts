import { drizzleDb } from "../../lib";
import { t_tasks } from "../../db/schema";
import { eq } from "drizzle-orm";
import { AI_SERVICE_CONFIG } from "../../config";

export class AIInferenceService {
    async loadInferenceModel(modelName: string) {
        const url = `${AI_SERVICE_CONFIG.URL}/api/load_inference_model`;
        
        console.log("[AIInferenceService.loadInferenceModel] - prepare to call url: ", url, "modelName: ", modelName);

        // Create form data for fetch request
        const formData = new FormData();
        formData.append("model_name", modelName);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            console.log("[AIInferenceService.loadInferenceModel] - response: ", data);
            
            if (data.status !== 'success') {
                console.error("[AIInferenceService.loadInferenceModel] - failed to load inference model, response: ", data);
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
            console.error("[AIInferenceService.loadInferenceModel] - error: ", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }
    
    async getTrainingTaskByDatasetId(datasetId: string) {
        // Get the first task with the given dataset ID
        return await drizzleDb
            .select()
            .from(t_tasks)
            .where(eq(t_tasks.t_dataset_id, datasetId))
            .limit(1)
            .then(tasks => tasks.length > 0 ? tasks[0] : null);
    }
    
    async runInference(pdfFile: File, documentType: string, prompt: string) {
        const url = `${AI_SERVICE_CONFIG.URL}/api/inference`;
        
        // Create a FormData object for the AI service request
        const formData = new FormData();
        formData.append("doc_type", documentType);
        formData.append("prompt", prompt === "" ? " " : prompt);
        formData.append('pdf', pdfFile);

        console.log("[AIInferenceService.runInference] - prepare to call url: ", url, "formData: ", formData);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        console.log("[AIInferenceService.runInference] - response data: ", data?.error || JSON.stringify(data));
        
        if (!response.ok) {
            console.error("[AIInferenceService.runInference] - AI inference API request failed, response data: ", data);
            throw new Error(`AI inference API request failed with status ${response.status}, ${data?.error || data}`);
        }
        
        return data;
    }
    
    async runInferenceByRaw(raw: string, documentType: string, prompt: string) {
        const url = `${AI_SERVICE_CONFIG.URL}/api/inference`;
        
        // Create a FormData object for the AI service request
        const formData = new FormData();
        formData.append("doc_type", documentType);
        formData.append("prompt", prompt === "" ? " " : prompt);
        formData.append('raw', raw);

        console.log("[AIInferenceService.runInferenceByRaw] - prepare to call url: ", url);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("[AIInferenceService.runInferenceByRaw] - response data: ", JSON.stringify(data));
        
        return data;
    }
} 