// @ts-nocheck - Disable TypeScript checking for this file
import { serve } from "bun";
import moment from "moment-timezone";
import { readFileSync } from "fs";
import path from "path";
import type { Server } from "bun";

// Set default timezone to Taipei globally
moment.tz.setDefault("Asia/Taipei");

import { db, drizzleConnectionTest } from "./lib";
import {
  createWebSocketService,
  WebsocketMessageType,
  WebsocketMessage,
} from "./lib/websocket";
import { SERVER_CONFIG } from "./config";
import { AuthController } from "./domains/auth/AuthController";
import { DocumentController } from "./domains/documents/controllers";
import { CustomerController } from "./domains/customers/CustomerController";
import { NewCustomerController } from "./domains/new_customers/NewCustomerController";
import { ArcRuleController } from "./domains/csvRules/controllers/ArcRuleController";
import { EngineModelRuleController } from "./domains/csvRules/controllers/EngineModelRuleController";
import { WorkScopeRuleController } from "./domains/csvRules/controllers/WorkScopeRuleController";
import { PartNumberRuleController } from "./domains/csvRules/controllers/PartNumberRuleController";
import { AllRuleController } from "./domains/csvRules/controllers/AllRuleController";
import { CsvRecordController } from "./domains/csvRecords/controllers";
import { AiTrainingController } from "./domains/ai_training/controllers";
import { AuthMiddleware } from "./middlewares/authMiddleware";
import { DocumentService } from "./domains/documents/services";
import { CsvRecordService } from "./domains/csvRecords/services";
import { CustomerService } from "./domains/customers/CustomerService";
import { EngineModelRuleService } from "./domains/csvRules/services/EngineModelRuleService";
import { AIInferenceService } from "./domains/ai_inference/services";
import { AiTrainingService } from "./domains/ai_training/services";
import { NewCustomerService } from "./domains/new_customers/NewCustomerService";

// Create a global singleton for websocket clients
const wsClients = new Set();

// Create the WebSocket service with the clients set
export const websocketService = createWebSocketService(wsClients);

// Create service instances first to avoid circular dependencies
const aiInferenceService = new AIInferenceService();
const documentService = new DocumentService();
const csvRecordService = new CsvRecordService();
const customerService = new CustomerService();
const engineModelRuleService = new EngineModelRuleService();
const aiTrainingService = new AiTrainingService(
  documentService,
  aiInferenceService
);
const newCustomerService = new NewCustomerService();

// Inject the websocket service after initializing all services
aiTrainingService.setWebsocketService(websocketService);

// Create controller instances with injected dependencies
const authController = new AuthController();
const documentController = new DocumentController(
  documentService,
  csvRecordService,
  customerService,
  aiInferenceService,
  engineModelRuleService
);
const newCustomerController = new NewCustomerController();
const customerController = new CustomerController(
  customerService,
  newCustomerService
);
const arcRuleController = new ArcRuleController();
const engineModelRuleController = new EngineModelRuleController();
const workScopeRuleController = new WorkScopeRuleController();
const partNumberRuleController = new PartNumberRuleController();
const allRuleController = new AllRuleController();
const csvRecordController = new CsvRecordController();
const aiTrainingController = new AiTrainingController(
  aiTrainingService,
  aiInferenceService
);

// Create auth middleware instance
const authMiddleware = new AuthMiddleware();

// Extract server configuration
const PORT = SERVER_CONFIG.PORT;
const HOST = SERVER_CONFIG.HOST;
const APP_NAME = SERVER_CONFIG.APP_NAME;
const HTTPS_PORT = SERVER_CONFIG.HTTPS_PORT || 3443; // Default HTTPS port

// TLS configuration for HTTPS
const TLS_CONFIG = {
  key: SERVER_CONFIG.TLS_KEY_PATH
    ? readFileSync(SERVER_CONFIG.TLS_KEY_PATH)
    : undefined,
  cert: SERVER_CONFIG.TLS_CERT_PATH
    ? readFileSync(SERVER_CONFIG.TLS_CERT_PATH)
    : undefined,
  passphrase: SERVER_CONFIG.TLS_PASSPHRASE,
};

