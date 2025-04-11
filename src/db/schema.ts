import { sql } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar, json, text, integer, numeric, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar({ length: 255 }).notNull(),
  password: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 255 }).notNull(),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
  updated_at: timestamp("updated_at", {withTimezone: true}).defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customer_name: varchar({ length: 255 }).notNull(),
  customer_code: varchar({ length: 255 }).notNull(),
  co_code: varchar({ length: 255 }).notNull(),
  document_type: varchar({ length: 255 }),
  file_format: varchar({ length: 255 }),
  customer_info_hash: varchar({ length: 255 }),
  t_bind_path: varchar({ length: 255 }),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
  updated_at: timestamp("updated_at", {withTimezone: true}).defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customer_name: varchar({ length: 255 }),
  co_code: varchar({ length: 255 }),
  file_format: varchar({ length: 255 }),
  file_path: varchar({ length: 255 }).notNull(),
  document_type: varchar({ length: 255 }),
  import_number: varchar({ length: 255 }),
  po_number: varchar({ length: 255 }),
  status: varchar({ length: 255 }).$type<"approved" | "not_approved">(),
  scanned_time: timestamp("scanned_time", {withTimezone: true}),
  end_user_customer_name: varchar({ length: 255 }),
  end_user_customer_number: varchar({ length: 255 }),
  work_scope: varchar({ length: 255 }),
  arc_requirement: varchar({ length: 255 }),
  receive_date: timestamp("receive_date", {withTimezone: true}),
  tsn: varchar({ length: 255 }),
  csn: varchar({ length: 255 }),
  customer_info_hash: varchar({ length: 255 }),
  from_full_ard: boolean("from_full_ard").default(false),
  t_page_texts: json("t_page_texts"),
  t_import_number_page: integer("t_import_number_page"),
  t_po_number_page: integer("t_po_number_page"),
  t_end_user_customer_name_page: integer("t_end_user_customer_name_page"),
  t_end_user_customer_number_page: integer("t_end_user_customer_number_page"),
  t_work_scope_page: integer("t_work_scope_page"),
  t_arc_requirement_page: integer("t_arc_requirement_page"),
  t_tsn_page: integer("t_tsn_page"),
  t_csn_page: integer("t_csn_page"),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
  updated_at: timestamp("updated_at", {withTimezone: true}).defaultNow(),
});

export const document_items = pgTable("document_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  document_id: uuid("document_id").references(() => documents.id),
  part_number: varchar({ length: 255 }),
  quantity_ordered: varchar({ length: 255 }),
  import_price: varchar({ length: 255 }),
  engine_model: varchar({ length: 255 }),
  engine_number: varchar({ length: 255 }),
  serial_number: varchar({ length: 255 }),
  t_part_number_page: integer("t_part_number_page"),
  t_quantity_ordered_page: integer("t_quantity_ordered_page"),
  t_import_price_page: integer("t_import_price_page"),
  t_engine_model_page: integer("t_engine_model_page"),
  t_engine_number_page: integer("t_engine_number_page"),
  t_serial_number_page: integer("t_serial_number_page"),
});

export const arc_rules = pgTable("arc_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  arc_appearance: varchar({ length: 255 }),
  result_display: varchar({ length: 255 }),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
  updated_at: timestamp("updated_at", {withTimezone: true}).defaultNow(),
});

export const engine_model_rules = pgTable("engine_model_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  engine_model_title: varchar({ length: 255 }),
  common_prefix: varchar({ length: 255 }),
  result_display: varchar({ length: 255 }),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
  updated_at: timestamp("updated_at", {withTimezone: true}).defaultNow(),
});

export const work_scope_rules = pgTable("work_scope_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  overhaul_keywords: varchar({ length: 255 }),
  result_display: varchar({ length: 255 }),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
  updated_at: timestamp("updated_at", {withTimezone: true}).defaultNow(),
});

export const part_number_rules = pgTable("part_number_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  part_number: varchar({ length: 255 }),
  product_code: varchar({ length: 255 }),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
  updated_at: timestamp("updated_at", {withTimezone: true}).defaultNow(),
});

export const csv_records = pgTable("csv_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  document_id: uuid("document_id").references(() => documents.id),
  batch_number: varchar({ length: 255 }),
  import_doc_num: varchar({ length: 255 }),
  IMPORT_LINE: varchar({ length: 255 }),
  cust_po: varchar({ length: 255 }),
  CO_PREFIX: varchar({ length: 255 }),
  PRODUCT_CODE: varchar({ length: 255 }),
  CUST_CODE: varchar({ length: 255 }),
  CUST_NAME: varchar({ length: 255 }),
  item: varchar({ length: 255 }),
  ser_num: varchar({ length: 255 }),
  import_price: varchar({ length: 255 }),
  qty_ordered: varchar({ length: 255 }),
  engine_model: varchar({ length: 255 }),
  engine_num: varchar({ length: 255 }),
  cust_num: varchar({ length: 255 }),
  end_user_cust_name: varchar({ length: 255 }),
  WORK_SCOPE: varchar({ length: 255 }),
  cert_num: varchar({ length: 255 }),
  order_date: timestamp("order_date", {withTimezone: true}),
  part_rcvd_date: timestamp("part_rcvd_date", {withTimezone: true}),
  CSN_NUMBER: varchar({ length: 255 }),
  TSN_NUMBER: varchar({ length: 255 }),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
})

export const t_datasets = pgTable("t_datasets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customer_id: uuid("customer_id").references(() => customers.id).notNull(),
  name: varchar({ length: 255 }).unique(),
  training_docs: json("training_docs"), // array of document {document_id, filepath}
  verification_docs: json("verification_docs"), // array of document {document_id, filepath}
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
  updated_at: timestamp("updated_at", {withTimezone: true}).defaultNow(),
})

export type TrainingTaskStatus = "pending" | "training" | "completed" | "failed";

export const t_tasks = pgTable("t_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar({ length: 255 }).unique(),
  t_dataset_id: uuid("t_dataset_id").references(() => t_datasets.id).notNull(),
  customer_id: uuid("customer_id").references(() => customers.id).notNull(),
  prompt: text("prompt"),
  status: varchar({ length: 255 }).$type<TrainingTaskStatus>(),
  start_time: timestamp("start_time"),
  target_time: timestamp("target_time"),
  completed_time: timestamp("completed_time"),
  model_path: varchar({length: 255}),
  accuracy: numeric("accuracy"),
  document_type: varchar({length: 255}),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
  updated_at: timestamp("updated_at", {withTimezone: true}).defaultNow(),
})

export const ttv_results = pgTable("ttv_results", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  t_task_id: uuid("t_task_id").references(() => t_tasks.id).notNull(),
  original_doc: json("original_doc"),
  verified_doc: json("verified_doc"),
  accuracy: numeric("accuracy"),
  unmatched_field_paths: json("unmatched_field_paths"),
  created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
})

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentItem = typeof document_items.$inferSelect;
export type ArcRule = typeof arc_rules.$inferSelect;
export type EngineModelRule = typeof engine_model_rules.$inferSelect;
export type WorkScopeRule = typeof work_scope_rules.$inferSelect;
export type PartNumberRule = typeof part_number_rules.$inferSelect;
export type CsvRecord = typeof csv_records.$inferSelect;
export type TrainingDataset = typeof t_datasets.$inferSelect;
export type TrainingTask = typeof t_tasks.$inferSelect;
export type TrainingTaskVerificationResult = typeof ttv_results.$inferSelect;

