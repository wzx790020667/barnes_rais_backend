import type { Document, DocumentWithItems } from "../../db/schema";
import { supabase, db } from "../../lib";
import type { DocumentItem } from "../../db/schema";
import { drizzleDb } from "../../lib";
import { eq } from "drizzle-orm";
import { documents, document_items, csv_records } from "../../db/schema";
import type { BucketDocument } from "./types";
import { AI_SERVICE_CONFIG } from "../../config";
import {
  toImportDocumentFromAnnotation,
  toPODocumentFromAnnotation,
} from "../ai_training/util";
import type {
  ImportAnnotation,
  ImportTrainingData,
  POAnnotation,
  POTrainingData,
} from "../ai_training/types";
import { DOCUMENT_BUCKET_NAME } from "./constants";
import { AIInferenceService } from "../ai_inference/services";

export class DocumentService {
  async getDocumentById(id: string): Promise<Document | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("documents")
          .select(
            `
            *,
            document_items(*)
          `
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        return data as Document;
      })
      .then((result) => result.data || null);
  }

  async getDocumentsWithPagination(
    page: number = 1,
    pageSize: number = 10,
    status?: string
  ): Promise<{ documents: Document[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;

        // Build query with potential status filter
        let query = supabase
          .from("documents")
          .select("count", { count: "exact" });

        // Apply status filter if provided
        if (status) {
          query = query.eq("status", status);
        }

        // Get total count first
        const { data: countData, error: countError } = await query;

        if (countError) throw countError;
        const total = countData?.[0]?.count || 0;

        // Then get paginated data with the same filter
        let dataQuery = supabase.from("documents").select(`
            *,
            document_items(*)
          `);

        // Apply the same status filter to data query
        if (status) {
          dataQuery = dataQuery.eq("status", status);
        }

        // Complete the query with ordering and pagination
        // First order by status (not_approved first, then approved), then by created_at
        const { data, error } = await dataQuery
          .order("status", { ascending: false }) // not_approved comes before approved alphabetically
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        return {
          documents: data as Document[],
          total,
        };
      })
      .then((result) => result.data || { documents: [], total: 0 });
  }

  async getAllDocuments(status?: string): Promise<Document[]> {
    return db
      .query(async () => {
        // Build query to get all documents
        let query = supabase.from("documents").select(`
            *,
            document_items(*)
          `);

        // Apply status filter if provided
        if (status) {
          query = query.eq("status", status);
        }

        // Get all documents with ordering
        const { data, error } = await query.order("created_at", {
          ascending: false,
        });

        if (error) throw error;

        return data as Document[];
      })
      .then((result) => result.data || []);
  }

  async getUnpairedDocuments(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ documents: Document[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;

        // Build query for documents that are purchase orders without import numbers
        let query = supabase
          .from("documents")
          .select("count", { count: "exact" })
          .eq("document_type", "purchase_order")
          .is("import_number", null);

        // Get total count first
        const { data: countData, error: countError } = await query;

        if (countError) throw countError;
        const total = countData?.[0]?.count || 0;

        // Then get paginated data with the same filter
        let dataQuery = supabase
          .from("documents")
          .select(
            `
            *,
            document_items(*)
          `
          )
          .eq("document_type", "purchase_order")
          .is("import_number", null);

        // Complete the query with ordering and pagination
        const { data, error } = await dataQuery
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        return {
          documents: data as Document[],
          total,
        };
      })
      .then((result) => result.data || { documents: [], total: 0 });
  }

  async getAllUnpairedDocuments(): Promise<Document[]> {
    return db
      .query(async () => {
        // Build query for documents that are purchase orders without import numbers
        const { data, error } = await supabase
          .from("documents")
          .select(
            `
            *,
            document_items(*)
          `
          )
          .eq("document_type", "purchase_order")
          .is("import_number", null)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return data as Document[];
      })
      .then((result) => result.data || []);
  }

  async getFilteredDocuments(
    page: number = 1,
    pageSize: number = 10,
    filter: "paired" | "unpaired"
  ): Promise<{ documents: Document[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;

        // Build query based on filter type
        let query = supabase
          .from("documents")
          .select("count", { count: "exact" });

        if (filter === "paired") {
          // Paired: document_type is 'import_declaration' or 'purchase_order' AND import_number is not null
          query = query
            .or(
              "document_type.eq.import_declaration,document_type.eq.purchase_order"
            )
            .not("import_number", "is", null);
        } else {
          // Unpaired: document_type is 'purchase_order' AND import_number is null
          query = query
            .eq("document_type", "purchase_order")
            .is("import_number", null);
        }

        // Get total count first
        const { data: countData, error: countError } = await query;

        if (countError) throw countError;
        const total = countData?.[0]?.count || 0;

        // Then get paginated data with the same filter, including document_items
        let dataQuery = supabase.from("documents").select(`
            *,
            document_items(*)
          `);

        if (filter === "paired") {
          // Paired: document_type is 'import_declaration' or 'purchase_order' AND import_number is not null
          dataQuery = dataQuery
            .or(
              "document_type.eq.import_declaration,document_type.eq.purchase_order"
            )
            .not("import_number", "is", null);
        } else {
          // Unpaired: document_type is 'purchase_order' AND import_number is null
          dataQuery = dataQuery
            .eq("document_type", "purchase_order")
            .is("import_number", null);
        }

        // Complete the query with ordering and pagination
        const { data, error } = await dataQuery
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        return {
          documents: data as Document[],
          total,
        };
      })
      .then((result) => result.data || { documents: [], total: 0 });
  }

  async getAllFilteredDocuments(
    filter: "paired" | "unpaired"
  ): Promise<Document[]> {
    return db
      .query(async () => {
        // Build base query
        let query = supabase.from("documents").select(`
            *,
            document_items(*)
          `);

        if (filter === "paired") {
          // Paired: document_type is 'import_declaration' or 'purchase_order' AND import_number is not null
          query = query
            .or(
              "document_type.eq.import_declaration,document_type.eq.purchase_order"
            )
            .not("import_number", "is", null);
        } else {
          // Unpaired: document_type is 'purchase_order' AND import_number is null
          query = query
            .eq("document_type", "purchase_order")
            .is("import_number", null);
        }

        // Get all filtered documents with ordering
        const { data, error } = await query
          .eq("is_archived", false)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return data as Document[];
      })
      .then((result) => result.data || []);
  }

  async getDocumentFromBucket(
    bucketName: string,
    id: string
  ): Promise<BucketDocument | null> {
    const result = await db.query(async () => {
      // First get metadata about the file
      const { data: fileInfo, error: metadataError } = await supabase.storage
        .from(bucketName)
        .list("", {
          search: id,
        });

      if (metadataError) throw metadataError;

      const fileMetadata = fileInfo?.find(
        (file) => file.name === id || file.id === id
      );
      if (!fileMetadata) return null;

      // Get the file content using a signed URL instead of trying to process it directly
      const { data: urlData } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(id, 3600); // 1 hour expiry

      if (!urlData?.signedUrl) return null;

      // Create a Document with required fields
      const doc: BucketDocument = {
        id,
        file_path: fileMetadata.name,
        content: urlData.signedUrl,
        contentType:
          fileMetadata.metadata?.mimetype || "application/octet-stream",
        binaryFile: true,
      };

      return doc;
    });

    if (result.error) {
      console.error("Error fetching document from bucket:", result.error);
      return null;
    }

    return result.data || null;
  }

  async getDocumentsFromBucket(
    bucketName: string,
    ids: string[]
  ): Promise<BucketDocument[]> {
    return db
      .query(async () => {
        if (!ids || ids.length === 0) return [];

        // First get metadata about all files in the bucket
        const { data: fileInfo, error: metadataError } = await supabase.storage
          .from(bucketName)
          .list("");

        if (metadataError) throw metadataError;
        if (!fileInfo || fileInfo.length === 0) return [];

        // Find metadata for the requested files
        const matchingFiles = fileInfo.filter(
          (file) => ids.includes(file.name) || ids.includes(file.id || "")
        );

        if (matchingFiles.length === 0) return [];

        // Create signed URLs for each matching file
        const documentsPromises = matchingFiles.map(async (fileMetadata) => {
          const fileId = fileMetadata.name;

          const { data: urlData } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(fileId, 3600); // 1 hour expiry

          if (!urlData?.signedUrl) return null;

          // Create a Document with required fields
          return {
            id: fileId,
            file_path: fileMetadata.name,
            content: urlData.signedUrl,
            contentType:
              fileMetadata.metadata?.mimetype || "application/octet-stream",
            binaryFile: true,
          };
        });

        // Wait for all promises to resolve and filter out nulls
        const documents = (await Promise.all(documentsPromises)).filter(
          (doc) => doc !== null
        );

        return documents;
      })
      .then((result) => {
        if (result.error) {
          console.error("Error fetching documents from bucket:", result.error);
          return [];
        }
        return result.data || [];
      });
  }

  async searchImportNumbers(
    searchQuery: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ importNumbers: string[]; total: number }> {
    return db
      .query(async () => {
        // Build base query for counting
        let countQuery = supabase
          .from("documents")
          .select("count", { count: "exact", head: true })
          .not("import_number", "is", null)
          .eq("document_type", "import_declaration")
          .eq("is_archived", false);

        // Only apply filter if query is not empty
        const filteredCountQuery = searchQuery
          ? countQuery.ilike("import_number", `%${searchQuery}%`)
          : countQuery;

        // Get total count
        const { count: total, error: countError } = await filteredCountQuery;

        if (countError) throw countError;

        // Build base query for data
        let dataQuery = supabase
          .from("documents")
          .select("import_number")
          .not("import_number", "is", null)
          .eq("document_type", "import_declaration")
          .eq("is_archived", false)
          .order("import_number", { ascending: true });

        // If query is not empty, apply filter without pagination
        // If query is empty, apply pagination without filter
        let filteredDataQuery;
        if (searchQuery) {
          filteredDataQuery = dataQuery.ilike(
            "import_number",
            `%${searchQuery}%`
          );
        } else {
          // Calculate offset based on page and pageSize
          const offset = (page - 1) * pageSize;
          filteredDataQuery = dataQuery.range(offset, offset + pageSize - 1);
        }

        // Get results
        const { data, error } = await filteredDataQuery;

        if (error) throw error;

        // Extract unique import numbers
        const importNumbers = data
          .map((doc) => doc.import_number as string)
          .filter(
            (value, index, self) =>
              // Remove duplicates
              value && self.indexOf(value) === index
          );

        return { importNumbers, total: total || 0 };
      })
      .then((result) => {
        if (result.error) {
          console.error("Error searching import numbers:", result.error);
          return { importNumbers: [], total: 0 };
        }
        return result.data || { importNumbers: [], total: 0 };
      });
  }

  async updateDocument(
    id: string,
    documentData: Partial<Document>,
    documentItems: Omit<DocumentItem, "id">[] = []
  ): Promise<{ document: Document; items: DocumentItem[] } | null> {
    return db
      .query(async () => {
        try {
          // Execute all operations in a transaction using Drizzle
          return await drizzleDb.transaction(async (tx) => {
            // Step 1: Update the document
            const updatedDocuments = await tx
              .update(documents)
              .set({
                ...documentData,
                updated_at: new Date(),
              })
              .where(eq(documents.id, id))
              .returning();

            if (!updatedDocuments || updatedDocuments.length === 0) {
              throw new Error("Document update failed");
            }

            const updatedDocument = updatedDocuments[0] as Document;

            // Step 2: If we have document items, handle them
            let updatedItems: DocumentItem[] = [];

            if (documentItems.length > 0) {
              // Delete existing items
              await tx
                .delete(document_items)
                .where(eq(document_items.document_id, id));

              // Insert new items
              const itemsWithDocId = documentItems.map((item) => ({
                ...item,
                document_id: id,
              }));

              updatedItems = (await tx
                .insert(document_items)
                .values(itemsWithDocId)
                .returning()) as DocumentItem[];
            }

            return {
              document: updatedDocument,
              items: updatedItems,
            };
          });
        } catch (error) {
          console.error("Transaction failed:", error);
          throw error;
        }
      })
      .then((result) => result.data || null);
  }

  async deleteDocument(id: string): Promise<boolean> {
    return db
      .query(async () => {
        // First get the document to retrieve file_path
        const { data: document, error: getError } = await supabase
          .from("documents")
          .select("file_path, status")
          .eq("id", id)
          .single();

        if (getError) throw getError;
        if (!document) throw new Error("Document not found");

        // Only allow deletion of not_approved documents
        if (document.status !== "not_approved") {
          throw new Error(
            "Only documents with status 'not_approved' can be deleted"
          );
        }

        // Delete from storage first
        const { error: storageError } = await supabase.storage
          .from(DOCUMENT_BUCKET_NAME)
          .remove([document.file_path]);

        if (storageError) {
          console.warn("Failed to delete file from storage:", storageError);
          // Continue with database deletion even if storage deletion fails
        }

        // Delete from database
        const { error: deleteError } = await supabase
          .from("documents")
          .delete()
          .eq("id", id);

        if (deleteError) throw deleteError;
        return true;
      })
      .then((result) => (result.error ? false : true));
  }

  async refreshDocuments(): Promise<{ added: number; error?: string } | null> {
    return db
      .query(async () => {
        try {
          // Get documents from bucket
          const { data: bucketFiles, error: bucketError } =
            await supabase.storage.from(DOCUMENT_BUCKET_NAME).list("", {
              sortBy: { column: "created_at", order: "desc" },
            });

          if (bucketError) {
            console.error("Error of refreshDocuments(), ", bucketError);
            return null;
          }
          if (!bucketFiles || bucketFiles.length === 0) {
            return { added: 0 };
          }

          // Extract valid file names from bucket files
          const fileNames = bucketFiles
            .filter(
              (file) => file.name && file.name !== ".emptyFolderPlaceholder"
            )
            .map((file) => file.name);

          if (fileNames.length === 0) {
            return { added: 0 };
          }

          // Get existing file paths from the database
          const { data: existingDocs, error: listError } = await supabase
            .from("documents")
            .select("file_path")
            .in("file_path", fileNames);

          if (listError) {
            console.error("Error of refreshDocuments(), ", listError);
            return null;
          }

          // Find files that don't exist in the database
          const existingFilePaths = new Set(
            existingDocs?.map((doc) => doc.file_path) || []
          );

          const missingFiles = fileNames.filter(
            (name) => !existingFilePaths.has(name)
          );

          if (missingFiles.length === 0) {
            return { added: 0 };
          }

          // Create documents for missing files
          const newDocuments = missingFiles.map((fileName) => {
            const bucketFile = bucketFiles.find(
              (file) => file.name === fileName
            );
            return {
              file_path: fileName,
              status: "not_approved",
              created_at: bucketFile?.created_at
                ? new Date(bucketFile.created_at)
                : new Date(),
            };
          });

          // Insert the new documents
          const { error: insertError } = await supabase
            .from("documents")
            .insert(newDocuments)
            .select();

          if (insertError) {
            console.error("Error from ", insertError);
            return null;
          }

          return { added: newDocuments.length };
        } catch (error) {
          console.error("Error refreshing documents:", error);
          throw error;
        }
      })
      .then((result) => {
        if (result.error) {
          return {
            added: 0,
            error: result.error.message,
          };
        }
        return result.data || { added: 0 };
      });
  }

  async updateDocumentImportNumber(
    id: string,
    importNumber: string
  ): Promise<Document | null> {
    return db
      .query(async () => {
        try {
          // Use Drizzle transaction to update both document and related csv records
          return await drizzleDb.transaction(async (tx) => {
            // Step 1: Update the document's import_number
            const updatedDocuments = await tx
              .update(documents)
              .set({
                import_number: importNumber,
                updated_at: new Date(),
              })
              .where(eq(documents.id, id))
              .returning();

            if (!updatedDocuments || updatedDocuments.length === 0) {
              throw new Error("Document update failed");
            }

            // Step 2: Update any related csv_records with the new import number
            await tx
              .update(csv_records)
              .set({
                import_doc_num: importNumber,
              })
              .where(eq(csv_records.document_id, id));

            return updatedDocuments[0] as Document;
          });
        } catch (error) {
          console.error("Import number update failed:", error);
          return null;
        }
      })
      .then((result) => result.data || null);
  }

  async markDocumentsAsExported(documentIds: string[]): Promise<boolean> {
    return db
      .query(async () => {
        try {
          const { error } = await supabase
            .from("documents")
            .update({
              is_exported: true,
              updated_at: new Date().toISOString(),
            })
            .in("id", documentIds);

          if (error) {
            console.error("Error marking documents as exported:", error);
            return false;
          }

          return true;
        } catch (error) {
          console.error("Failed to mark documents as exported:", error);
          return false;
        }
      })
      .then((result) => result.data || false);
  }

  async markDocumentsAsArchived(documentIds: string[]): Promise<boolean> {
    return db
      .query(async () => {
        try {
          // First, verify that all documents have is_exported = true
          const { data: documents, error: queryError } = await supabase
            .from("documents")
            .select("id, is_exported, document_type")
            .in("id", documentIds);

          if (queryError) {
            console.error(
              "Error querying documents for export status:",
              queryError
            );
            return false;
          }

          // Check if any document is not exported
          const notExportedDocs =
            documents?.filter(
              (doc) =>
                !doc.is_exported && doc.document_type === "purchase_order"
            ) || [];
          if (notExportedDocs.length > 0) {
            console.error(
              `Cannot archive documents. The following documents are not exported: ${notExportedDocs
                .map((doc) => doc.id)
                .join(", ")}`
            );
            return false;
          }

          // All documents are exported, proceed with archiving
          const { error } = await supabase
            .from("documents")
            .update({
              is_archived: true,
              updated_at: new Date().toISOString(),
            })
            .in("id", documentIds);

          if (error) {
            console.error("Error marking documents as archived:", error);
            return false;
          }

          return true;
        } catch (error) {
          console.error("Failed to mark documents as archived:", error);
          return false;
        }
      })
      .then((result) => result.data || false);
  }

  async uploadDocumentToBucket(
    file: File
  ): Promise<{ path: string; error?: string } | null> {
    return db
      .query(async () => {
        try {
          // Upload file to the bucket
          const { data, error } = await supabase.storage
            .from(DOCUMENT_BUCKET_NAME)
            .upload(file.name, file);

          if (error) {
            console.error("Error from uploadDocumentToBucket", error);
            return null;
          }

          return { path: data.path };
        } catch (error) {
          console.error("Error uploading document:", error);
          return {
            path: "",
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
      .then((result) => result.data || null);
  }

  async scanDocumentOcr(imageFile: File): Promise<any> {
    try {
      // Create a FormData object for the AI service request
      const formData = new FormData();
      formData.append("image_file", imageFile);

      // Make the request to the external OCR endpoint
      const response = await fetch(`${AI_SERVICE_CONFIG.URL}/api/image_ocr`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`External API error: ${response.status} - ${errorText}`);
        return null;
      }

      // Return the OCR result
      return await response.json();
    } catch (error) {
      console.error("Document OCR service error:", error);
      throw error;
    }
  }

  async uploadPdfToExternal(pdfFile: File): Promise<{
    body: ReadableStream<Uint8Array> | null;
    headers: Headers;
    status: number;
  } | null> {
    try {
      // Create a FormData object for the AI service request
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("get_ocr", "true");

      // Make the request to the external PDF to images endpoint
      const response = await fetch(
        `${AI_SERVICE_CONFIG.URL}/api/pdf_to_images`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`External API error: ${response.status} - ${errorText}`);
        return null;
      }

      // Return the response data needed to construct the final response
      return {
        body: response.body,
        headers: response.headers,
        status: response.status,
      };
    } catch (error) {
      console.error("PDF to images service error:", error);
      throw error;
    }
  }

  async pdfFullARD(
    pdfFile: File | null = null,
    documentType: string,
    prompt: string,
    raw: string | null = null
  ): Promise<Partial<DocumentWithItems> | null> {
    try {
      const aiInferenceService = new AIInferenceService();

      let responseDocument;
      if (pdfFile) {
        // Use the AIInferenceService to run the inference
        responseDocument = await aiInferenceService.runInference(
          pdfFile,
          documentType,
          prompt
        );
      } else if (raw) {
        // Use the AIInferenceService to run inference on raw text
        responseDocument = await aiInferenceService.runInferenceByRaw(
          raw,
          documentType,
          prompt
        );
      } else {
        throw new Error("Either pdfFile or raw must be provided");
      }

      let document: Partial<DocumentWithItems> | null = null;
      if (documentType === "purchase_order") {
        const payload: POTrainingData = {
          Doc_type: documentType,
          content: responseDocument.t_page_texts,
          annotations: responseDocument as POAnnotation[],
        };
        document = toPODocumentFromAnnotation(
          payload,
          responseDocument.t_page_texts
        );
        if (document) {
          document.document_type = "purchase_order";
        }
      } else {
        const payload: ImportTrainingData = {
          Doc_type: documentType,
          content: responseDocument.t_page_texts,
          annotations: responseDocument as ImportAnnotation[],
        };
        document = toImportDocumentFromAnnotation(
          payload,
          responseDocument.t_page_texts
        );
        if (document) {
          document.document_type = "import_declaration";
        }
      }

      return document;
    } catch (error) {
      console.error("PDF to images service error:", error);
      throw error;
    }
  }
}
