import type { Document, DocumentItem } from "../db/schema";

type DocumentKeys = 
    | keyof Omit<Document, "id" | "created_at" | "updated_at">
    | keyof Omit<DocumentItem, "id" | "created_at" | "updated_at" | "document_id">;

export const CSV_TO_DOCUMENT_KEYS_MAPPING: Record<string, DocumentKeys | null> = {
    // Document fields
    import_doc_num: "import_number",
    IMPORT_LINE: null,
    cust_po: "po_number",
    CO_PREFIX: null,
    PRODUCT_CODE: null,
    CUST_CODE: "co_code", // TODO: Check if this is correct
    CUST_NAME: "customer_name",

    // DocumentItem fields
    item: "part_number",
    ser_num: "serial_number",
    import_price: "import_price",
    qty_ordered: "quantity_ordered",
    engine_model: "engine_model",
    engine_num: "engine_number",
    cust_num: null,
    end_user_cust_name: "end_user_customer_name",
    WORK_SCOPE: "work_scope",
    cert_num: "arc_requirement",
    order_date: null,
    part_rcvd_date: "receive_date",
    CSN_NUMBER: "csn",
    TSN_NUMBER: "tsn"
};


export const DOCUMENT_KEYS_TO_CSV_MAPPING: Record<string, string> = {
    import_number: "import_doc_num",
    po_number: "cust_po",
    co_code: "CUST_CODE", // TODO: Check if this is correct
    customer_name: "CUST_NAME",
    part_number: "item",
    serial_number: "ser_num",
    import_price: "import_price",
    quantity_ordered: "qty_ordered",
    engine_model: "engine_model",
    engine_number: "engine_num",
    end_user_customer_name: "end_user_cust_name",
    work_scope: "WORK_SCOPE",
    arc_requirement: "cert_num",
    receive_date: "part_rcvd_date",
    tsn: "TSN_NUMBER",
    csn: "CSN_NUMBER",
};
