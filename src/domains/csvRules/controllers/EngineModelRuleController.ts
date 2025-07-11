import { EngineModelRuleService } from "../services/EngineModelRuleService";

export class EngineModelRuleController {
  private engineModelRuleService: EngineModelRuleService;

  constructor() {
    this.engineModelRuleService = new EngineModelRuleService();
  }

  async getEngineModelRuleById(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Engine Model Rule ID is required" },
          { status: 400 }
        );
      }

      const engineModelRule = await this.engineModelRuleService.getEngineModelRuleById(id);

      if (!engineModelRule) {
        return Response.json({ error: "Engine Model Rule not found" }, { status: 404 });
      }

      return Response.json(engineModelRule);
    } catch (error) {
      console.error("Get engine model rule error:", error);
      return Response.json(
        { error: "Failed to get engine model rule" },
        { status: 500 }
      );
    }
  }

  async getEngineModelRules(req: Request): Promise<Response> {
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
      
      const result = await this.engineModelRuleService.getEngineModelRules(page, pageSize);
      
      return Response.json({
        data: result.engineModelRules,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize)
        }
      });
    } catch (error) {
      console.error("Get engine model rules error:", error);
      return Response.json(
        { error: "Failed to get engine model rules" },
        { status: 500 }
      );
    }
  }

  async searchEngineModelRules(req: Request): Promise<Response> {
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
      
      const result = await this.engineModelRuleService.searchEngineModelRules(page, pageSize, query.trim());
      
      return Response.json({
        data: result.engineModelRules,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize)
        }
      });
    } catch (error) {
      console.error("Search engine model rules error:", error);
      return Response.json(
        { error: "Failed to search engine model rules" },
        { status: 500 }
      );
    }
  }

  async createEngineModelRule(req: Request): Promise<Response> {
    try {
      const engineModelRuleData = await req.json();

      if (!engineModelRuleData.engine_model_title || 
          !engineModelRuleData.common_prefix || 
          !engineModelRuleData.result_display) {
        return Response.json(
          { error: "Engine model title, common prefix, and result display are required" },
          { status: 400 }
        );
      }

      const engineModelRule = await this.engineModelRuleService.createEngineModelRule({
        engine_model_title: engineModelRuleData.engine_model_title,
        common_prefix: engineModelRuleData.common_prefix,
        result_display: engineModelRuleData.result_display
      });

      if (!engineModelRule) {
        return Response.json(
          { error: "Failed to create engine model rule" },
          { status: 400 }
        );
      }

      return Response.json(engineModelRule, { status: 201 });
    } catch (error) {
      console.error("Create engine model rule error:", error);
      return Response.json(
        { error: "Failed to create engine model rule" },
        { status: 500 }
      );
    }
  }

  async updateEngineModelRule(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Engine Model Rule ID is required" },
          { status: 400 }
        );
      }

      const engineModelRuleData = await req.json();
      const updatedEngineModelRule = await this.engineModelRuleService.updateEngineModelRule(
        id,
        engineModelRuleData
      );

      if (!updatedEngineModelRule) {
        return Response.json(
          { error: "Engine model rule not found or update failed" },
          { status: 404 }
        );
      }

      return Response.json(updatedEngineModelRule);
    } catch (error) {
      console.error("Update engine model rule error:", error);
      return Response.json(
        { error: "Failed to update engine model rule" },
        { status: 500 }
      );
    }
  }

  async deleteEngineModelRule(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Engine Model Rule ID is required" },
          { status: 400 }
        );
      }

      const success = await this.engineModelRuleService.deleteEngineModelRule(id);

      if (!success) {
        return Response.json(
          { error: "Engine model rule not found or delete failed" },
          { status: 404 }
        );
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete engine model rule error:", error);
      return Response.json(
        { error: "Failed to delete engine model rule" },
        { status: 500 }
      );
    }
  }

  async getAllEngineModelRules(req: Request): Promise<Response> {
    try {
      const engineModelRules = await this.engineModelRuleService.getAllEngineModelRules();
      return Response.json({ data: engineModelRules });
    } catch (error) {
      console.error("Error getting all engine model rules:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}