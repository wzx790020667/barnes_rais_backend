import type {
  ArcRule,
  EngineModelRule,
  PartNumberRule,
  WorkScopeRule,
} from "../../db/schema";
import type { CsvRecord } from "../csvRecords/types";

export const replaceByArcRule = (arcRule: ArcRule, csvRecord: CsvRecord) => {
  const appearance = arcRule.arc_appearance;
  const resultDisplay = arcRule.result_display;

  if (!appearance) return csvRecord;
  if (!csvRecord.cert_num) return csvRecord;

  const trimedCertNum = csvRecord.cert_num?.trim();

  if (trimedCertNum === appearance) {
    csvRecord.cert_num = resultDisplay;
  }
};

export const replaceByEngineModelRule = (
  engineModelRule: EngineModelRule,
  csvRecord: CsvRecord
) => {
  const engineModelAppearance = engineModelRule.common_prefix;
  const resultDisplay = engineModelRule.result_display;

  if (!engineModelAppearance || !resultDisplay) return csvRecord;

  if (
    csvRecord.engine_model &&
    csvRecord.engine_model.includes(engineModelAppearance)
  ) {
    const pattern = `${engineModelAppearance}`;
    const trimmedEngineModel = csvRecord.engine_model.trim();

    if (trimmedEngineModel.startsWith(pattern)) {
      csvRecord.engine_model = resultDisplay;
    }
  }
};

export const replaceEngineModelTitleByRules = (
  engineModelRules: EngineModelRule[],
  engineModel: string
) => {
  for (const rule of engineModelRules) {
    if (!rule.engine_model_title) continue;

    const pattern = `${rule.engine_model_title}:`;
    const pattern_with_space = `${rule.engine_model_title} `;

    if (engineModel.startsWith(pattern)) {
      return engineModel.replace(pattern, "");
    }

    if (engineModel.startsWith(pattern_with_space)) {
      return engineModel.replace(pattern_with_space, "");
    }
  }

  return engineModel;
};

export const replaceByWorkScopeRule = (
  workScopeRule: WorkScopeRule,
  csvRecord: CsvRecord
) => {
  const overhualKeywords = workScopeRule.overhaul_keywords;
  const resultDisplay = workScopeRule.result_display;

  if (!overhualKeywords || !resultDisplay) return csvRecord;
  if (!csvRecord.WORK_SCOPE) return csvRecord;

  const trimmedWorkScope = csvRecord.WORK_SCOPE.trim();

  if (trimmedWorkScope === overhualKeywords) {
    csvRecord.WORK_SCOPE = resultDisplay;
  }
};

export const replaceByPartNumberRule = (
  partNumberRule: PartNumberRule,
  csvRecord: CsvRecord
) => {
  const partNumberKeywords = partNumberRule.part_number;
  const resultDisplay = partNumberRule.product_code;

  if (!partNumberKeywords || !resultDisplay) return csvRecord;
  if (!csvRecord.item) return csvRecord;

  const trimmedItem = csvRecord.item.trim();

  if (trimmedItem === partNumberKeywords) {
    csvRecord.PRODUCT_CODE = resultDisplay;
  }
};
