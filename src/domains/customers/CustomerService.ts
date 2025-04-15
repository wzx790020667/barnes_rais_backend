import { supabase, db, drizzleDb } from "../../lib";
import { documents, type Customer } from "../../db/schema";
import { generateCustomerInfoHash } from "../../lib/utils";
import { count, eq, and } from "drizzle-orm";

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
        if (!data) return null;
        
        // Create a customer object from the data
        const customer = data as Customer;
        
        // Generate customer_info_hash if not present in database
        let customerInfoHash = data.customer_info_hash;
        if (!customerInfoHash) {
          customerInfoHash = generateCustomerInfoHash(
            data.customer_name,
            data.co_code,
            data.file_format,
            data.document_type
          );
        }
        
        // Count finished documents
        if (customerInfoHash) {
          const documentCount = await drizzleDb
            .select({
              count: count()
            })
            .from(documents)
            .where(and(
              eq(documents.status, 'approved'),
              eq(documents.customer_info_hash, customerInfoHash),
              eq(documents.from_full_ard, false)
            ));
          
          // @ts-ignore
          customer.finished_doc = Number(documentCount[0]?.count || 0);
        } else {
          // @ts-ignore
          customer.finished_doc = 0;
        }
        
        return customer;
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
          .order("customer_name", { ascending: true });

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
              customer.file_format,
              customer.document_type
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
            and(
              eq(documents.status, 'approved'),
              eq(documents.from_full_ard, false)
            )
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
    customer: Partial<Customer>
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

  async searchCustomers(query: string, page: number = 1, pageSize: number = 10): Promise<{ customersNames: string[]; total: number }> {
    return db
      .query(async () => {
        // Get total count first
        const countQuery = supabase.from("customers").select("*", { count: "exact", head: true });
        // Only apply filter if query is not empty
        const filteredCountQuery = query ? countQuery.ilike("customer_name", `%${query}%`) : countQuery;
        const { count: total, error: countError } = await filteredCountQuery;
          
        if (countError) throw countError;
        
        // Build the data query
        const dataQuery = supabase
          .from("customers")
          .select("*")
          .order("customer_name", { ascending: true });
          
        // If query is not empty, apply filter without pagination
        // If query is empty, apply pagination without filter
        let filteredDataQuery;
        if (query) {
          filteredDataQuery = dataQuery.ilike("customer_name", `%${query}%`);
        } else {
          // Calculate offset based on page and pageSize
          const offset = (page - 1) * pageSize;
          filteredDataQuery = dataQuery.range(offset, offset + pageSize - 1);
        }
        
        const { data, error } = await filteredDataQuery;

        if (error) throw error;

        const customerNames = data.map(customer => customer.customer_name);
        return { customersNames: customerNames, total: total || 0 };
      })
      .then((result) => result.data || { customersNames: [], total: 0 });
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
          .select("file_format, document_type")
          .ilike("customer_name", `%${customerName}%`);

        if (error) throw error;
        
        // Extract unique file formats
        const fileFormats = data.map(item => item.file_format);
        // Remove duplicates
        return [...new Set(fileFormats)];
      })
      .then((result) => result.data || []);
  }

  async getCustomerByHash(customerData: {
    customer_name: string,
    co_code: string,
    file_format: string,
    document_type: string
  }): Promise<Customer | null> {
    const { customer_name, co_code, file_format, document_type } = customerData;
    const customerInfoHash = generateCustomerInfoHash(customer_name, co_code, file_format, document_type);

    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("customer_info_hash", customerInfoHash)
          .single();

        if (error) throw error;
        return data as Customer;
      })
      .then((result) => result.data || null);
  }

  async getDocumentTypesByCustomer(customerData: {
    customer_name: string,
    co_code: string,
    file_format: string
  }): Promise<string[]> {
    const { customer_name, co_code, file_format } = customerData;
    
    return db.query(async () => {
      const {data, error} = await supabase.from("customers")
        .select("document_type")
        .eq("customer_name", customer_name)
        .eq("co_code", co_code)
        .eq("file_format", file_format);

      if (error) throw error;

      const types = new Set<string>();
      data.forEach(item => types.add(item.document_type));

      return Array.from(types);
    }).then(result => result.data || []);

  }
}
