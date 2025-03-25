import { DocumentService } from "./services";
import type { Document, DocumentItem } from "../../db/schema";
import { z } from "zod";
import {isEmpty, isUndefined} from "lodash";
import { CsvRecordService } from "../csvRecords/services";
import { generateCustomerInfoHash } from "../../lib/utils";
import type { BunRequest } from "bun";

// Document item schema validation
const documentItemSchema = z.object({
  document_id: z.string(),
  part_number: z.string(),
  quantity_ordered: z.number().int().min(0),
  import_price: z.number().positive().nullable().optional(), // Validate as number but convert to string before DB insert
  engine_model: z.string().optional().nullable().optional(),
  engine_number: z.string().optional().nullable().optional(),
  serial_number: z.string().optional().nullable().optional()
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
  document_items: z.array(documentItemSchema).optional()
});

// Import number update schema validation
const importNumberSchema = z.object({
  import_number: z.string().min(1, { message: "Import number is required" })
});

type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export class DocumentController {
  private documentService: DocumentService;
  private csvRecordService: CsvRecordService;

  constructor() {
    this.documentService = new DocumentService();
    this.csvRecordService = new CsvRecordService();
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
        validatedData.file_format
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
        receive_date: validatedData.receive_date ? new Date(validatedData.receive_date) : null,
        tsn: validatedData.tsn || null,
        csn: validatedData.csn || null,
        status: "approved",
        scanned_time: new Date(),
        updated_at: new Date()
      };
      
      // Prepare document items
      const documentItems = validatedData.document_items?.map(item => ({
          document_id: validatedData.id,
          part_number: item.part_number,
          quantity_ordered: item.quantity_ordered,
          import_price: (item.import_price !== null && !isUndefined(item.import_price))? String(item.import_price) : null,
          engine_model: isEmpty(item.engine_model) ? null : String(item.engine_model),
          engine_number: isEmpty(item.engine_number) ? null : String(item.engine_number),
          serial_number: isEmpty(item.serial_number) ? null : String(item.serial_number)
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
      await this.csvRecordService.createCsvRecords(updatedDocument.document);

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

  async refreshDocuments(req: BunRequest): Promise<Response> {
    try {
      const result = await this.documentService.refreshDocuments();
      
      if (result.error) {
        return Response.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        added: result.added,
        message: result.added > 0 
          ? `Added ${result.added} new document(s) from storage bucket` 
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
      const parts = url.pathname.split("/");
      const id = parts.pop(); // Get the document ID from the path
      
      if (!id) {
        return Response.json(
          { error: "Document ID is required" },
          { status: 400 }
        );
      }
      
      // Get the bucket name from query parameter or use a default
      const bucketName = url.searchParams.get("bucket") || "document_files";
      
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
      const bucketName = url.searchParams.get("bucket") || "document_files";
      
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
      
      // Get search query from URL query parameter
      const query = url.searchParams.get("query");
      
      if (!query) {
        return Response.json([]);
      }
      
      // Search for import numbers matching the query
      const importNumbers = await this.documentService.searchImportNumbers(query);
      
      return Response.json(importNumbers);
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
      
      // Create a new FormData object with the same file
      const forwardFormData = new FormData();
      forwardFormData.append('pdf', pdfFile);
      forwardFormData.append('get_ocr', 'true');
      
      // Forward the request to the external endpoint
      const response = await fetch('http://192.168.11.130:5000/api/pdf_to_images', {
        method: 'POST',
        body: forwardFormData,
      });

      if (!response.ok) {
        console.error("External API error:", response.status, response.statusText);
        return Response.json(
          { error: "External service returned an error" },
          { status: response.status }
        );
      }
      
      // Since the response is a ZIP file, return it directly without parsing as JSON
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/zip',
          'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="images.zip"'
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
      
      // Create a new FormData object with the same file
      const forwardFormData = new FormData();
      forwardFormData.append('image_file', imageFile);
      
      // Forward the request to the external OCR endpoint
      const response = await fetch('http://192.168.11.130:5000/api/image_ocr', {
        method: 'POST',
        body: forwardFormData,
      });
      
      if (!response.ok) {
        console.error("External API error:", response.status, response.statusText);
        return Response.json(
          { error: "External service returned an error" },
          { status: response.status }
        );
      }
      
      // Get the JSON response
      const ocrResult = await response.json();
      
      // Return the OCR result directly to the frontend
      return Response.json(ocrResult, { status: response.status });
    } catch (error) {
      console.error("Document OCR error:", error);
      return Response.json(
        { error: "Failed to perform OCR on the document" },
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
}
