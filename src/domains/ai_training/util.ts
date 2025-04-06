import type { Document, DocumentItem } from "../../db/schema";

interface ExtendedDocumentItem extends DocumentItem {
    object_id: number | null;
}

export const createAnnotationsForImportDocument = (doc: Document, docItems: DocumentItem[]) => {
    if (!doc) return [];
    const pageTexts = doc.t_page_texts as string[];
    const totalPages = pageTexts.length;

    const annotations: any[] = [];
    const pageItemsMap = _groupItemsByPageNumber(docItems);
    
    for (let page = 0; page < totalPages; page++) {
        const annotation: any = {
            "Import Document Number": page === doc.t_import_number_page ? doc.import_number : null,
            "Item": []
        }

        const pageItems = pageItemsMap.get(page);
        if (!pageItems || pageItems.length === 0) {
            annotation.Item.push({
                "object_id": null,
                "Part Number": null,
                "Import Price": null,
                "Quantity Ordered": null
            });
            annotations.push(annotation);
            continue;
        }

        for (const item of pageItems) {
            const annotationItem: any = {
                "object_id": item.object_id,
                "Part Number": item.t_part_number_page === page ? item.part_number : null,
                "Import Price": item.t_import_price_page === page ? item.import_price : null,
                "Quantity Ordered": item.t_quantity_ordered_page === page ? item.quantity_ordered : null
            }
            annotation.Item.push(annotationItem);
        }
        annotations.push(annotation);
    }
    return annotations;
}

export const createAnnotationsForPODocument = (doc: Document, docItems: DocumentItem[]) => {
    if (!doc) return [];
    const pageTexts = doc.t_page_texts as string[];
    const totalPages = pageTexts.length;
    const pageItemsMap = _groupItemsByPageNumber(docItems);

    const annotations: any[] = [];
    
    for (let page = 0; page < totalPages; page++) {
        const annotation: any = {
            "Purchase Order Number": page === doc.t_po_number_page ? doc.po_number : null,
            "End User Customer Name": page === doc.t_end_user_customer_name_page ? doc.end_user_customer_name : null,
            "Work Scope": page === doc.t_work_scope_page ? doc.work_scope : null,
            "ARC Requirement": page === doc.t_arc_requirement_page ? doc.arc_requirement : null,
            "TSN Number": page === doc.t_tsn_page ? doc.tsn : null,
            "CSN Number": page === doc.t_csn_page ? doc.csn : null,
            "Item": []
        }

        const pageItems = pageItemsMap.get(page);
        if (!pageItems || pageItems.length === 0) {
            annotation.Item.push({
                "object_id": null,
                "Part Number": null,
                "Quantity Ordered": null,
                "Engine Model": null,
                "Engine Number": null,
                "Serial Number": null
            });
            annotations.push(annotation);
            continue;
        }
        for (const item of pageItems) {
            const annotationItem: any = {
                "object_id": item.object_id,
                "Part Number": item.t_part_number_page === page ? item.part_number : null,
                "Engine Model": item.t_engine_model_page === page ? item.engine_model : null,
                "Engine Number": item.t_engine_number_page === page ? item.engine_number : null,
                "Serial Number": item.t_serial_number_page === page ? item.serial_number : null,
                "Quantity Ordered": item.t_quantity_ordered_page === page ? item.quantity_ordered : null
            }
            annotation.Item.push(annotationItem);
        }
        annotations.push(annotation);
    }
    return annotations;
}


