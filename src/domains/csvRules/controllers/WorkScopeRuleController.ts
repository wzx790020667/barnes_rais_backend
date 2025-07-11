import { WorkScopeRuleService } from "../services/WorkScopeRuleService";

export class WorkScopeRuleController {
  private workScopeRuleService: WorkScopeRuleService;

  constructor() {
    this.workScopeRuleService = new WorkScopeRuleService();
  }

  async getWorkScopeRuleById(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Work Scope Rule ID is required" },
          { status: 400 }
        );
      }

      const workScopeRule = await this.workScopeRuleService.getWorkScopeRuleById(id);

      if (!workScopeRule) {
        return Response.json({ error: "Work Scope Rule not found" }, { status: 404 });
      }

      return Response.json(workScopeRule);
    } catch (error) {
      console.error("Get work scope rule error:", error);
      return Response.json(
        { error: "Failed to get work scope rule" },
        { status: 500 }
      );
    }
  }

  async getWorkScopeRules(req: Request): Promise<Response> {
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
      
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 200) {
        return Response.json(
          { error: "Invalid pageSize parameter. Must be between 1 and 200" },
          { status: 400 }
        );
      }
      
      const result = await this.workScopeRuleService.getWorkScopeRules(page, pageSize);
      
      return Response.json({
        data: result.workScopeRules,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize)
        }
      });
    } catch (error) {
      console.error("Get work scope rules error:", error);
      return Response.json(
        { error: "Failed to get work scope rules" },
        { status: 500 }
      );
    }
  }

  async searchWorkScopeRules(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
      const query = url.searchParams.get("query") || "";
      
      // Validate page and limit
      if (isNaN(page) || page < 1) {
        return Response.json(
          { error: "Invalid page parameter" },
          { status: 400 }
        );
      }
      
      if (isNaN(pageSize) || pageSize < 1 || pageSize > 200) {
        return Response.json(
          { error: "Invalid pageSize parameter. Must be between 1 and 200" },
          { status: 400 }
        );
      }
      
      if (!query.trim()) {
        return Response.json(
          { error: "Search query is required" },
          { status: 400 }
        );
      }
      
      const result = await this.workScopeRuleService.searchWorkScopeRules(page, pageSize, query.trim());
      
      return Response.json({
        data: result.workScopeRules,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize)
        }
      });
    } catch (error) {
      console.error("Search work scope rules error:", error);
      return Response.json(
        { error: "Failed to search work scope rules" },
        { status: 500 }
      );
    }
  }

  async createWorkScopeRule(req: Request): Promise<Response> {
    try {
      const workScopeRuleData = await req.json();

      if (!workScopeRuleData.overhaul_keywords || !workScopeRuleData.result_display) {
        return Response.json(
          { error: "Overhaul keywords and result display are required" },
          { status: 400 }
        );
      }

      const workScopeRule = await this.workScopeRuleService.createWorkScopeRule({
        overhaul_keywords: workScopeRuleData.overhaul_keywords,
        result_display: workScopeRuleData.result_display
      });

      if (!workScopeRule) {
        return Response.json(
          { error: "Failed to create work scope rule" },
          { status: 400 }
        );
      }

      return Response.json(workScopeRule, { status: 201 });
    } catch (error) {
      console.error("Create work scope rule error:", error);
      return Response.json(
        { error: "Failed to create work scope rule" },
        { status: 500 }
      );
    }
  }

  async updateWorkScopeRule(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Work Scope Rule ID is required" },
          { status: 400 }
        );
      }

      const workScopeRuleData = await req.json();
      const updatedWorkScopeRule = await this.workScopeRuleService.updateWorkScopeRule(
        id,
        workScopeRuleData
      );

      if (!updatedWorkScopeRule) {
        return Response.json(
          { error: "Work scope rule not found or update failed" },
          { status: 404 }
        );
      }

      return Response.json(updatedWorkScopeRule);
    } catch (error) {
      console.error("Update work scope rule error:", error);
      return Response.json(
        { error: "Failed to update work scope rule" },
        { status: 500 }
      );
    }
  }

  async deleteWorkScopeRule(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Work Scope Rule ID is required" },
          { status: 400 }
        );
      }

      const success = await this.workScopeRuleService.deleteWorkScopeRule(id);

      if (!success) {
        return Response.json(
          { error: "Work scope rule not found or delete failed" },
          { status: 404 }
        );
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete work scope rule error:", error);
      return Response.json(
        { error: "Failed to delete work scope rule" },
        { status: 500 }
      );
    }
  }

  async getAllWorkScopeRules(req: Request): Promise<Response> {
    try {
      const workScopeRules = await this.workScopeRuleService.getAllWorkScopeRules();
      return Response.json({ data: workScopeRules });
    } catch (error) {
      console.error("Error getting all work scope rules:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}