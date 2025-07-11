import type { BunRequest } from "bun";
import { NewCustomerService } from "./NewCustomerService";
import { z } from "zod";

// NewCustomer schema validation based on the actual database schema
const createNewCustomerSchema = z.object({
  customer_name: z.string(),
  customer_code: z.string(),
  co_code: z.string(),
});

// For updates, all fields are optional
const updateNewCustomerSchema = createNewCustomerSchema.partial();

const findCustomerNumbersByCoCodeSchema = z.object({
  co_code: z.string(),
});

export class NewCustomerController {
  private newCustomerService: NewCustomerService;

  constructor() {
    this.newCustomerService = new NewCustomerService();
  }

  async getNewCustomerById(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "New Customer ID is required" },
          { status: 400 }
        );
      }

      const newCustomer = await this.newCustomerService.getNewCustomerById(id);

      if (!newCustomer) {
        return Response.json(
          { error: "New Customer not found" },
          { status: 404 }
        );
      }

      return Response.json(newCustomer);
    } catch (error) {
      console.error("Error getting new customer by ID:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async getNewCustomers(req: Request): Promise<Response> {
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

      const result = await this.newCustomerService.getNewCustomers(
        page,
        pageSize
      );

      return Response.json({
        data: result.newCustomers,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize),
        },
      });
    } catch (error) {
      console.error("Error getting new customers:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async createNewCustomer(req: Request): Promise<Response> {
    try {
      const newCustomerData = await req.json();

      // Validate with Zod schema
      const result = createNewCustomerSchema.safeParse(newCustomerData);

      if (!result.success) {
        return Response.json(
          {
            error: "Invalid new customer data",
            details: result.error.format(),
          },
          { status: 400 }
        );
      }

      const validatedData = result.data;

      const newCustomer = await this.newCustomerService.createNewCustomer(
        validatedData
      );

      if (newCustomer === "DUPLICATED_NEW_CUSTOMER") {
        return Response.json(
          { error: "New Customer with this information already exists" },
          { status: 409 }
        );
      }

      if (!newCustomer) {
        return Response.json(
          { error: "Failed to create new customer" },
          { status: 500 }
        );
      }

      return Response.json(newCustomer, { status: 201 });
    } catch (error) {
      console.error("Error creating new customer:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async updateNewCustomer(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "New Customer ID is required" },
          { status: 400 }
        );
      }

      const newCustomerData = await req.json();

      // Validate with Zod schema
      const result = updateNewCustomerSchema.safeParse(newCustomerData);

      if (!result.success) {
        return Response.json(
          {
            error: "Invalid new customer data",
            details: result.error.format(),
          },
          { status: 400 }
        );
      }

      const validatedData = result.data;

      const updatedNewCustomer =
        await this.newCustomerService.updateNewCustomer(id, validatedData);

      if (updatedNewCustomer === "DUPLICATED_NEW_CUSTOMER") {
        return Response.json(
          { error: "New Customer with this information already exists" },
          { status: 409 }
        );
      }

      if (!updatedNewCustomer) {
        return Response.json(
          { error: "New Customer not found" },
          { status: 404 }
        );
      }

      return Response.json(updatedNewCustomer);
    } catch (error) {
      console.error("Error updating new customer:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async deleteNewCustomer(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "New Customer ID is required" },
          { status: 400 }
        );
      }

      const deleted = await this.newCustomerService.deleteNewCustomer(id);

      if (!deleted) {
        return Response.json(
          { error: "New Customer not found" },
          { status: 404 }
        );
      }

      return Response.json({ message: "New Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting new customer:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async searchNewCustomers(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const query = url.searchParams.get("query") || "";
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

      // Validate page and pageSize
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

      const result = await this.newCustomerService.searchNewCustomers(
        query,
        page,
        pageSize
      );

      return Response.json({
        data: result.newCustomers,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize),
        },
        query,
      });
    } catch (error) {
      console.error("Error searching new customers:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async getNewCustomerByName(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const customerName = url.searchParams.get("name");

      if (!customerName) {
        return Response.json(
          { error: "Customer name is required" },
          { status: 400 }
        );
      }

      const newCustomer = await this.newCustomerService.getNewCustomerByName(
        customerName
      );

      if (!newCustomer) {
        return Response.json(
          { error: "New Customer not found" },
          { status: 404 }
        );
      }

      return Response.json(newCustomer);
    } catch (error) {
      console.error("Error getting new customer by name:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async getAllNewCustomerNames(req: Request): Promise<Response> {
    try {
      const names = await this.newCustomerService.getAllNewCustomerNames();
      return Response.json({ data: names });
    } catch (error) {
      console.error("Error getting all new customer names:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async getAllNewCustomers(req: Request): Promise<Response> {
    try {
      const customers = await this.newCustomerService.getAllNewCustomers();
      return Response.json({ data: customers });
    } catch (error) {
      console.error("Error getting all new customers:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async findCustomerNumbersByCoCode(req: Request): Promise<Response> {
    try {
      const customerData = await req.json();
      const result = findCustomerNumbersByCoCodeSchema.safeParse(customerData);

      if (!result.success) {
        return Response.json(
          { error: "Invalid customer data", details: result.error.format() },
          { status: 400 }
        );
      }

      const coCode = result.data.co_code.trim();
      const customerNumbers =
        await this.newCustomerService.findCustomerNumbersByCoCode(coCode);

      return Response.json(customerNumbers);
    } catch (error) {
      console.error("Find new customer numbers by co_code error:", error);
      return Response.json(
        { error: "Failed to find customer numbers" },
        { status: 500 }
      );
    }
  }
}
