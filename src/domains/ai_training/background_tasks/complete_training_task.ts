#!/usr/bin/env bun
/**
 * Background task to complete a training task
 * This script is run as a separate process to avoid blocking the API response
 */

import { AiTrainingService } from "../../ai_training/services";
import { DocumentService } from "../../documents/services";
import { AIInferenceService } from "../../ai_inference/services";
import { createWebSocketService } from "../../../lib/websocket";

// Get task ID from command line arguments
const taskId = process.argv[2];

if (!taskId) {
    console.error("[Background Process] No task ID provided");
    process.exit(1);
}

async function run() {
    console.log("[Background Process] Starting task completion for taskId:", taskId);
    
    // Create services with proper dependency injection
    const aiInferenceService = new AIInferenceService();
    const documentService = new DocumentService();
    const aiTrainingService = new AiTrainingService(documentService, aiInferenceService);
    
    // Create a websocket service for notifications
    // This is a dummy websocket service for the background process
    // The notifications would be handled by the main process websocket anyway
    const mockWebsocketService = {
        sendTrainingStarted: (taskId: string, datasetName: string, customerId: string) => {
            console.log(`[Background Process] Sending training started notification: ${taskId}, ${datasetName}, ${customerId}`);
        },
        sendTrainingCompleted: (taskId: string, accuracy: string) => {
            console.log(`[Background Process] Sending training completed notification: ${taskId}, accuracy: ${accuracy}`);
        },
        sendTrainingFailed: (taskId: string, message: string) => {
            console.log(`[Background Process] Sending training failed notification: ${taskId}, message: ${message}`);
        }
    };
    
    // Set the websocket service
    aiTrainingService.setWebsocketService(mockWebsocketService);
    
    try {
        const result = await aiTrainingService.completeTrainingTask(taskId);
        console.log("[Background Process] Task completed:", result.success ? "Success" : "Failed");
    } catch (error) {
        console.error("[Background Process] Error completing task:", error);
        process.exit(1);
    }
    
    process.exit(0);
}

run(); 