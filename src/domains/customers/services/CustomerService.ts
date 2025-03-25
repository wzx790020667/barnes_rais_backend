import type { Customer } from "../models/Customer";
import { supabase, db, drizzleDb } from "../../../lib/db";
import { customers, documents } from "../../../db/schema";
import { countApprovedDocumentsForCustomers } from "../utils";
import { generateCustomerInfoHash } from "../../../lib/utils";
import { count, eq, inArray, sql } from "drizzle-orm";

export class CustomerService {
  async getCustomerById(id: string): Promise<Customer | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        return data as Customer;
      })
      .then((result) => result.data || null);
  }

  async getCustomers(page: number = 1, pageSize: number = 10): Promise<{ customers: Customer[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;
        
        // Get total count first
        const { data: countData, error: countError } = await supabase
          .from("customers")
          .select("count", { count: "exact" });
                    
        if (countError) throw countError;
        
        // Get paginated results
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .range(offset, offset + pageSize - 1)
          .order("created_at", { ascending: false });
          
        if (error) throw error;

        if (!data || data.length === 0) {
          return { customers: [], total: 0 };
        }
        
        // Generate customer_info_hash for each customer if not already present
        const customersWithHash = data.map(customer => {
          if (!customer.customer_info_hash) {
            customer.customer_info_hash = generateCustomerInfoHash(
              customer.customer_name,
              customer.co_code,
              customer.file_format
            );
          }
          return customer;
        });
        
        // Extract hashes to query
        const customerHashes = customersWithHash.map(customer => customer.customer_info_hash).filter(Boolean);
        
        // Use Drizzle to count documents by hash
        const documentCounts = await drizzleDb
          .select({
            hash: documents.customer_info_hash,
            count: count()
          })
          .from(documents)
          .where(
            eq(documents.status, 'approved')
          )
          .groupBy(documents.customer_info_hash);
        
        // Create a mapping of hash to count - filter to only include our customer hashes
        const hashToCountMap: Record<string, number> = {};
        documentCounts.forEach(item => {
          if (item.hash && customerHashes.includes(item.hash)) {
            hashToCountMap[item.hash] = Number(item.count);
          }
        });
        
        // Assign the finished_doc count to each customer
        const customersWithFinishedDocs = customersWithHash.map(customer => ({
          ...customer,
          finished_doc: customer.customer_info_hash ? 
            (hashToCountMap[customer.customer_info_hash] || 0) : 0
        }));
        
        return { 
          customers: customersWithFinishedDocs as Customer[], 
          total: countData?.[0]?.count || 0 
        };
      })
      .then((result) => result.data || { customers: [], total: 0 });
  }

  async createCustomer(
    customer: Omit<Customer, "id" | "createdAt" | "updatedAt">
  ): Promise<Customer | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .insert(customer)
          .select()
          .single();

        if (error) throw error;
        return data as Customer;
      })
      .then((result) => result.data || null);
  }

  async updateCustomer(
    id: string,
    customerData: Partial<Customer>
  ): Promise<Customer | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data as Customer;
      })
      .then((result) => result.data || null);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return db
      .query(async () => {
        const { error } = await supabase
          .from("customers")
          .delete()
          .eq("id", id);

        if (error) throw error;
        return true;
      })
      .then((result) => result.error ? false : true);
  }

  async searchCustomers(query: string, limit: number = 5): Promise<string[]> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .ilike("customer_name", `%${query}%`)
          .limit(limit);

        if (error) throw error;
        return data.map(customer => customer.customer_name) as string[];
      })
      .then((result) => result.data || []);
  }

  async getCustomerByName(customerName: string): Promise<Customer | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .ilike("customer_name", `%${customerName}%`)
          .limit(1)
          .single();

        if (error) throw error;
        return data as Customer;
      })
      .then((result) => result.data || null);
  }

  async getFileFormatsByCustomerName(customerName: string): Promise<string[]> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .select("file_format")
          .ilike("customer_name", `%${customerName}%`);

        if (error) throw error;
        
        // Extract unique file formats
        const fileFormats = data.map(item => item.file_format);
        // Remove duplicates
        return [...new Set(fileFormats)];
      })
      .then((result) => result.data || []);
  }
}
