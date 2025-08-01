import { ArcRuleService } from "../csvRules/services/ArcRuleService";
import { EngineModelRuleService } from "../csvRules/services/EngineModelRuleService";
import { PartNumberRuleService } from "../csvRules/services/PartNumberRuleService";
import { WorkScopeRuleService } from "../csvRules/services/WorkScopeRuleService";
import { CsvRecordService } from "./services";
import { DocumentService } from "../documents/services";
import {
  replaceByArcRule,
  replaceByMultipleArcRules,
  replaceByEngineModelRule,
  replaceByPartNumberRule,
  replaceByWorkScopeRule,
} from "../csvRules/utils";
import type { BunRequest } from "bun";
import moment from "moment-timezone";

export class CsvRecordController {
  private csvRecordService: CsvRecordService;
  private documentService: DocumentService;
  private arcRuleService: ArcRuleService;
  private engineModelRuleService: EngineModelRuleService;
  private workScopeRuleService: WorkScopeRuleService;
  private partNumberRulesService: PartNumberRuleService;

  constructor() {
    this.csvRecordService = new CsvRecordService();
    this.documentService = new DocumentService();
    this.arcRuleService = new ArcRuleService();
    this.engineModelRuleService = new EngineModelRuleService();
    this.workScopeRuleService = new WorkScopeRuleService();
    this.partNumberRulesService = new PartNumberRuleService();
  }

  async exportCsvRecords(req: BunRequest): Promise<Response> {
    try {
      // Parse request body for document IDs
      const body = await req.json();
      const documentIds = (body as string[]) || [];

      const records = await this.csvRecordService.getCsvRecordsOfNoBatchNumber(
        documentIds
      );

      const arcRulesReq = this.arcRuleService.getArcRules(null, null);
      const engineModelRulesReq =
        this.engineModelRuleService.getEngineModelRules(null, null);
      const workScopeRulesReq = this.workScopeRuleService.getWorkScopeRules(
        null,
        null
      );
      const partNumberRulesReq = this.partNumberRulesService.getPartNumberRules(
        null,
        null
      );

      const [
        arcRulesRes,
        engineModelRulesRes,
        workScopeRulesRes,
        partNumberRulesRes,
      ] = await Promise.all([
        arcRulesReq,
        engineModelRulesReq,
        workScopeRulesReq,
        partNumberRulesReq,
      ]);

      // Extract rules arrays from responses
      const arcRules = arcRulesRes.arcRules || [];
      const engineModelRules = engineModelRulesRes.engineModelRules || [];
      const workScopeRules = workScopeRulesRes.workScopeRules || [];
      const partNumberRules = partNumberRulesRes.partNumberRules || [];

      // Apply all rules to each record
      records.map((record) => {
        // Apply arc rules using multiple matching
        if (record.cert_num && arcRules.length > 0) {
          const replacedCertNum = replaceByMultipleArcRules(arcRules, record.cert_num);
          record.cert_num = replacedCertNum;
        }

        for (const rule of engineModelRules) {
          replaceByEngineModelRule(rule, record);
        }

        for (const rule of workScopeRules) {
          replaceByWorkScopeRule(rule, record);
        }

        for (const rule of partNumberRules) {
          replaceByPartNumberRule(rule, record);
        }

        record.CO_PREFIX = `${record.PRODUCT_CODE ? record.PRODUCT_CODE : ""}${
          record.CUST_CODE ? record.CUST_CODE : ""
        }`;
        // @ts-ignore
        record.part_rcvd_date = moment(record.part_rcvd_date)
          .tz("Asia/Taipei")
          .format("MM/DD/YYYY");
        // @ts-ignore
        record.order_date = moment(record.order_date)
          .tz("Asia/Taipei")
          .format("MM/DD/YYYY");
      });

      // Mark documents as exported after successful processing
      const exportSuccess = await this.documentService.markDocumentsAsExported(documentIds);
      if (!exportSuccess) {
        console.warn("Failed to mark some documents as exported, but CSV export was successful");
      }

      return Response.json(records);
    } catch (error) {
      console.error("Error exporting CSV records:", error);
      return Response.json(
        {
          success: false,
          message: "Failed to export CSV records",
        },
        { status: 500 }
      );
    }
  }
}
