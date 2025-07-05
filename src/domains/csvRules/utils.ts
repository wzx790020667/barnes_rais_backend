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

export const replaceByMultipleArcRules = (
  arcRules: ArcRule[],
  originalText: string
): string => {
  if (!originalText || !arcRules || arcRules.length === 0) {
    return originalText;
  }

  const trimmedText = originalText.trim();
  const matchedResults: { result: string; position: number }[] = [];
  const usedAppearances = new Set<string>();

  // 遍历所有规则，查找匹配的arc_appearance
  for (const rule of arcRules) {
    const appearance = rule.arc_appearance;
    const resultDisplay = rule.result_display;

    if (!appearance || !resultDisplay) continue;

    const trimmedAppearance = appearance.trim();
    
    // 检查该arc_appearance是否已经被使用过
    if (usedAppearances.has(trimmedAppearance)) {
      continue;
    }

    // 检查原字符串中是否包含当前规则的arc_appearance
    const position = trimmedText.indexOf(trimmedAppearance);
    if (position !== -1) {
      matchedResults.push({ result: resultDisplay, position });
      usedAppearances.add(trimmedAppearance);
    }
  }

  // 如果有匹配结果，按位置排序后用/分隔符连接
  if (matchedResults.length > 0) {
    return matchedResults
      .sort((a, b) => a.position - b.position)
      .map(item => item.result)
      .join('/');
  }

  return originalText;
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
