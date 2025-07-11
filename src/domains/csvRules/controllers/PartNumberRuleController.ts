import { PartNumberRuleService } from "../services/PartNumberRuleService";

export class PartNumberRuleController {
  private partNumberRuleService: PartNumberRuleService;

  constructor() {
    this.partNumberRuleService = new PartNumberRuleService();
  }

  async getPartNumberRuleById(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Part Number Rule ID is required" },
          { status: 400 }
        );
      }

      const partNumberRule =
        await this.partNumberRuleService.getPartNumberRuleById(id);

      if (!partNumberRule) {
        return Response.json(
          { error: "Part Number Rule not found" },
          { status: 404 }
        );
      }

      return Response.json(partNumberRule);
    } catch (error) {
      console.error("Get part number rule error:", error);
      return Response.json(
        { error: "Failed to get part number rule" },
        { status: 500 }
      );
    }
  }

  async getPartNumberRules(req: Request): Promise<Response> {
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

      const result = await this.partNumberRuleService.getPartNumberRules(
        page,
        pageSize
      );

      return Response.json({
        data: result.partNumberRules,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        },
      });
    } catch (error) {
      console.error("Get part number rules error:", error);
      return Response.json(
        { error: "Failed to get part number rules" },
        { status: 500 }
      );
    }
  }

  async searchPartNumberRules(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
      const query = url.searchParams.get("query") || "";

      if (page < 1 || pageSize < 1 || pageSize > 200) {
        return Response.json(
          { error: "Invalid page or pageSize parameters" },
          { status: 400 }
        );
      }

      if (!query.trim()) {
        return Response.json(
          { error: "Search query is required" },
          { status: 400 }
        );
      }

      const result = await this.partNumberRuleService.searchPartNumberRules(
        page,
        pageSize,
        query
      );

      return Response.json({
        data: result.partNumberRules,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        },
      });
    } catch (error) {
      console.error("Search part number rules error:", error);
      return Response.json(
        { error: "Failed to search part number rules" },
        { status: 500 }
      );
    }
  }

  async createPartNumberRule(req: Request): Promise<Response> {
    try {
      const partNumberRuleData = await req.json();

      if (!partNumberRuleData.part_number || !partNumberRuleData.product_code) {
        return Response.json(
          { error: "Part number and product code are required" },
          { status: 400 }
        );
      }

      const partNumberRule =
        await this.partNumberRuleService.createPartNumberRule({
          part_number: partNumberRuleData.part_number,
          product_code: partNumberRuleData.product_code,
        });

      if (!partNumberRule) {
        return Response.json(
          { error: "Failed to create part number rule" },
          { status: 400 }
        );
      }

      return Response.json(partNumberRule, { status: 201 });
    } catch (error) {
      console.error("Create part number rule error:", error);
      return Response.json(
        { error: "Failed to create part number rule" },
        { status: 500 }
      );
    }
  }

  async updatePartNumberRule(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Part Number Rule ID is required" },
          { status: 400 }
        );
      }

      const partNumberRuleData = await req.json();
      const updatedPartNumberRule =
        await this.partNumberRuleService.updatePartNumberRule(
          id,
          partNumberRuleData
        );

      if (!updatedPartNumberRule) {
        return Response.json(
          { error: "Part number rule not found or update failed" },
          { status: 404 }
        );
      }

      return Response.json(updatedPartNumberRule);
    } catch (error) {
      console.error("Update part number rule error:", error);
      return Response.json(
        { error: "Failed to update part number rule" },
        { status: 500 }
      );
    }
  }

  async deletePartNumberRule(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Part Number Rule ID is required" },
          { status: 400 }
        );
      }

      const success = await this.partNumberRuleService.deletePartNumberRule(id);

      if (!success) {
        return Response.json(
          { error: "Part number rule not found or delete failed" },
          { status: 404 }
        );
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete part number rule error:", error);
      return Response.json(
        { error: "Failed to delete part number rule" },
        { status: 500 }
      );
    }
  }

  async getAllPartNumberRules(req: Request): Promise<Response> {
    try {
      const partNumberRules = await this.partNumberRuleService.getAllPartNumberRules();
      return Response.json({ data: partNumberRules });
    } catch (error) {
      console.error("Error getting all part number rules:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}
