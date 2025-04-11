import type { ArcRule, CsvRecord, EngineModelRule, PartNumberRule, WorkScopeRule } from "../../db/schema";

export const replaceByArcRule = (arcRule: ArcRule, csvRecord: CsvRecord) => {
    const appearance = arcRule.arc_appearance;
    const resultDisplay = arcRule.result_display;

    if (!appearance) return csvRecord;

    if (csvRecord.cert_num && csvRecord.cert_num.includes(appearance)) {
        csvRecord.cert_num = resultDisplay;
    }
}

export const replaceByEngineModelRule = (engineModelRule: EngineModelRule, csvRecord: CsvRecord) => {
    const engineModelTitle = engineModelRule.engine_model_title;
    const engineModelCommonPrefix = engineModelRule.common_prefix;
    const resultDisplay = engineModelRule.result_display;

    if (!engineModelTitle || !engineModelCommonPrefix || !resultDisplay) return csvRecord;

    if (csvRecord.engine_model && csvRecord.engine_model.includes(engineModelTitle)) {
        // const pattern = `${engineModelTitle}: ${engineModelCommonPrefix}`;
        const pattern = `${engineModelCommonPrefix}`;
        if (csvRecord.engine_model.startsWith(pattern)) {
            csvRecord.engine_model = resultDisplay;
        }
    }
}

export const replaceByWorkScopeRule = (workScopeRule: WorkScopeRule, csvRecord: CsvRecord) => {
    const overhualKeywords = workScopeRule.overhaul_keywords;
    const resultDisplay = workScopeRule.result_display;

    if (!overhualKeywords || !resultDisplay) return csvRecord;

    if (csvRecord.WORK_SCOPE && csvRecord.WORK_SCOPE.includes(overhualKeywords)) {
        csvRecord.WORK_SCOPE = resultDisplay;
    }
}

export const replaceByPartNumberRule = (partNumberRule: PartNumberRule, csvRecord: CsvRecord) => {
    const partNumberKeywords = partNumberRule.part_number;
    const resultDisplay = partNumberRule.product_code;

    if (!partNumberKeywords || !resultDisplay) return csvRecord;

    if (csvRecord.item && csvRecord.item.includes(partNumberKeywords)) {
        csvRecord.PRODUCT_CODE = resultDisplay;
    }
}