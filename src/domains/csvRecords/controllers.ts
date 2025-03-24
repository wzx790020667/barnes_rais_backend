import { CsvRecordService } from "./services";

export class CsvRecordController {
    private csvRecordService: CsvRecordService;

    constructor() {
        this.csvRecordService = new CsvRecordService();
    }

    async exportCsvRecords(req: Request): Promise<Response> {
        try {
            // Parse request body for document IDs
            const body = await req.json();
            const documentIds = body as string[] || [];
            
            const records = await this.csvRecordService.getCsvRecordsOfNoBatchNumber(documentIds);
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
