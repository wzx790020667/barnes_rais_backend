ALTER TABLE "document_items" ALTER COLUMN "serial_number" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "is_exported" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "is_archived" boolean DEFAULT false;