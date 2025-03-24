import { ArcRuleService } from "../services/ArcRuleService";

export class ArcRuleController {
  private arcRuleService: ArcRuleService;

  constructor() {
    this.arcRuleService = new ArcRuleService();
  }

  async getArcRuleById(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Arc Rule ID is required" },
          { status: 400 }
        );
      }

      const arcRule = await this.arcRuleService.getArcRuleById(id);

      if (!arcRule) {
        return Response.json({ error: "Arc Rule not found" }, { status: 404 });
      }

      return Response.json(arcRule);
    } catch (error) {
      console.error("Get arc rule error:", error);
      return Response.json(
        { error: "Failed to get arc rule" },
        { status: 500 }
      );
    }
  }

  async getArcRules(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
      
      // Validate page and limit
      if (isNaN(page) || page < 1) {
        return Response.json(
          { error: "Invalid page parameter" },
          { status: 400 }
        );
      }
      
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
        return Response.json(
          { error: "Invalid pageSize parameter. Must be between 1 and 100" },
          { status: 400 }
        );
      }
      
      const result = await this.arcRuleService.getArcRules(page, pageSize);
      
      return Response.json({
        data: result.arcRules,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize)
        }
      });
    } catch (error) {
      console.error("Get arc rules error:", error);
      return Response.json(
        { error: "Failed to get arc rules" },
        { status: 500 }
      );
    }
  }

  async createArcRule(req: Request): Promise<Response> {
    try {
      const arcRuleData = await req.json();

      if (!arcRuleData.arc_appearance || !arcRuleData.result_display) {
        return Response.json(
          { error: "Arc appearance and result display are required" },
          { status: 400 }
        );
      }

      const arcRule = await this.arcRuleService.createArcRule({
        arc_appearance: arcRuleData.arc_appearance,
        result_display: arcRuleData.result_display
      });

      if (!arcRule) {
        return Response.json(
          { error: "Failed to create arc rule" },
          { status: 400 }
        );
      }

      return Response.json(arcRule, { status: 201 });
    } catch (error) {
      console.error("Create arc rule error:", error);
      return Response.json(
        { error: "Failed to create arc rule" },
        { status: 500 }
      );
    }
  }

  async updateArcRule(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Arc Rule ID is required" },
          { status: 400 }
        );
      }

      const arcRuleData = await req.json();
      const updatedArcRule = await this.arcRuleService.updateArcRule(
        id,
        arcRuleData
      );

      if (!updatedArcRule) {
        return Response.json(
          { error: "Arc rule not found or update failed" },
          { status: 404 }
        );
      }

      return Response.json(updatedArcRule);
    } catch (error) {
      console.error("Update arc rule error:", error);
      return Response.json(
        { error: "Failed to update arc rule" },
        { status: 500 }
      );
    }
  }

  async deleteArcRule(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Arc Rule ID is required" },
          { status: 400 }
        );
      }

      const success = await this.arcRuleService.deleteArcRule(id);

      if (!success) {
        return Response.json(
          { error: "Arc rule not found or delete failed" },
          { status: 404 }
        );
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete arc rule error:", error);
      return Response.json(
        { error: "Failed to delete arc rule" },
        { status: 500 }
      );
    }
  }
} 