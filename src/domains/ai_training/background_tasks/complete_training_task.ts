#!/usr/bin/env bun
/**
 * Background task to complete a training task
 * This script is run as a separate process to avoid blocking the API response
 */

import { AiTrainingService } from "../../ai_training/services";

// Get task ID from command line arguments
const taskId = process.argv[2];

if (!taskId) {
    console.error("[Background Process] No task ID provided");
    process.exit(1);
}

async function run() {
    console.log("[Background Process] Starting task completion for taskId:", taskId);
    const service = new AiTrainingService();
    
    try {
        const result = await service.completeTrainingTask(taskId);
        console.log("[Background Process] Task completed");
    } catch (error) {
        console.error("[Background Process] Error completing task:", error);
        process.exit(1);
    }
    
    process.exit(0);
}

run(); 