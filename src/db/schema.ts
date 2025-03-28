import { sql } from "drizzle-orm";
import { integer, numeric, pgTable, timestamp, uuid, varchar, json } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar({ length: 255 }).notNull(),
  password: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customer_name: varchar({ length: 255 }).notNull(),
  customer_code: varchar({ length: 255 }).notNull(),
  co_code: varchar({ length: 255 }).notNull(),
  document_type: varchar({ length: 255 }),
  file_format: varchar({ length: 255 }),
  customer_info_hash: varchar({ length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customer_name: varchar({ length: 255 }),
  co_code: varchar({ length: 255 }),
  file_format: varchar({ length: 255 }),
  customer_info_hash: varchar({ length: 255 }),
  file_path: varchar({ length: 255 }).notNull(),
  document_type: varchar({ length: 255 }),
  import_number: varchar({ length: 255 }),
  po_number: varchar({ length: 255 }),
  status: varchar({ length: 255 }).$type<"approved" | "not_approved">(),
  scanned_time: timestamp("scanned_time"),
  end_user_customer_name: varchar({ length: 255 }),
  end_user_customer_number: varchar({ length: 255 }),
  work_scope: varchar({ length: 255 }),
  arc_requirement: varchar({ length: 255 }),
  receive_date: timestamp("receive_date"),
  tsn: varchar({ length: 255 }),
  csn: varchar({ length: 255 }),
  page_texts: json("page_texts"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
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
  page_numbers: json("page_numbers"),
});

export const arc_rules = pgTable("arc_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  arc_appearance: varchar({ length: 255 }),
  result_display: varchar({ length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const engine_model_rules = pgTable("engine_model_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  engine_model_title: varchar({ length: 255 }),
  common_prefix: varchar({ length: 255 }),
  result_display: varchar({ length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const work_scope_rules = pgTable("work_scope_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  overhaul_keywords: varchar({ length: 255 }),
  result_display: varchar({ length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const part_number_rules = pgTable("part_number_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  part_number: varchar({ length: 255 }),
  product_code: varchar({ length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const csv_records = pgTable("csv_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  document_id: uuid("document_id").references(() => documents.id),
  batch_number: varchar({ length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
  import_doc_num: varchar({ length: 255 }),
  IMPORT_LINE: varchar({ length: 255 }),
  cust_po: varchar({ length: 255 }),
  CO_PREFIX: varchar({ length: 255 }),
  PRODUCT_CODE: varchar({ length: 255 }),
  CUST_CODE: varchar({ length: 255 }),
  CUST_NAME: varchar({ length: 255 }),
  item: varchar({ length: 255 }),
  ser_num: varchar({ length: 255 }),
  import_price: numeric("import_price", { precision: 10, scale: 2 }),
  qty_ordered: integer("qty_ordered"),
  engine_model: varchar({ length: 255 }),
  engine_num: varchar({ length: 255 }),
  cust_num: varchar({ length: 255 }),
  end_user_cust_name: varchar({ length: 255 }),
  WORK_SCOPE: varchar({ length: 255 }),
  cert_num: varchar({ length: 255 }),
  order_date: timestamp("order_date"),
  part_rcvd_date: timestamp("part_rcvd_date"),
  CSN_NUMBER: varchar({ length: 255 }),
  TSN_NUMBER: varchar({ length: 255 }),
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
