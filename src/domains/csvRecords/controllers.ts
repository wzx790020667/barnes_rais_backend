import { ArcRuleService } from "../csvRules/services/ArcRuleService";
import { EngineModelRuleService } from "../csvRules/services/EngineModelRuleService";
import { PartNumberRuleService } from "../csvRules/services/PartNumberRuleService";
import { WorkScopeRuleService } from "../csvRules/services/WorkScopeRuleService";
import { CsvRecordService } from "./services";

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

    async exportCsvRecords(req: Request): Promise<Response> {
        try {
            // Parse request body for document IDs
            const body = await req.json();
            const documentIds = body as string[] || [];
            
            const records = await this.csvRecordService.getCsvRecordsOfNoBatchNumber(documentIds);

            const arcRulesReq = this.arcRuleService.getArcRules();
            const engineModelRulesReq = this.engineModelRuleService.getEngineModelRules();
            const workScopeRulesReq = this.workScopeRuleService.getWorkScopeRules();
            const partNumberRulesReq = this.partNumberRulesService.getPartNumberRules();
            
            const [arcRules, engineModelRules, workScopeRules, partNumberRules] = await Promise.all([
                arcRulesReq,
                engineModelRulesReq,
                workScopeRulesReq,
                partNumberRulesReq
            ]);
            

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
