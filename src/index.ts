// @ts-nocheck - Disable TypeScript checking for this file
import { serve } from "bun";
import moment from "moment-timezone";
import { readFileSync } from "fs";
import path from "path";
import type { Server } from "bun";

// Set default timezone to Taipei globally
moment.tz.setDefault("Asia/Taipei");

import { db, drizzleConnectionTest } from "./lib";
import { SERVER_CONFIG } from "./config";
import { AuthController } from "./domains/auth/AuthController";
import { DocumentController } from "./domains/documents/controllers";
import { CustomerController } from "./domains/customers/CustomerController";
import { ArcRuleController } from "./domains/csvRules/controllers/ArcRuleController";
import { EngineModelRuleController } from "./domains/csvRules/controllers/EngineModelRuleController";
import { WorkScopeRuleController } from "./domains/csvRules/controllers/WorkScopeRuleController";
import { PartNumberRuleController } from "./domains/csvRules/controllers/PartNumberRuleController";
import { CsvRecordController } from "./domains/csvRecords/controllers";
import { AiTrainingController } from "./domains/ai_training/controllers";
import { AuthMiddleware } from "./middlewares/authMiddleware";

// Create controller instances
const authController = new AuthController();
const documentController = new DocumentController();
const customerController = new CustomerController();
const arcRuleController = new ArcRuleController();
const engineModelRuleController = new EngineModelRuleController();
const workScopeRuleController = new WorkScopeRuleController();
const partNumberRuleController = new PartNumberRuleController();
const csvRecordController = new CsvRecordController();
const aiTrainingController = new AiTrainingController();

// Create auth middleware instance
const authMiddleware = new AuthMiddleware();

// Extract server configuration
const PORT = SERVER_CONFIG.PORT;
const HOST = SERVER_CONFIG.HOST;
const APP_NAME = SERVER_CONFIG.APP_NAME;
const HTTPS_PORT = SERVER_CONFIG.HTTPS_PORT || 3443; // Default HTTPS port

// TLS configuration for HTTPS
const TLS_CONFIG = {
  key: SERVER_CONFIG.TLS_KEY_PATH ? readFileSync(SERVER_CONFIG.TLS_KEY_PATH) : undefined,
  cert: SERVER_CONFIG.TLS_CERT_PATH ? readFileSync(SERVER_CONFIG.TLS_CERT_PATH) : undefined,
  passphrase: SERVER_CONFIG.TLS_PASSPHRASE,
};

// Start database connection verification but don't block server startup
Promise.all([
  db.waitForConnection(),
  drizzleConnectionTest.waitForConnection()
]).then(([supabaseConnected, drizzleConnected]) => {
  if (supabaseConnected && drizzleConnected) {
    console.log("🚀 Server is fully operational with all database connections");
  }
});

// CORS headers to add to responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper function to add CORS headers to a response
function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // Add CORS headers
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Get the server config type from Bun's serve function
type ServeConfig = Parameters<typeof serve>[0];

// Add a custom interface for BunRequest with params
interface BunRequest extends Request {
  params: Record<string, string>;
}

