import type { Document, DocumentItem } from "../../db/schema";
import { supabase } from "../../lib";
import { extractDigits, removeSlashes } from "./utils";
import type { CsvRecord } from "./types";

type DocumentWithItems = Document & { document_items: DocumentItem[] };

export class CsvRecordService {
  convert2CsvRecords(
    poDocumentWithItems: DocumentWithItems,
    importDocumentWithItems: DocumentWithItems,
    globalSearchHistory: Record<string, boolean>
  ) {
    const findByPartNumberAndQuantity = (
      partNumber: string | null,
      quantity: string | null
    ) => {
      if (!partNumber || !quantity)
        return {
          import_price: null,
          IMPORT_LINE: null,
        };

      const importItems = importDocumentWithItems?.document_items;
      if (!importItems || importItems.length === 0)
        return {
          import_price: null,
          IMPORT_LINE: null,
        };

      // Filter all matching items for this part number
      const matchingImportItemsWithIndices = importItems
        .map((item, index) => ({ item, originalIndex: index }))
        .filter(
          ({ item }) =>
            item.part_number === partNumber &&
            item.quantity_ordered === quantity
        );

      if (matchingImportItemsWithIndices.length === 0)
        return {
          import_price: null,
          IMPORT_LINE: null,
        };

      let selectedMatch = null;
      selectedMatch = matchingImportItemsWithIndices.find((importItem) => {
        const importItemKey = `${importItem.item.part_number}-${importItem.item.quantity_ordered}-${importItem.originalIndex}`;
        const isSearched = globalSearchHistory[importItemKey];
        return !isSearched;
      });

      if (!selectedMatch) {
        return {
          import_price: null,
          IMPORT_LINE: null,
        };
      }

      const lineNum = selectedMatch.originalIndex + 1;
      const selectedImportItemKey = `${selectedMatch.item.part_number}-${selectedMatch.item.quantity_ordered}-${selectedMatch.originalIndex}`;
      globalSearchHistory[selectedImportItemKey] = true;

      return {
        import_price: selectedMatch?.item.import_price || null,
        IMPORT_LINE: `${lineNum < 10 ? `0${lineNum}` : lineNum}`,
      };
    };

    let records: CsvRecord[] = [];

    poDocumentWithItems.document_items.forEach((item) => {
      const { import_price, IMPORT_LINE } = findByPartNumberAndQuantity(
        item.part_number,
        item.quantity_ordered
      );

      const record: CsvRecord = {
        import_doc_num:
          removeSlashes(poDocumentWithItems.import_number || "") || null,
        IMPORT_LINE: IMPORT_LINE,
        cust_po: poDocumentWithItems.po_number,
        CO_PREFIX: null,
        PRODUCT_CODE: null,
        CUST_CODE: poDocumentWithItems.co_code,
        CUST_NAME: importDocumentWithItems?.customer_name || null,
        item: item.part_number,
        import_price: import_price,
        qty_ordered: extractDigits(item.quantity_ordered || ""),
        engine_model: item.engine_model,
        engine_num: item.engine_number,
        cust_num: poDocumentWithItems.end_user_customer_number,
        end_user_cust_name: poDocumentWithItems.end_user_customer_name,
        WORK_SCOPE: poDocumentWithItems.work_scope,
        cert_num: poDocumentWithItems.arc_requirement,
        ser_num: item.serial_number,
        order_date:
          new Date(
            importDocumentWithItems?.receive_date || ""
          ).toDateString() || null,
        part_rcvd_date:
          new Date(poDocumentWithItems.receive_date || "").toDateString() ||
          null,
        CSN_NUMBER: poDocumentWithItems.csn,
        TSN_NUMBER: poDocumentWithItems.tsn,
      };

      records.push(record);
    });

    return records;
  }

  async getCsvRecordsOfNoBatchNumber(documentIds?: string[]) {
    if (!documentIds) {
      return [];
    }

    const { data: poDocuments, error: poDocError } = await supabase
      .from("documents")
      .select("*, document_items(*)")
      .in("id", documentIds);

    if (poDocError) throw poDocError;

    if (!poDocuments) {
      return [];
    }

    const importNumbers = [
      ...new Set((poDocuments as Document[]).map((doc) => doc.import_number)),
    ];

    const { data: importDocuments, error: importDocError } = await supabase
      .from("documents")
      .select("*, document_items(*)")
      .eq("document_type", "import_declaration")
      .in("import_number", importNumbers);

    if (importDocError) throw importDocError;

    const importNumber2Doc: Record<string, DocumentWithItems> = {};
    importDocuments.forEach((doc) => {
      importNumber2Doc[doc.import_number] = doc;
    });

    const records: CsvRecord[] = [];
    // 全局的part_number搜索计数器，确保相同part_number在所有poDocuments中的IMPORT_LINE都是递增的
    const globalPartNumberSearchHistory: Record<string, boolean> = {};

    poDocuments.forEach((poDoc) => {
      const importDoc = importNumber2Doc[poDoc.import_number];
      const tempRecords = this.convert2CsvRecords(
        poDoc,
        importDoc,
        globalPartNumberSearchHistory
      );
      // 等待Promise完成后再添加记录
      records.push(...tempRecords);
    });

    return records;
  }
}