// New function that returns both page numbers and the map of items by page
export const _groupItemsByPageNumber = (docItems: DocumentItem[]) => {
    // Create a Map where keys are page numbers and values are arrays of DocumentItems
    const pageItemsMap = new Map<number, ExtendedDocumentItem[]>();
    
    for (const [index, item] of docItems.entries()) {
        // For each possible page field
        const pageFields = new Set<number>();
        if (item.t_part_number_page !== null) pageFields.add(item.t_part_number_page);
        if (item.t_quantity_ordered_page !== null) pageFields.add(item.t_quantity_ordered_page);
        if (item.t_import_price_page !== null) pageFields.add(item.t_import_price_page);
        if (item.t_engine_model_page !== null) pageFields.add(item.t_engine_model_page);
        if (item.t_engine_number_page !== null) pageFields.add(item.t_engine_number_page);
        if (item.t_serial_number_page !== null) pageFields.add(item.t_serial_number_page);
        
        // Add item to each page it belongs to
        for (const page of pageFields) {
            // Skip null/undefined pages
            if (page === null || page === undefined) continue;
            
            // Initialize array for this page if it doesn't exist
            if (!pageItemsMap.has(page)) {
                pageItemsMap.set(page, []);
            }
            
            // Add item to this page's array
            pageItemsMap.get(page)!.push({
                ...item,
                object_id: index + 1
            });
        }
    }
    
    return pageItemsMap;
}

export const calculateAccuracy = (originalDoc: Document, verifiedDoc: Document) => {
    // Fields to compare from Document
    const documentFields = [
        'import_number',
        'po_number',
        'end_user_customer_name',
        'end_user_customer_number',
        'work_scope',
        'arc_requirement',
        'tsn',
        'csn'
    ];

    // Track unmatched fields
    const unmatchedFieldPaths: string[] = [];
    
    // Count total fields and matched fields
    let totalFieldCount = 0;
    let matchedFieldCount = 0;

    // Compare document fields
    for (const field of documentFields) {
        if (originalDoc[field as keyof Document] !== null && originalDoc[field as keyof Document] !== undefined) {
            totalFieldCount++;
            
            if (originalDoc[field as keyof Document] === verifiedDoc[field as keyof Document]) {
                matchedFieldCount++;
            } else {
                unmatchedFieldPaths.push(`document.${field}`);
            }
        }
    }

    // Compare document items if they exist
    // Use any type to access document_items since it might come from a join query
    const originalItems = (originalDoc as any).document_items as DocumentItem[] || [];
    const verifiedItems = (verifiedDoc as any).document_items as DocumentItem[] || [];

    // Item fields to compare
    const itemFields = [
        'part_number',
        'quantity_ordered',
        'import_price',
        'engine_model',
        'engine_number',
        'serial_number'
    ];

    // Match items by their position/index as they should correspond
    for (let i = 0; i < Math.max(originalItems.length, verifiedItems.length); i++) {
        const originalItem = originalItems[i];
        const verifiedItem = verifiedItems[i];

        // If one list is shorter than the other, count missing items as unmatched
        if (!originalItem || !verifiedItem) {
            // Count all fields in the existing item as unmatched
            const existingItem = originalItem || verifiedItem;
            if (existingItem) {
                for (const field of itemFields) {
                    if (existingItem[field as keyof DocumentItem] !== null && 
                        existingItem[field as keyof DocumentItem] !== undefined) {
                        totalFieldCount++;
                        unmatchedFieldPaths.push(`document_items[${i}].${field}`);
                    }
                }
            }
            continue;
        }

        // Compare item fields
        for (const field of itemFields) {
            if (originalItem[field as keyof DocumentItem] !== null && 
                originalItem[field as keyof DocumentItem] !== undefined) {
                totalFieldCount++;
                
                if (originalItem[field as keyof DocumentItem] === verifiedItem[field as keyof DocumentItem]) {
                    matchedFieldCount++;
                } else {
                    unmatchedFieldPaths.push(`document_items[${i}].${field}`);
                }
            }
        }
    }

    // Calculate accuracy as percentage
    const accuracy = totalFieldCount > 0 ? (matchedFieldCount / totalFieldCount) * 100 : 100;

    return {
        accuracy,
        unmatchedFieldPaths,
        totalFieldCount,
        matchedFieldCount
    };
}