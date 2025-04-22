import { DocumentService } from "./services";
import type { Document, DocumentItem } from "../../db/schema";
import { z } from "zod";
import {isEmpty} from "lodash";
import { CsvRecordService } from "../csvRecords/services";
import { generateCustomerInfoHash } from "../../lib/utils";
import type { BunRequest } from "bun";
import { DOCUMENT_BUCKET_NAME } from "./constants";
import moment from "moment-timezone";
import { CustomerService } from "../customers/CustomerService";
import { AIInferenceService } from "../ai_inference/services";
import { EngineModelRuleService } from "../csvRules/services/EngineModelRuleService";
import { replaceEngineModelTitleByRules } from "../csvRules/utils";

// Document item schema validation
const documentItemSchema = z.object({
  document_id: z.string(),
  part_number: z.string(),
  quantity_ordered: z.string().optional(),
  import_price: z.string().nullable().optional(), // Validate as number but convert to string before DB insert
  engine_model: z.string().optional().nullable().optional(),
  engine_number: z.string().optional().nullable().optional(),
  serial_number: z.string().optional().nullable().optional(),
  t_part_number_page: z.number().optional().nullable(),
  t_quantity_ordered_page: z.number().optional().nullable(),
  t_import_price_page: z.number().optional().nullable(),
  t_engine_model_page: z.number().optional().nullable(),
  t_engine_number_page: z.number().optional().nullable(),
  t_serial_number_page: z.number().optional().nullable(),
});

// Document schema validation
const createDocumentSchema = z.object({
  id: z.string(),
  document_type: z.string(),
  customer_name: z.string(),
  co_code: z.string().optional().nullable(),
  file_format: z.string(),
  file_path: z.string(),
  import_number: z.string().optional().nullable(),
  po_number: z.string().optional().nullable(),
  end_user_customer_name: z.string().optional().nullable(),
  end_user_customer_number: z.string().optional().nullable(),
  work_scope: z.string().optional().nullable(),
  arc_requirement: z.string().optional().nullable(),
  receive_date: z.string().optional().nullable(),
  tsn: z.string().optional().nullable(),
  csn: z.string().optional().nullable(),
  customer_info_hash: z.string().optional(),
  document_items: z.array(documentItemSchema).optional(),
  from_full_ard: z.boolean().optional().nullable(),
  t_page_texts: z.array(z.string()).optional().nullable(),
  t_import_number_page: z.number().optional().nullable(),
  t_po_number_page: z.number().optional().nullable(),
  t_end_user_customer_name_page: z.number().optional().nullable(),
  t_end_user_customer_number_page: z.number().optional().nullable(),
  t_work_scope_page: z.number().optional().nullable(),
  t_arc_requirement_page: z.number().optional().nullable(),
  t_tsn_page: z.number().optional().nullable(),
  t_csn_page: z.number().optional().nullable(),
});

// Import number update schema validation
const importNumberSchema = z.object({
  import_number: z.string().min(1, { message: "Import number is required" })
});

export class DocumentController {
  private documentService: DocumentService;
  private csvRecordService: CsvRecordService;
  private customerService: CustomerService;
  private aiInferenceService: AIInferenceService;
  private engineModelRuleService: EngineModelRuleService;

  constructor(
    documentService: DocumentService,
    csvRecordService: CsvRecordService,
    customerService: CustomerService,
    aiInferenceService: AIInferenceService,
    engineModelRuleService: EngineModelRuleService
  ) {
    this.documentService = documentService;
    this.csvRecordService = csvRecordService;
    this.customerService = customerService;
    this.aiInferenceService = aiInferenceService;
    this.engineModelRuleService = engineModelRuleService;
  }

