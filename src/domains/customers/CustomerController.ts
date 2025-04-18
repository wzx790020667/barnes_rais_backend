import type { BunRequest } from "bun";
import { generateCustomerInfoHash } from "../../lib/utils";
import { CustomerService } from "./CustomerService";
import { z } from "zod";

// Customer schema validation based on the actual database schema
const createCustomerSchema = z.object({
  customer_name: z.string(),
  customer_code: z.string(),
  co_code: z.string().optional(),
  document_type: z.string(),
  file_format: z.string(),
  customer_info_hash: z.string().optional()
});

// For updates, all fields are optional
const updateCustomerSchema = createCustomerSchema.partial();

const getCustomerByHashSchema = z.object({
  customer_name: z.string(),
  co_code: z.string(),
  file_format: z.string(),
  document_type: z.string()
});

const getDocumentTypesByCustomerSchema = z.object({
  customer_name: z.string(),
  co_code: z.string(),
  file_format: z.string(),
});

const findEndUserCustomerNumberByNameSchema = z.object({
  endUserCustomerName: z.string(),
});

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  async getCustomerById(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Customer ID is required" },
          { status: 400 }
        );
      }

      const customer = await this.customerService.getCustomerById(id);

      if (!customer) {
        return Response.json({ error: "Customer not found" }, { status: 404 });
      }

      return Response.json(customer);
    } catch (error) {
      console.error("Get customer error:", error);
      return Response.json(
        { error: "Failed to get customer" },
        { status: 500 }
      );
    }
  }

  async getCustomers(req: Request): Promise<Response> {
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
      
      const result = await this.customerService.getCustomers(page, pageSize);
      
      return Response.json({
        data: result.customers,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize)
        }
      });
    } catch (error) {
      console.error("Get customers error:", error);
      return Response.json(
        { error: "Failed to get customers" },
        { status: 500 }
      );
    }
  }

  async createCustomer(req: Request): Promise<Response> {
    try {
      const customerData = await req.json();

      // Validate with Zod schema
      const result = createCustomerSchema.safeParse(customerData);
      
      if (!result.success) {
        return Response.json(
          { error: "Invalid customer data", details: result.error.format() },
          { status: 400 }
        );
      }
      
      const validatedData = result.data;

      const customerInfoHash = generateCustomerInfoHash(
        validatedData.customer_name,
        validatedData.co_code,
        validatedData.file_format,
        validatedData.document_type
      );

      validatedData.customer_info_hash = customerInfoHash;
      
      // Pass validated data to service
      const customer = await this.customerService.createCustomer(validatedData);

      if (!customer) {
        return Response.json(
          { error: "Failed to create customer" },
          { status: 400 }
        );
      }

      return Response.json(customer, { status: 201 });
    } catch (error) {
      console.error("Create customer error:", error);
      return Response.json(
        { error: "Failed to create customer" },
        { status: 500 }
      );
    }
  }

  async updateCustomer(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Customer ID is required" },
          { status: 400 }
        );
      }

      const customerData = await req.json();
      
      // Validate with Zod schema
      const result = updateCustomerSchema.safeParse(customerData);
      
      if (!result.success) {
        return Response.json(
          { error: "Invalid customer data", details: result.error.format() },
          { status: 400 }
        );
      }
      
      const validatedData = result.data;

      const customerInfoHash = generateCustomerInfoHash(
        validatedData.customer_name || "",
        validatedData.co_code || null,
        validatedData.file_format || "",
        validatedData.document_type || ""
      );

      validatedData.customer_info_hash = customerInfoHash;
      const updatedCustomer = await this.customerService.updateCustomer(
        id,
        validatedData
      );

      if (!updatedCustomer) {
        return Response.json(
          { error: "Customer not found or update failed" },
          { status: 404 }
        );
      }

      return Response.json(updatedCustomer);
    } catch (error) {
      console.error("Update customer error:", error);
      return Response.json(
        { error: "Failed to update customer" },
        { status: 500 }
      );
    }
  }

  async deleteCustomer(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split("/").pop();

      if (!id) {
        return Response.json(
          { error: "Customer ID is required" },
          { status: 400 }
        );
      }

      const success = await this.customerService.deleteCustomer(id);

      if (!success) {
        return Response.json(
          { error: "Customer not found or delete failed" },
          { status: 404 }
        );
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Delete customer error:", error);
      return Response.json(
        { error: "Failed to delete customer" },
        { status: 500 }
      );
    }
  }

  async searchCustomers(req: Request): Promise<Response> {
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
      
      const result = await this.customerService.searchCustomers(query, page, pageSize);
      
      return Response.json({
        data: result.customersNames,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize)
        }
      });
    } catch (error) {
      console.error("Search customers error:", error);
      return Response.json(
        { error: "Failed to search customers" },
        { status: 500 }
      );
    }
  }

  async getCustomerByName(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const customerName = url.searchParams.get("name");

      if (!customerName) {
        return Response.json(
          { error: "Customer name is required" },
          { status: 400 }
        );
      }

      const customer = await this.customerService.getCustomerByName(customerName);

      if (!customer) {
        return Response.json({ error: "Customer not found" }, { status: 404 });
      }

      return Response.json(customer);
    } catch (error) {
      console.error("Get customer by name error:", error);
      return Response.json(
        { error: "Failed to get customer by name" },
        { status: 500 }
      );
    }
  }

  async getFileFormatsByCustomerName(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const customerName = url.searchParams.get("name");

      if (!customerName) {
        return Response.json(
          { error: "Customer name is required" },
          { status: 400 }
        );
      }

      const formats = await this.customerService.getFileFormatsByCustomerName(customerName);

      return Response.json(formats);
    } catch (error) {
      console.error("Get file formats error:", error);
      return Response.json(
        { error: "Failed to get file formats" },
        { status: 500 }
      );
    }
  }

  async getCustomerByHash(req: Request): Promise<Response> {
    try {
      const customerData = await req.json();

      // Validate with Zod schema
      const result = getCustomerByHashSchema.safeParse(customerData);

      if (!result.success) {
        return Response.json(
          { error: "Invalid customer data", details: result.error.format() },
          { status: 400 }
        );
      }

      const customer = await this.customerService.getCustomerByHash(result.data);

      if (!customer) {
        return Response.json({ error: "Customer not found" }, { status: 404 });
      }

      return Response.json(customer);
    } catch (error) {
      console.error("Get customer by hash error:", error);
      return Response.json(
        { error: "Failed to get customer by hash" },
        { status: 500 }
      );
    }
  }

  async getDocumentTypesByCustomer(req: BunRequest): Promise<any> {
    try {
      const customerData = await req.json();

      const result = getDocumentTypesByCustomerSchema.safeParse(customerData);
      
      if (!result.success) {
        return Response.json(
          { error: "Invalid customer data", details: result.error.format() },
          { status: 400 }
        );
      }
      
      const documentTypes = await this.customerService.getDocumentTypesByCustomer(result.data);

      return Response.json(documentTypes);
    } catch (error) {
      console.error("Get document types by customer error:", error);
      return Response.json(
        { error: "Failed to get document types by customer" },
        { status: 500 }
      );
    }
  }

  async findEndUserCustomerNumberByName(req: Request): Promise<Response> {
    try {
      const customerData = await req.json();
      const result = findEndUserCustomerNumberByNameSchema.safeParse(customerData);

      if (!result.success) {
        return Response.json(
          { error: "Invalid customer data", details: result.error.format() },
          { status: 400 }
        );
      }

      const endUserCustomerName = result.data.endUserCustomerName.trim();
      const customerCode = await this.customerService.findEndUserCustomerNumberByName(endUserCustomerName);

      return Response.json(customerCode);
    } catch (error) {
      console.error("Find end user customer number error:", error);
      return Response.json({ error: "Failed to find end user customer number" }, { status: 500 });
    }
  }
}
