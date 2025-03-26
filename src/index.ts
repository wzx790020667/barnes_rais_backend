import { serve } from "bun";
import { db, drizzleConnectionTest } from "./lib/db";
import { SERVER_CONFIG } from "./config";
import { AuthController } from "./domains/auth/AuthController";
import { UserController } from "./domains/users/UserController";
import { DocumentController } from "./domains/documents/controllers";
import { CustomerController } from "./domains/customers/CustomerController";
import { ArcRuleController } from "./domains/csvRules/controllers/ArcRuleController";
import { EngineModelRuleController } from "./domains/csvRules/controllers/EngineModelRuleController";
import { WorkScopeRuleController } from "./domains/csvRules/controllers/WorkScopeRuleController";
import { PartNumberRuleController } from "./domains/csvRules/controllers/PartNumberRuleController";
import { CsvRecordController } from "./domains/csvRecords/controllers";

// Create controller instances
const authController = new AuthController();
const userController = new UserController();
const documentController = new DocumentController();
const customerController = new CustomerController();
const arcRuleController = new ArcRuleController();
const engineModelRuleController = new EngineModelRuleController();
const workScopeRuleController = new WorkScopeRuleController();
const partNumberRuleController = new PartNumberRuleController();
const csvRecordController = new CsvRecordController();

// Extract server configuration
const PORT = SERVER_CONFIG.PORT;
const HOST = SERVER_CONFIG.HOST;
const APP_NAME = SERVER_CONFIG.APP_NAME;

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

// Create a simple HTTP server using Bun
serve({
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
    "/api/users": {
      GET: async (req) => addCorsHeaders(await userController.getUsers(req)),
    },
    "/api/users/:id": {
      GET: async (req) => addCorsHeaders(await userController.getUserById(req)),
      PUT: async (req) => addCorsHeaders(await userController.updateUser(req)),
      DELETE: async (req) => addCorsHeaders(await userController.deleteUser(req)),
    },
    
    // Document routes
    "/api/documents": {
      GET: async (req) => addCorsHeaders(await documentController.getDocumentsWithPagination(req)),
    },
    "/api/documents/filtered": {
      GET: async (req) => addCorsHeaders(await documentController.getFilteredDocuments(req)),
    },
    "/api/documents/search/import-numbers": {
      GET: async (req) => addCorsHeaders(await documentController.searchImportNumbers(req)),
    },
    "/api/documents/refresh": {
      POST: async (req) => addCorsHeaders(await documentController.refreshDocuments(req)),
    },
    "/api/documents/pdf_to_images": {
      POST: async (req) => addCorsHeaders(await documentController.uploadPdfToExternal(req)),
    },
    "/api/documents/ocr": {
      POST: async (req) => addCorsHeaders(await documentController.scanDocumentOcr(req)),
    },
    "/api/documents/bucket/batch": {
      POST: async (req) => addCorsHeaders(await documentController.getDocumentsFromBucket(req)),
    },
    "/api/documents/:id/import-number": {
      PATCH: async (req) => addCorsHeaders(await documentController.addImportNumber(req)),
    },
    "/api/documents/:id": {
      GET: async (req) => addCorsHeaders(await documentController.getDocumentById(req)),
      PUT: async (req) => addCorsHeaders(await documentController.updateDocument(req)),
      DELETE: async (req) => addCorsHeaders(await documentController.deleteDocument(req)),
    },
    "/api/documents/bucket/:id": {
      GET: async (req) => addCorsHeaders(await documentController.getDocumentFromBucket(req)),
    },
    
    // Customer routes
    "/api/customers": {
      GET: async (req) => addCorsHeaders(await customerController.getCustomers(req)),
      POST: async (req) => addCorsHeaders(await customerController.createCustomer(req)),
    },
    "/api/customers/search": {
      GET: async (req) => addCorsHeaders(await customerController.searchCustomers(req)),
    },
    "/api/customers/byName": {
      GET: async (req) => addCorsHeaders(await customerController.getCustomerByName(req)),
    },
    "/api/customers/fileFormats": {
      GET: async (req) => addCorsHeaders(await customerController.getFileFormatsByCustomerName(req)),
    },
    "/api/customers/:id": {
      GET: async (req) => addCorsHeaders(await customerController.getCustomerById(req)),
      PUT: async (req) => addCorsHeaders(await customerController.updateCustomer(req)),
      DELETE: async (req) => addCorsHeaders(await customerController.deleteCustomer(req)),
    },
    
    // Arc Rule routes
    "/api/arc-rules": {
      GET: async (req) => addCorsHeaders(await arcRuleController.getArcRules(req)),
      POST: async (req) => addCorsHeaders(await arcRuleController.createArcRule(req)),
    },
    "/api/arc-rules/:id": {
      GET: async (req) => addCorsHeaders(await arcRuleController.getArcRuleById(req)),
      PUT: async (req) => addCorsHeaders(await arcRuleController.updateArcRule(req)),
      DELETE: async (req) => addCorsHeaders(await arcRuleController.deleteArcRule(req)),
    },

    // Engine Model Rule routes
    "/api/engine-model-rules": {
      GET: async (req) => addCorsHeaders(await engineModelRuleController.getEngineModelRules(req)),
      POST: async (req) => addCorsHeaders(await engineModelRuleController.createEngineModelRule(req)),
    },
    "/api/engine-model-rules/:id": {
      GET: async (req) => addCorsHeaders(await engineModelRuleController.getEngineModelRuleById(req)),
      PUT: async (req) => addCorsHeaders(await engineModelRuleController.updateEngineModelRule(req)),
      DELETE: async (req) => addCorsHeaders(await engineModelRuleController.deleteEngineModelRule(req)),
    },
    
    // Work Scope Rule routes
    "/api/work-scope-rules": {
      GET: async (req) => addCorsHeaders(await workScopeRuleController.getWorkScopeRules(req)),
      POST: async (req) => addCorsHeaders(await workScopeRuleController.createWorkScopeRule(req)),
    },
    "/api/work-scope-rules/:id": {
      GET: async (req) => addCorsHeaders(await workScopeRuleController.getWorkScopeRuleById(req)),
      PUT: async (req) => addCorsHeaders(await workScopeRuleController.updateWorkScopeRule(req)),
      DELETE: async (req) => addCorsHeaders(await workScopeRuleController.deleteWorkScopeRule(req)),
    },
    
    // Part Number Rule routes
    "/api/part-number-rules": {
      GET: async (req) => addCorsHeaders(await partNumberRuleController.getPartNumberRules(req)),
      POST: async (req) => addCorsHeaders(await partNumberRuleController.createPartNumberRule(req)),
    },
    "/api/part-number-rules/:id": {
      GET: async (req) => addCorsHeaders(await partNumberRuleController.getPartNumberRuleById(req)),
      PUT: async (req) => addCorsHeaders(await partNumberRuleController.updatePartNumberRule(req)),
      DELETE: async (req) => addCorsHeaders(await partNumberRuleController.deletePartNumberRule(req)),
    },
    
    // CSV Record routes
    "/api/csv-records/export": {
      POST: async (req) => addCorsHeaders(await csvRecordController.exportCsvRecords(req)),
    },
  },
  
  // Fallback handler for routes not defined in the routes object
  // and for handling CORS preflight requests
  async fetch(req) {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Output the request URL for debugging
    console.log(`Unmatched request: ${req.method} ${new URL(req.url).pathname}`);

    // Default 404 response if no handler matches
    return addCorsHeaders(new Response("Not Found", { status: 404 }));
  },
});

console.log(`${APP_NAME} running at http://${HOST}:${PORT}`);