  async getDocumentById(req: BunRequest): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Document ID is required" },
          { status: 400 }
        );
      }

      const document = await this.documentService.getDocumentById(id);

      if (!document) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      return Response.json(document);
    } catch (error) {
      console.error("Get document error:", error);
      return Response.json(
        { error: "Failed to get document" },
        { status: 500 }
      );
    }
  }

  async getDocumentsWithPagination(req: BunRequest): Promise<Response> {
    try {
      const url = new URL(req.url);
      
      // Parse pagination parameters
      const pageParam = url.searchParams.get("page");
      const pageSizeParam = url.searchParams.get("pageSize");
      
      // Get status filter parameter (optional)
      const status = url.searchParams.get("status");
      
      // Validate status parameter if provided
      if (status && !["approved", "not_approved"].includes(status)) {
        return Response.json(
          { error: "Status must be either 'approved' or 'not_approved'" },
          { status: 400 }
        );
      }
      
      // Check if pagination parameters are provided
      if (!pageParam && !pageSizeParam) {
        // Get all documents without pagination
        const documents = await this.documentService.getAllDocuments(status || undefined);
        
        return Response.json({
          documents,
          pagination: {
            total: documents.length
          },
          filters: status ? { status } : {}
        });
      }
      
      // Handle paginated request
      const page = parseInt(pageParam || "1", 10);
      const pageSize = parseInt(pageSizeParam || "10", 10);
      
      // Validate and cap pagination parameters
      const validPage = Math.max(1, page);
      const validPageSize = Math.min(Math.max(1, pageSize), 100); // Limit max page size to 100
      
      // Get paginated documents with optional status filter
      const result = await this.documentService.getDocumentsWithPagination(
        validPage,
        validPageSize,
        status || undefined
      );
      
      return Response.json({
        documents: result.documents,
        pagination: {
          total: result.total,
          page: validPage,
          pageSize: validPageSize,
          pageCount: Math.ceil(result.total / validPageSize)
        },
        filters: status ? { status } : {}
      });
    } catch (error) {
      console.error("Get documents error:", error);
      return Response.json(
        { error: "Failed to get documents" },
        { status: 500 }
      );
    }
  }

  async getUnpairedDocuments(req: BunRequest): Promise<Response> {
    try {
      const url = new URL(req.url);
      
      // Parse pagination parameters
      const pageParam = url.searchParams.get("page");
      const pageSizeParam = url.searchParams.get("pageSize");
      
      // Check if pagination parameters are provided
      if (!pageParam && !pageSizeParam) {
        // Get all unpaired documents without pagination
        const documents = await this.documentService.getAllUnpairedDocuments();
        
        return Response.json({
          documents,
          pagination: {
            total: documents.length
          }
        });
      }
      
      // Handle paginated request
      const page = parseInt(pageParam || "1", 10);
      const pageSize = parseInt(pageSizeParam || "10", 10);
      
      // Validate and cap pagination parameters
      const validPage = Math.max(1, page);
      const validPageSize = Math.min(Math.max(1, pageSize), 100); // Limit max page size to 100
      
      // Get unpaired documents with pagination
      const result = await this.documentService.getUnpairedDocuments(
        validPage,
        validPageSize
      );
      
      return Response.json({
        documents: result.documents,
        pagination: {
          total: result.total,
          page: validPage,
          pageSize: validPageSize,
          pageCount: Math.ceil(result.total / validPageSize)
        }
      });
    } catch (error) {
      console.error("Get unpaired documents error:", error);
      return Response.json(
        { error: "Failed to get unpaired documents" },
        { status: 500 }
      );
    }
  }

  async getFilteredDocuments(req: BunRequest): Promise<Response> {
    try {
      const url = new URL(req.url);
      
      // Parse filter parameter - default to 'unpaired' if not specified
      const filter = url.searchParams.get("filter") as ('paired' | 'unpaired') || 'unpaired';
      
      // Validate filter parameter
      if (filter !== 'paired' && filter !== 'unpaired') {
        return Response.json(
          { error: "Filter must be either 'paired' or 'unpaired'" },
          { status: 400 }
        );
      }
      
      // Parse pagination parameters
      const pageParam = url.searchParams.get("page");
      const pageSizeParam = url.searchParams.get("pageSize");
      
      // Check if pagination parameters are provided
      if (!pageParam && !pageSizeParam) {
        // Get all filtered documents without pagination
        const documents = await this.documentService.getAllFilteredDocuments(filter);
        
        return Response.json({
          documents,
          pagination: {
            total: documents.length
          },
          filter
        });
      }
      
      // Handle paginated request
      const page = parseInt(pageParam || "1", 10);
      const pageSize = parseInt(pageSizeParam || "10", 10);
      
      // Validate and cap pagination parameters
      const validPage = Math.max(1, page);
      const validPageSize = Math.min(Math.max(1, pageSize), 100); // Limit max page size to 100
      
      // Get filtered documents with pagination
      const result = await this.documentService.getFilteredDocuments(
        validPage,
        validPageSize,
        filter
      );
      
      return Response.json({
        documents: result.documents,
        pagination: {
          total: result.total,
          page: validPage,
          pageSize: validPageSize,
          pageCount: Math.ceil(result.total / validPageSize)
        },
        filter
      });
    } catch (error) {
      console.error("Get filtered documents error:", error);
      return Response.json(
        { error: "Failed to get filtered documents" },
        { status: 500 }
      );
    }
  }

  async updateDocument(req: BunRequest): Promise<Response> {
    try {
      const requestData = await req.json();
      
      // Validate with Zod schema
      const result = createDocumentSchema.safeParse(requestData);
      
      if (!result.success) {
        return Response.json(
          { error: "Invalid document data", details: result.error.format() },
          { status: 400 }
        );
      }
      
      const validatedData = result.data;
      
      // Generate customer info hash
      const customerInfoHash = generateCustomerInfoHash(
        validatedData.customer_name,
        validatedData.co_code,
        validatedData.file_format,
        validatedData.document_type
      );
      
      // Prepare document data
      const document: Omit<Document, | "created_at"> = {
        id: validatedData.id,
        document_type: validatedData.document_type,
        customer_name: validatedData.customer_name,
        co_code: validatedData.co_code || null,
        customer_info_hash: customerInfoHash,
        file_format: validatedData.file_format,
        file_path: validatedData.file_path,
        import_number: validatedData.import_number || null,
        po_number: validatedData.po_number || null,
        end_user_customer_name: validatedData.end_user_customer_name || null,
        end_user_customer_number: validatedData.end_user_customer_number || null,
        work_scope: validatedData.work_scope || null,
        arc_requirement: validatedData.arc_requirement || null,
        receive_date: validatedData.receive_date ? moment(validatedData.receive_date).toDate() : null,
        tsn: validatedData.tsn || null,
        csn: validatedData.csn || null,
        status: "approved",
        from_full_ard: validatedData.from_full_ard || false,
        t_page_texts: validatedData.t_page_texts !== undefined ? validatedData.t_page_texts : null,
        t_import_number_page: validatedData.t_import_number_page !== undefined ? validatedData.t_import_number_page : null,
        t_po_number_page: validatedData.t_po_number_page !== undefined ? validatedData.t_po_number_page : null,
        t_end_user_customer_name_page: validatedData.t_end_user_customer_name_page !== undefined ? validatedData.t_end_user_customer_name_page : null,
        t_end_user_customer_number_page: validatedData.t_end_user_customer_number_page !== undefined ? validatedData.t_end_user_customer_number_page : null,
        t_work_scope_page: validatedData.t_work_scope_page !== undefined ? validatedData.t_work_scope_page : null,
        t_arc_requirement_page: validatedData.t_arc_requirement_page !== undefined ? validatedData.t_arc_requirement_page : null,
        t_tsn_page: validatedData.t_tsn_page !== undefined ? validatedData.t_tsn_page : null,
        t_csn_page: validatedData.t_csn_page !== undefined ? validatedData.t_csn_page : null,
        scanned_time: moment().toDate(),
        updated_at: moment().toDate()
      };
      
      const engineModelRules = await this.engineModelRuleService.getAllEngineModelRules();
      
      // Prepare document items
      const documentItems = validatedData.document_items?.map(item => ({
          document_id: validatedData.id,
          part_number: item.part_number.trim(),
          quantity_ordered: item.quantity_ordered || null,
          import_price: item.import_price ? item.import_price.trim() : null,
          engine_model: isEmpty(item.engine_model) ? null : replaceEngineModelTitleByRules(engineModelRules, String(item.engine_model)),
          engine_number: isEmpty(item.engine_number) ? null : String(item.engine_number),
          serial_number: isEmpty(item.serial_number) ? null : String(item.serial_number),
          t_part_number_page: item.t_part_number_page !== undefined ? item.t_part_number_page : null, 
          t_quantity_ordered_page: item.t_quantity_ordered_page !== undefined ? item.t_quantity_ordered_page : null,
          t_import_price_page: item.t_import_price_page !== undefined ? item.t_import_price_page : null,
          t_engine_model_page: item.t_engine_model_page !== undefined ? item.t_engine_model_page : null,
          t_engine_number_page: item.t_engine_number_page !== undefined ? item.t_engine_number_page : null,
          t_serial_number_page: item.t_serial_number_page !== undefined ? item.t_serial_number_page : null,
        })) || [] as Omit<DocumentItem, "id">[];
      
      // Create document with items
      const updatedDocument = await this.documentService.updateDocument(
        document.id,
        document,
        documentItems
      );

      if (!updatedDocument) {
        return Response.json(
          { error: "Failed to update document" },
          { status: 400 }
        );
      }

      // Create a csv record for the document
      if (updatedDocument.document.document_type === "purchase_order") {
        await this.csvRecordService.createCsvRecords(updatedDocument.document);
      }
      
      return Response.json(updatedDocument, { status: 200 });
    } catch (error) {
      console.error("Create document error:", error);
      return Response.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }
  }


  async deleteDocument(req: BunRequest): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Document ID is required" },
          { status: 400 }
        );
      }

      const success = await this.documentService.deleteDocument(id);

      if (!success) {
        return Response.json(
          { error: "Document not found or delete failed" },
          { status: 404 }
        );
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      return Response.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }
  }

  async refreshDocuments(_: BunRequest): Promise<Response> {
    try {
      const result = await this.documentService.refreshDocuments();
      
      if (result?.error) {
        return Response.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        added: result?.added,
        message: result?.added && (result?.added > 0)
          ? `Added ${result?.added} new document(s) from storage bucket`
          : "No new documents found in storage bucket"
      });
    } catch (error) {
      console.error("Refresh documents error:", error);
      return Response.json(
        { error: "Failed to refresh documents" },
        { status: 500 }
      );
    }
  }

  async getDocumentFromBucket(req: BunRequest): Promise<Response> {
    try {
      const url = new URL(req.url);
      const decodedUrl = decodeURIComponent(url.pathname);
      const parts = decodedUrl.split("/");
      const id = parts.pop(); // Get the document ID from the path
      
      if (!id) {
        return Response.json(
          { error: "Document ID is required" },
          { status: 400 }
        );
      }
      
      // Get the bucket name from query parameter or use a default
      const bucketName = url.searchParams.get("bucket") || DOCUMENT_BUCKET_NAME;
      
      const document = await this.documentService.getDocumentFromBucket(bucketName, id);
      
      if (!document) {
        return Response.json(
          { error: "Document not found in bucket" },
          { status: 404 }
        );
      }
      
      return Response.json(document);
    } catch (error) {
      console.error("Get document from bucket error:", error);
      return Response.json(
        { error: "Failed to get document from bucket" },
        { status: 500 }
      );
    }
  }

  async getDocumentsFromBucket(req: BunRequest): Promise<Response> {
    try {
      // Expect a POST request with a JSON body containing document IDs
      if (req.method !== "POST") {
        return Response.json(
          { error: "Method not allowed, use POST" },
          { status: 405 }
        );
      }

      // Parse the request body
      const body = await req.json();
      const { ids } = body;

      // Validate IDs are provided and are in array format
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return Response.json(
          { error: "Document IDs array is required" },
          { status: 400 }
        );
      }

      // Get the bucket name from query parameter or use a default
      const url = new URL(req.url);
      const bucketName = url.searchParams.get("bucket") || DOCUMENT_BUCKET_NAME;
      
      // Fetch multiple documents from the bucket
      const documents = await this.documentService.getDocumentsFromBucket(bucketName, ids);
      
      if (!documents || documents.length === 0) {
        return Response.json(
          { documents: [], message: "No matching documents found in bucket" },
          { status: 200 }
        );
      }
      
      return Response.json(documents);
    } catch (error) {
      console.error("Get multiple documents from bucket error:", error);
      return Response.json(
        { error: "Failed to get documents from bucket" },
        { status: 500 }
      );
    }
  }

  async searchImportNumbers(req: BunRequest): Promise<Response> {
    try {
      const url = new URL(req.url);
      
      // Get search query and pagination parameters
      const query = url.searchParams.get("query") || "";
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
      
      // Validate pagination parameters
      if (isNaN(page) || page < 1) {
        return Response.json(
          { error: "Invalid page parameter" },
          { status: 400 }
        );
      }
      
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        return Response.json(
          { error: "Invalid pageSize parameter. Must be between 1 and 100" },
          { status: 400 }
        );
      }
      
      // Search for import numbers matching the query with pagination
      const result = await this.documentService.searchImportNumbers(query, page, pageSize);
      
      return Response.json({
        data: result.importNumbers,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize)
        }
      });
    } catch (error) {
      console.error("Search import numbers error:", error);
      return Response.json(
        { error: "Failed to search import numbers" },
        { status: 500 }
      );
    }
  }

  async uploadPdfToExternal(req: BunRequest): Promise<Response> {
    try {
      // Check if the content type is multipart/form-data
      const contentType = req.headers.get('Content-Type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return Response.json(
          { error: "Content type must be multipart/form-data" },
          { status: 400 }
        );
      }
      
      // Get the form data from the request
      const formData = await req.formData();
      
      // Check if the pdf file is present
      const pdfFile = formData.get('pdf');
      if (!pdfFile || !(pdfFile instanceof File)) {
        return Response.json(
          { error: "PDF file is required" },
          { status: 400 }
        );
      }
      
      // Use the service method to process the PDF
      const result = await this.documentService.uploadPdfToExternal(pdfFile);
      
      // Since the response is a ZIP file, return it directly without parsing as JSON
      return new Response(result?.body, {
        status: result?.status,
        headers: {
          'Content-Type': result?.headers.get('Content-Type') || 'application/zip',
          'Content-Disposition': result?.headers.get('Content-Disposition') || 'attachment; filename="images.zip"'
        }
      });
    } catch (error) {
      console.error("Upload PDF error:", error);
      return Response.json(
        { error: "Failed to upload PDF to external service" },
        { status: 500 }
      );
    }
  }

  async scanDocumentOcr(req: BunRequest): Promise<Response> {
    try {
      // Check if the content type is multipart/form-data
      const contentType = req.headers.get('Content-Type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return Response.json(
          { error: "Content type must be multipart/form-data" },
          { status: 400 }
        );
      }
      
      // Get the form data from the request
      const formData = await req.formData();
      
      // Check if the image file is present
      const imageFile = formData.get('image');
      if (!imageFile || !(imageFile instanceof File)) {
        return Response.json(
          { error: "Image file is required" },
          { status: 400 }
        );
      }
      
      // Use the service method to perform OCR
      const ocrResult = await this.documentService.scanDocumentOcr(imageFile);
      
      // Return the OCR result directly to the frontend
      return Response.json(ocrResult);
    } catch (error) {
      console.error("Document OCR error:", error);
      return Response.json(
        { error: "Failed to perform OCR on the document" },
        { status: 500 }
      );
    }
  }

  async uploadDocumentToBucket(req: BunRequest): Promise<Response> {
    try {
      // Check if the request has a file
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return Response.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Upload the file
      const result = await this.documentService.uploadDocumentToBucket(file);

      if (!result) {
        return Response.json(
          { error: "Failed to upload file" },
          { status: 500 }
        );
      }

      if (result.error) {
        return Response.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return Response.json({
        message: "File uploaded successfully",
        path: result.path
      });
    } catch (error) {
      console.error("Upload document error:", error);
      return Response.json(
        { error: "Failed to upload document" },
        { status: 500 }
      );
    }
  }

  async addImportNumber(req: BunRequest): Promise<Response> {
    try {
      const id = (req.params as any).id;

      if (!id) {
        return Response.json(
          { error: "Document ID is required" },
          { status: 400 }
        );
      }

      // Get the existing document
      const existingDocument = await this.documentService.getDocumentById(id);
      if (!existingDocument) {
        return Response.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      // Parse and validate request body
      const requestData = await req.json();
      const result = importNumberSchema.safeParse(requestData);
      
      if (!result.success) {
        return Response.json(
          { error: "Invalid import number data", details: result.error.format() },
          { status: 400 }
        );
      }

      const { import_number } = result.data;

      // Use the specialized method to update just the import_number
      const updatedDocument = await this.documentService.updateDocumentImportNumber(id, import_number);

      if (!updatedDocument) {
        return Response.json(
          { error: "Failed to update document import number" },
          { status: 500 }
        );
      }

      return Response.json(updatedDocument);
    } catch (error) {
      console.error("Add import number error:", error);
      return Response.json(
        { error: "Failed to add import number to document" },
        { status: 500 }
      );
    }
  }

  async pdfFullARD(req: BunRequest): Promise<Response> {
    try {
      const formData = await req.formData();
      const pdfFile = formData.get('pdf') as File;

      const customerName = formData.get('customer_name') as string;
      const coCode = formData.get('co_code') as string;
      const fileFormat = formData.get('file_format') as string;
      const documentType = formData.get('document_type') as string;

      if (!customerName || !coCode || !fileFormat || !documentType) {
        return Response.json(
          { error: `Missing required fields customer_name: ${customerName}, co_code: ${coCode}, file_format: ${fileFormat}, document_type: ${documentType}` },
          { status: 400 }
        );
      }
      
      const customer = await this.customerService.getCustomerByHash({
        customer_name: customerName,
        co_code: coCode,
        file_format: fileFormat,
        document_type: documentType,
      });

      console.log("[DocumentsController.pdfFullARD] - customer: ", customer);

      if (!customer) {
        return Response.json({ error: "Customer not found" }, { status: 404 });
      }

      const task = await this.aiInferenceService.getTrainingTaskByDatasetId(customer.t_model_name || "");
      if (!task) {
        return Response.json({ error: "Training task not found" }, { status: 404 });
      }

      const result = await this.aiInferenceService.loadInferenceModel(task.t_dataset_id);

      if (!result.success) {
        return Response.json({ error: result.message }, { status: 500 });
      }

      console.log("[DocumentsController.pdfFullARD] - task: ", task);

      const document = await this.documentService.pdfFullARD(
          pdfFile,
          documentType,
          task.prompt || ""
      );

      return Response.json(document);
    } catch (error: any) {
      console.error("PDF Full ARD error:", error);
      return Response.json(
        { error: error || "Failed to process PDF Full ARD" },
        { status: 500 }
      );
    }
  }
}
