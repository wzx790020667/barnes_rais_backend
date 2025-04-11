import { ArcRuleService } from "../csvRules/services/ArcRuleService";
import { EngineModelRuleService } from "../csvRules/services/EngineModelRuleService";
import { PartNumberRuleService } from "../csvRules/services/PartNumberRuleService";
import { WorkScopeRuleService } from "../csvRules/services/WorkScopeRuleService";
import { CsvRecordService } from "./services";
import { replaceByArcRule, replaceByEngineModelRule, replaceByPartNumberRule, replaceByWorkScopeRule } from "../csvRules/utils";
import type { BunRequest } from "bun";
import moment from "moment-timezone";

export class CsvRecordController {
    private csvRecordService: CsvRecordService;
    private arcRuleService: ArcRuleService;
    private engineModelRuleService: EngineModelRuleService;
    private workScopeRuleService: WorkScopeRuleService;
    private partNumberRulesService: PartNumberRuleService;

    constructor() {
        this.csvRecordService = new CsvRecordService();
        this.arcRuleService = new ArcRuleService();
        this.engineModelRuleService = new EngineModelRuleService();
        this.workScopeRuleService = new WorkScopeRuleService();
        this.partNumberRulesService = new PartNumberRuleService();
    }

    async exportCsvRecords(req: BunRequest): Promise<Response> {
        try {
            // Parse request body for document IDs
            const body = await req.json();
            const documentIds = body as string[] || [];
            
            const records = await this.csvRecordService.getCsvRecordsOfNoBatchNumber(documentIds);
            
            // Enable here after next version
            const arcRulesReq = this.arcRuleService.getArcRules(null, null);
            const engineModelRulesReq = this.engineModelRuleService.getEngineModelRules(null, null);
            const workScopeRulesReq = this.workScopeRuleService.getWorkScopeRules(null, null);
            const partNumberRulesReq = this.partNumberRulesService.getPartNumberRules(null, null);
            
            const [arcRulesRes, engineModelRulesRes, workScopeRulesRes, partNumberRulesRes] = await Promise.all([
                arcRulesReq,
                engineModelRulesReq,
                workScopeRulesReq,
                partNumberRulesReq
            ]);

            // Extract rules arrays from responses
            const arcRules = arcRulesRes.arcRules || [];
            const engineModelRules = engineModelRulesRes.engineModelRules || [];
            const workScopeRules = workScopeRulesRes.workScopeRules || [];
            const partNumberRules = partNumberRulesRes.partNumberRules || [];
            
            // Apply all rules to each record
            records.map(record => {
                // Apply each type of rule
                for (const rule of arcRules) {
                    replaceByArcRule(rule, record);
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

                record.CO_PREFIX = `${record.PRODUCT_CODE}-${record.CUST_CODE}`;
                // @ts-ignore
                record.part_rcvd_date = moment(record.part_rcvd_date).tz("Asia/Taipei").format("DDMMYYYY");
                // @ts-ignore
                record.order_date = moment(record.order_date).tz("Asia/Taipei").format("DDMMYYYY");
            });

            return Response.json(records);
        } catch (error) {
            console.error("Error exporting CSV records:", error);
            return Response.json({ 
                success: false, 
                message: "Failed to export CSV records" 
            }, { status: 500 });
        }
    }
}