// Start database connection verification but don't block server startup
Promise.all([
  db.waitForConnection(),
  drizzleConnectionTest.waitForConnection(),
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

// Helper function to match routes with path parameters
function matchRoute(requestPath: string, routes: Record<string, any>) {
  // First try direct match
  if (routes[requestPath]) {
    return { handler: routes[requestPath], params: {} };
  }

  // Split paths into segments for comparison
  const requestSegments = requestPath.split("/").filter(Boolean);

  // Try to match dynamic routes with parameters
  for (const routePath in routes) {
    const routeSegments = routePath.split("/").filter(Boolean);

    // Skip if segment count doesn't match
    if (routeSegments.length !== requestSegments.length) {
      continue;
    }

    let isMatch = true;
    const params = {};

    // Compare each segment
    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const requestSegment = requestSegments[i];

      // Check if this is a parameter segment (starts with :)
      if (routeSegment.startsWith(":")) {
        // Extract parameter name without the colon
        const paramName = routeSegment.slice(1);
        // Store the parameter value
        params[paramName] = requestSegment;
      }
      // Not a parameter, must match exactly
      else if (routeSegment !== requestSegment) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      return { handler: routes[routePath], params };
    }
  }

  // No match found
  return { handler: null, params: {} };
}

// Get the server config type from Bun's serve function
type ServeConfig = Parameters<typeof serve>[0];
let isTls = TLS_CONFIG.key && TLS_CONFIG.cert;

// Define API routes
const apiRoutes = {
  // Home route
  "/": () => addCorsHeaders(new Response("Welcome to the ARD Server!")),

  // Health check route for Docker
  "/health": () =>
    addCorsHeaders(
      Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      })
    ),

  // API info route
  "/api": () =>
    addCorsHeaders(
      Response.json({
        message: "API endpoint",
        status: "OK",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        app_name: process.env.APP_NAME || "ARD Server",
      })
    ),

  // Auth routes
  "/api/auth/login": {
    POST: async (req) => addCorsHeaders(await authController.login(req)),
  },
  "/api/auth/register": {
    POST: async (req) => addCorsHeaders(await authController.register(req)),
  },

  // User routes
  "/api/auth/users": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAdmin(req, (req) =>
          authController.createUser(req)
        )
      ),
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAdmin(req, (req) =>
          authController.getUsers(req)
        )
      ),
  },
  "/api/auth/users/:id": {
    PUT: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAdmin(req, (req) =>
          authController.updateUser(req.params.id, req)
        )
      ),
    DELETE: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAdmin(req, (req) =>
          authController.deleteUser(req.params.id)
        )
      ),
  },

  // Document routes
  "/api/documents": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.getDocumentsWithPagination(req)
        )
      ),
  },
  "/api/documents/filtered": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.getFilteredDocuments(req)
        )
      ),
  },
  "/api/documents/search/import-numbers": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.searchImportNumbers(req)
        )
      ),
  },
  "/api/documents/refresh": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.refreshDocuments(req)
        )
      ),
  },
  "/api/documents/pdf_to_images": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.uploadPdfToExternal(req)
        )
      ),
  },
  "/api/documents/pdf_full_ard": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.pdfFullARD(req)
        )
      ),
  },
  "/api/documents/ocr": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.scanDocumentOcr(req)
        )
      ),
  },
  "/api/documents/bucket/batch": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.getDocumentsFromBucket(req)
        )
      ),
  },
  "/api/documents/bucket/upload": {
    POST: async (req) =>
      addCorsHeaders(await documentController.uploadDocumentToBucket(req)),
  },
  "/api/documents/:id/import-number": {
    PATCH: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.addImportNumber(req)
        )
      ),
  },
  "/api/documents/:id": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.getDocumentById(req)
        )
      ),
    PUT: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.updateDocument(req)
        )
      ),
    DELETE: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.deleteDocument(req)
        )
      ),
  },
  "/api/documents/bucket/:id": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          documentController.getDocumentFromBucket(req)
        )
      ),
  },

  // Customer routes
  "/api/customers": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.getCustomers(req)
        )
      ),
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.createCustomer(req)
        )
      ),
  },
  "/api/customers/names": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.getAllCustomerNames(req)
        )
      ),
  },
  "/api/customers/search": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.searchCustomers(req)
        )
      ),
  },
  "/api/customers/search/byCode": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.searchCustomersByCoCode(req)
        )
      ),
  },
  "/api/customers/byName": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.getCustomerByName(req)
        )
      ),
  },
  "/api/customers/byHash": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.getCustomerByHash(req)
        )
      ),
  },
  "/api/customers/fileFormats": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.getFileFormatsByCustomerName(req)
        )
      ),
  },
  "/api/customers/documentTypes": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.getDocumentTypesByCustomer(req)
        )
      ),
  },
  "/api/customers/:id": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.getCustomerById(req)
        )
      ),
    PUT: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.updateCustomer(req)
        )
      ),
    DELETE: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.deleteCustomer(req)
        )
      ),
  },
  "/api/customers/find/end-user-customer-number": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.findEndUserCustomerNumberByName(req)
        )
      ),
  },
  "/api/customers/find/customer-number": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.findCustomerNumbersByCoCode(req)
        )
      ),
  },
  "/api/customers/add-format": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          customerController.addFormat(req)
        )
      ),
  },

  // New Customer routes
  "/api/new-customers": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.getNewCustomers(req)
        )
      ),
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.createNewCustomer(req)
        )
      ),
  },
  "/api/new-customers/names": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.getAllNewCustomerNames(req)
        )
      ),
  },
  "/api/new-customers/all": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.getAllNewCustomers(req)
        )
      ),
  },
  "/api/new-customers/search": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.searchNewCustomers(req)
        )
      ),
  },
  "/api/new-customers/byName": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.getNewCustomerByName(req)
        )
      ),
  },
  "/api/new-customers/find/customer-number": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.findCustomerNumbersByCoCode(req)
        )
      ),
  },
  "/api/new-customers/:id": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.getNewCustomerById(req)
        )
      ),
    PUT: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.updateNewCustomer(req)
        )
      ),
    DELETE: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          newCustomerController.deleteNewCustomer(req)
        )
      ),
  },

  // Arc Rule routes
  "/api/arc-rules": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          arcRuleController.getArcRules(req)
        )
      ),
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          arcRuleController.createArcRule(req)
        )
      ),
  },
  "/api/arc-rules/search": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          arcRuleController.searchArcRules(req)
        )
      ),
  },
  "/api/arc-rules/all": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          arcRuleController.getAllArcRules(req)
        )
      ),
  },
  "/api/arc-rules/:id": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          arcRuleController.getArcRuleById(req)
        )
      ),
    PUT: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          arcRuleController.updateArcRule(req)
        )
      ),
    DELETE: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          arcRuleController.deleteArcRule(req)
        )
      ),
  },

  // Engine Model Rule routes
  "/api/engine-model-rules": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          engineModelRuleController.getEngineModelRules(req)
        )
      ),
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          engineModelRuleController.createEngineModelRule(req)
        )
      ),
  },
  "/api/engine-model-rules/search": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          engineModelRuleController.searchEngineModelRules(req)
        )
      ),
  },
  "/api/engine-model-rules/all": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          engineModelRuleController.getAllEngineModelRules(req)
        )
      ),
  },
  "/api/engine-model-rules/:id": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          engineModelRuleController.getEngineModelRuleById(req)
        )
      ),
    PUT: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          engineModelRuleController.updateEngineModelRule(req)
        )
      ),
    DELETE: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          engineModelRuleController.deleteEngineModelRule(req)
        )
      ),
  },

  // Work Scope Rule routes
  "/api/work-scope-rules": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          workScopeRuleController.getWorkScopeRules(req)
        )
      ),
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          workScopeRuleController.createWorkScopeRule(req)
        )
      ),
  },
  "/api/work-scope-rules/search": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          workScopeRuleController.searchWorkScopeRules(req)
        )
      ),
  },
  "/api/work-scope-rules/all": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          workScopeRuleController.getAllWorkScopeRules(req)
        )
      ),
  },
  "/api/work-scope-rules/:id": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          workScopeRuleController.getWorkScopeRuleById(req)
        )
      ),
    PUT: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          workScopeRuleController.updateWorkScopeRule(req)
        )
      ),
    DELETE: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          workScopeRuleController.deleteWorkScopeRule(req)
        )
      ),
  },

  // Part Number Rule routes
  "/api/part-number-rules": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          partNumberRuleController.getPartNumberRules(req)
        )
      ),
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          partNumberRuleController.createPartNumberRule(req)
        )
      ),
  },
  "/api/part-number-rules/search": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          partNumberRuleController.searchPartNumberRules(req)
        )
      ),
  },
  "/api/part-number-rules/all": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          partNumberRuleController.getAllPartNumberRules(req)
        )
      ),
  },
  "/api/part-number-rules/:id": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          partNumberRuleController.getPartNumberRuleById(req)
        )
      ),
    PUT: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          partNumberRuleController.updatePartNumberRule(req)
        )
      ),
    DELETE: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          partNumberRuleController.deletePartNumberRule(req)
        )
      ),
  },

  // All Rules route - fetch all rules from all 4 tables
  "/api/all-rules": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          allRuleController.getAllRules(req)
        )
      ),
  },

  // CSV Record routes
  "/api/csv-records/export": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          csvRecordController.exportCsvRecords(req)
        )
      ),
  },

  // AI Training routes
  "/api/customers/:customerId/training/datasets": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.createTrainingDataset(req.params.customerId, req)
        )
      ),
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.getTrainingDatasets(req.params.customerId)
        )
      ),
  },
  "/api/customers/:customerId/training/datasets/documents": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.getTrainingDocuments(req.params.customerId)
        )
      ),
  },
  "/api/customers/:customerId/training/datasets/documents/:datasetId": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.getTrainingDocumentsByDatasetId(
            req.params.datasetId
          )
        )
      ),
  },
  "/api/customers/:customerId/training/tasks": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.createTrainingTask(req.params.customerId, req)
        )
      ),
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.getTrainingTasks(req.params.customerId, req)
        )
      ),
  },
  "/api/training/check/tasks": {
    GET: async (req) =>
      addCorsHeaders(await aiTrainingController.checkTrainingTasks()),
  },
  "/api/customers/:customerId/training/tasks/:taskId/start": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.startTrainingTask(
            req.params.customerId,
            req.params.taskId
          )
        )
      ),
  },
  "/api/webhook/training/tasks/:taskId/complete": {
    POST: async (req) =>
      addCorsHeaders(
        await aiTrainingController.completeTrainingTask(req.params.taskId)
      ),
  },
  "/api/customers/:customerId/training/dataset/:datasetId/bind": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.bindModelByDatasetId(
            req.params.customerId,
            req.params.datasetId
          )
        )
      ),
  },
  "/api/customers/:customerId/training/tasks/:taskId/results": {
    GET: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.getTrainingTaskVerificationResults(
            req.params.taskId
          )
        )
      ),
  },
  "/api/load_inference_model/:modelName": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.loadInferenceModel(req.params.modelName)
        )
      ),
  },
  "/api/stop_training": {
    POST: async (req) =>
      addCorsHeaders(
        await authMiddleware.requireAuth(req, (req) =>
          aiTrainingController.stopTraining()
        )
      ),
  },
};