// Create a simple HTTP server using Bun
const httpServer: ServeConfig = {
  port: PORT,
  hostname: HOST,
  // Define routes directly in the routes object
  routes: {
    // Home route
    "/": () => addCorsHeaders(new Response("Welcome to the ARD Server!")),
    
    // Health check route for Docker
    "/health": () => addCorsHeaders(Response.json({
      status: "ok",
      timestamp: new Date().toISOString()
    })),
    
    // API info route
    "/api": () => addCorsHeaders(Response.json({
      message: "API endpoint",
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      app_name: process.env.APP_NAME || "ARD Server",
    })),
    
    // Auth routes
    "/api/auth/login": {
      POST: async (req) => addCorsHeaders(await authController.login(req)),
    },
    "/api/auth/register": {
      POST: async (req) => addCorsHeaders(await authController.register(req)),
    },
    
    // User routes
    "/api/auth/users": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAdmin(req, (req) => authController.createUser(req))),
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAdmin(req, (req) => authController.getUsers(req))),
    },
    "/api/auth/users/:id": {
      PUT: async (req) => addCorsHeaders(await authMiddleware.requireAdmin(req, (req) => authController.updateUser(req.params.id, req))),
      DELETE: async (req) => addCorsHeaders(await authMiddleware.requireAdmin(req, (req) => authController.deleteUser(req.params.id))),
    },
    
    // Document routes
    "/api/documents": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.getDocumentsWithPagination(req))),
    },
    "/api/documents/filtered": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.getFilteredDocuments(req))),
    },
    "/api/documents/search/import-numbers": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.searchImportNumbers(req))),
    },
    "/api/documents/refresh": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.refreshDocuments(req))),
    },
    "/api/documents/pdf_to_images": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.uploadPdfToExternal(req))),
    },
    "/api/documents/pdf_full_ard": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.pdfFullARD(req))),
    },
    "/api/documents/ocr": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.scanDocumentOcr(req))),
    },
    "/api/documents/bucket/batch": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.getDocumentsFromBucket(req))),
    },
    "/api/documents/bucket/upload": {
      POST: async (req) => addCorsHeaders(await documentController.uploadDocumentToBucket(req)),
    },
    "/api/documents/:id/import-number": {
      PATCH: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.addImportNumber(req))),
    },
    "/api/documents/:id": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.getDocumentById(req))),
      PUT: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.updateDocument(req))),
      DELETE: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.deleteDocument(req))),
    },
    "/api/documents/bucket/:id": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => documentController.getDocumentFromBucket(req))),
    },
    
    // Customer routes
    "/api/customers": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.getCustomers(req))),
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.createCustomer(req))),
    },
    "/api/customers/search": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.searchCustomers(req))),
    },
    "/api/customers/byName": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.getCustomerByName(req))),
    },
    "/api/customers/byHash": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.getCustomerByHash(req))),
    },
    "/api/customers/fileFormats": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.getFileFormatsByCustomerName(req))),
    },
    "/api/customers/documentTypes": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.getDocumentTypesByCustomer(req))),
    },
    "/api/customers/:id": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.getCustomerById(req))),
      PUT: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.updateCustomer(req))),
      DELETE: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.deleteCustomer(req))),
    },
    "/api/customers/find/end-user-customer-number": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => customerController.findEndUserCustomerNumberByName(req))),
    },
    
    // Arc Rule routes
    "/api/arc-rules": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => arcRuleController.getArcRules(req))),
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => arcRuleController.createArcRule(req))),
    },
    "/api/arc-rules/:id": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => arcRuleController.getArcRuleById(req))),
      PUT: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => arcRuleController.updateArcRule(req))),
      DELETE: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => arcRuleController.deleteArcRule(req))),
    },

    // Engine Model Rule routes
    "/api/engine-model-rules": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => engineModelRuleController.getEngineModelRules(req))),
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => engineModelRuleController.createEngineModelRule(req))),
    },
    "/api/engine-model-rules/:id": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => engineModelRuleController.getEngineModelRuleById(req))),
      PUT: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => engineModelRuleController.updateEngineModelRule(req))),
      DELETE: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => engineModelRuleController.deleteEngineModelRule(req))),
    },
    
    // Work Scope Rule routes
    "/api/work-scope-rules": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => workScopeRuleController.getWorkScopeRules(req))),
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => workScopeRuleController.createWorkScopeRule(req))),
    },
    "/api/work-scope-rules/:id": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => workScopeRuleController.getWorkScopeRuleById(req))),
      PUT: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => workScopeRuleController.updateWorkScopeRule(req))),
      DELETE: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => workScopeRuleController.deleteWorkScopeRule(req))),
    },
    
    // Part Number Rule routes
    "/api/part-number-rules": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => partNumberRuleController.getPartNumberRules(req))),
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => partNumberRuleController.createPartNumberRule(req))),
    },
    "/api/part-number-rules/:id": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => partNumberRuleController.getPartNumberRuleById(req))),
      PUT: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => partNumberRuleController.updatePartNumberRule(req))),
      DELETE: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => partNumberRuleController.deletePartNumberRule(req))),
    },
    
    // CSV Record routes
    "/api/csv-records/export": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => csvRecordController.exportCsvRecords(req))),
    },

    // AI Training routes
    "/api/customers/:customerId/training/datasets": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.createTrainingDataset(req.params.customerId, req))),
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.getTrainingDatasets(req.params.customerId))),
    },
    "/api/customers/:customerId/training/datasets/documents": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.getTrainingDocuments(req.params.customerId))),
    },
    "/api/customers/:customerId/training/datasets/documents/:datasetId": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.getTrainingDocumentsByDatasetId(req.params.datasetId))),
    },
    "/api/customers/:customerId/training/tasks": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.createTrainingTask(req.params.customerId, req))),
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.getTrainingTasks(req.params.customerId, req))),
    },
    "/api/training/check/tasks": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, () => aiTrainingController.checkTrainingTasks())),
    },
    "/api/customers/:customerId/training/tasks/:taskId/start": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.startTrainingTask(req.params.customerId, req.params.taskId))),
    },
    "/api/webhook/training/tasks/:taskId/complete": {
      POST: async (req) => addCorsHeaders(await aiTrainingController.completeTrainingTask(req.params.taskId)),
    },
    "/api/customers/:customerId/training/dataset/:datasetId/bind": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.bindModelByDatasetId(req.params.customerId, req.params.datasetId))),
    },
    "/api/customers/:customerId/training/tasks/:taskId/results": {
      GET: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.getTrainingTaskVerificationResults(req.params.taskId))),
    },
    "/api/load_inference_model/:modelName": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.loadInferenceModel(req.params.modelName))),
    },
    "/api/stop_training": {
      POST: async (req) => addCorsHeaders(await authMiddleware.requireAuth(req, (req) => aiTrainingController.stopTraining())),
    }
  },
  
  // Fallback handler for routes not defined in the routes object
  // and for handling CORS preflight requests
  async fetch(req: BunRequest) {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Get the path from the URL
    const path = new URL(req.url).pathname;

    // Output the request URL for debugging
    console.log(`Unmatched request: ${req.method} ${path}`);

    // Default 404 response if no handler matches
    return addCorsHeaders(new Response("Not Found", { status: 404 }));
  },
};

// Create HTTPS server if TLS credentials are provided
if (TLS_CONFIG.key && TLS_CONFIG.cert) {
  // Create a copy of the HTTP server config with TLS settings for HTTPS
  const httpsServer: ServeConfig = {
    ...httpServer,
    port: HTTPS_PORT,
    tls: {
      key: TLS_CONFIG.key,
      cert: TLS_CONFIG.cert,
      passphrase: TLS_CONFIG.passphrase
    },
  };
  
  // Customize health endpoint to indicate secure connection
  httpsServer.routes["/health"] = () => addCorsHeaders(Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    secure: true
  }));
  
  // Start HTTPS server
  serve(httpsServer);
  console.log(`${APP_NAME} running securely at https://${HOST}:${HTTPS_PORT}`);
} else {
  // Start HTTP server
  serve(httpServer);
  console.log(`${APP_NAME} running at http://${HOST}:${PORT}`);
  console.log("HTTPS server not started: TLS credentials not configured");
}
