import { AllRuleService } from "../services/AllRuleService";

export class AllRuleController {
  private allRuleService: AllRuleService;

  constructor() {
    this.allRuleService = new AllRuleService();
  }

  /**
   * GET endpoint to fetch all rules from all 4 rule tables
   * @param req - Request object
   * @returns Response containing all rules data
   */
  async getAllRules(req: Request): Promise<Response> {
    try {
      const allRules = await this.allRuleService.getAllRules();

      return Response.json({
        success: true,
        data: allRules,
        message: "All rules fetched successfully"
      });
    } catch (error) {
      console.error("Get all rules error:", error);
      return Response.json(
        { 
          success: false,
          error: "Failed to fetch all rules",
          message: error instanceof Error ? error.message : "Unknown error occurred"
        },
        { status: 500 }
      );
    }
  }
}