// Create a simple HTTP server using Bun
const serverConfig: ServeConfig = {
  port: isTls ? HTTPS_PORT : PORT,
  hostname: HOST,
  tls: isTls
    ? {
        key: TLS_CONFIG.key,
        cert: TLS_CONFIG.cert,
        passphrase: TLS_CONFIG.passphrase,
      }
    : undefined,
  fetch(req, server) {
    // Check if it's a WebSocket upgrade request - check for both cases
    const upgradeHeader = req.headers.get("Upgrade") || "";

    if (upgradeHeader.toLowerCase() === "websocket") {
      console.log("WebSocket upgrade request received");
      const success = server.upgrade(req);
      return success
        ? undefined
        : new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Get the path from the URL
    const url = new URL(req.url);
    const path = url.pathname;

    // Find matching route with path parameters
    const { handler, params } = matchRoute(path, apiRoutes);

    if (handler) {
      // Add params to the request object
      req.params = params;

      if (typeof handler === "function") {
        return handler(req);
      } else if (handler[req.method]) {
        return handler[req.method](req);
      }
    }

    // Output the request URL for debugging
    console.log(`Unmatched request: ${req.method} ${path}`);

    // Default 404 response if no handler matches
    return addCorsHeaders(new Response("Not Found", { status: 404 }));
  },
  websocket: {
    open(ws) {
      console.log("New WebSocket client connected", "total:", wsClients.size);
      wsClients.add(ws);

      // Send a welcome message
      ws.send(
        JSON.stringify({
          type: "CONNECTION_ESTABLISHED",
          payload: { message: "Connected to ARD Server WebSocket" },
          timestamp: new Date().toISOString(),
        })
      );
    },
    message(ws, message) {
      console.log("Received WebSocket message:", message);
      console.log("Message type:", typeof message);

      // Try to parse message if it's a string
      let parsedMessage;
      try {
        if (typeof message === "string") {
          parsedMessage = JSON.parse(message);
          console.log("Parsed message:", parsedMessage);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }

      // Send a response back to confirm receipt
      ws.send(
        JSON.stringify({
          type: "MESSAGE_RECEIVED",
          original: message,
          timestamp: new Date().toISOString(),
        })
      );
    },
    close(ws, code, reason) {
      console.log(
        `WebSocket client disconnected: ${code} - ${reason || "No reason"}`
      );
      wsClients.delete(ws);
    },
    drain(ws) {
      console.log("WebSocket drain event");
    },
  },
  // routes: apiRoutes,
};

// Create HTTPS server if TLS credentials are provided
if (isTls) {
  // Start HTTPS and Websocket server
  const serverInstance = serve(serverConfig);
  console.log(`${APP_NAME} running securely at https://${HOST}:${HTTPS_PORT}`);
  console.log(`WebSocket server available on wss://${HOST}:${HTTPS_PORT}`);
} else {
  // Start HTTP server
  const serverInstance = serve(serverConfig);
  console.log(`${APP_NAME} running at http://${HOST}:${PORT}`);
  console.log(`WebSocket server available on ws://${HOST}:${PORT}`);
  console.log("HTTPS server not started: TLS credentials not configured");
}
