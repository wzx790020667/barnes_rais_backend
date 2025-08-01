import { supabase, db, drizzleDb } from "../../lib";
import {
  documents,
  customers,
  type Customer,
  t_datasets,
  t_tasks,
  ttv_results,
} from "../../db/schema";
import { generateCustomerInfoHash } from "../../lib/utils";
import { count, eq, and, sql, asc, ilike } from "drizzle-orm";
import { isEmpty } from "lodash";

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
              count: count(),
            })
            .from(documents)
            .where(
              and(
                eq(documents.status, "approved"),
                eq(documents.customer_info_hash, customerInfoHash),
                eq(documents.from_full_ard, false)
              )
            );

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

  async getCustomers(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ customers: Customer[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;

        // Get total count first using Drizzle
        const [countResult] = await drizzleDb
          .select({ count: sql<number>`count(*)` })
          .from(customers);

        const total = Number(countResult?.count || 0);

        // Get paginated results using Drizzle
        const customersData = await drizzleDb
          .select()
          .from(customers)
          .limit(pageSize)
          .offset(offset)
          .orderBy(asc(customers.co_code), asc(customers.id));

        if (!customersData || customersData.length === 0) {
          return { customers: [], total: 0 };
        }

        // Generate customer_info_hash for each customer if not already present
        const customersWithHash = customersData.map((customer) => {
          if (!customer.customer_info_hash) {
            customer.customer_info_hash = generateCustomerInfoHash(
              customer.customer_name,
              customer.co_code || "",
              customer.file_format || "",
              customer.document_type || ""
            );
          }
          return customer;
        });

        // Extract hashes to query
        const customerHashes = customersWithHash
          .map((customer) => customer.customer_info_hash)
          .filter(Boolean);

        // Use Drizzle to count documents by hash
        const documentCounts = await drizzleDb
          .select({
            hash: documents.customer_info_hash,
            count: count(),
          })
          .from(documents)
          .where(
            and(
              eq(documents.status, "approved"),
              eq(documents.from_full_ard, false)
            )
          )
          .groupBy(documents.customer_info_hash);

        // Create a mapping of hash to count - filter to only include our customer hashes
        const hashToCountMap: Record<string, number> = {};
        documentCounts.forEach((item) => {
          if (item.hash && customerHashes.includes(item.hash)) {
            hashToCountMap[item.hash] = Number(item.count);
          }
        });

        // Assign the finished_doc count to each customer
        const customersWithFinishedDocs = customersWithHash.map((customer) => ({
          ...customer,
          finished_doc: customer.customer_info_hash
            ? hashToCountMap[customer.customer_info_hash] || 0
            : 0,
        }));

        return {
          customers: customersWithFinishedDocs as Customer[],
          total: total,
        };
      })
      .then((result) => result.data || { customers: [], total: 0 });
  }

  async searchCustomersByCoCode(
    page: number = 1,
    pageSize: number = 10,
    searchQuery: string
  ): Promise<{ customers: Customer[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;

        // Get total count first using Drizzle with search filter
        const [countResult] = await drizzleDb
          .select({ count: sql<number>`count(*)` })
          .from(customers)
          .where(ilike(customers.co_code, `%${searchQuery}%`));

        const total = Number(countResult?.count || 0);

        // Get paginated results using Drizzle with search filter
        const customersData = await drizzleDb
          .select()
          .from(customers)
          .where(ilike(customers.co_code, `%${searchQuery}%`))
          .limit(pageSize)
          .offset(offset)
          .orderBy(asc(customers.co_code), asc(customers.id));

        if (!customersData || customersData.length === 0) {
          return { customers: [], total: 0 };
        }

        // Generate customer_info_hash for each customer if not already present
        const customersWithHash = customersData.map((customer) => {
          if (!customer.customer_info_hash) {
            customer.customer_info_hash = generateCustomerInfoHash(
              customer.customer_name,
              customer.co_code || "",
              customer.file_format || "",
              customer.document_type || ""
            );
          }
          return customer;
        });

        // Extract hashes to query
        const customerHashes = customersWithHash
          .map((customer) => customer.customer_info_hash)
          .filter(Boolean);

        // Use Drizzle to count documents by hash
        const documentCounts = await drizzleDb
          .select({
            hash: documents.customer_info_hash,
            count: count(),
          })
          .from(documents)
          .where(
            and(
              eq(documents.status, "approved"),
              eq(documents.from_full_ard, false)
            )
          )
          .groupBy(documents.customer_info_hash);

        // Create a mapping of hash to count - filter to only include our customer hashes
        const hashToCountMap: Record<string, number> = {};
        documentCounts.forEach((item) => {
          if (item.hash && customerHashes.includes(item.hash)) {
            hashToCountMap[item.hash] = Number(item.count);
          }
        });

        // Assign the finished_doc count to each customer
        const customersWithFinishedDocs = customersWithHash.map((customer) => ({
          ...customer,
          finished_doc: customer.customer_info_hash
            ? hashToCountMap[customer.customer_info_hash] || 0
            : 0,
        }));

        return {
          customers: customersWithFinishedDocs as Customer[],
          total: total,
        };
      })
      .then((result) => result.data || { customers: [], total: 0 });
  }

  async createCustomer(
    customer: Partial<Customer>
  ): Promise<Customer | null | "DUPLICATED_CUSTOMER"> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .insert(customer)
          .select()
          .single();

        if (error && error.code === "23505") {
          return "DUPLICATED_CUSTOMER";
        }

        if (error) throw error;
        return data as Customer;
      })
      .then((result) => result.data || null);
  }

  async updateCustomer(
    id: string,
    customerData: Partial<Customer>
  ): Promise<Customer | null | "DUPLICATED_CUSTOMER"> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", id)
          .select()
          .single();

        if (error && error.code === "23505") {
          return "DUPLICATED_CUSTOMER";
        }

        if (error) throw error;
        return data as Customer;
      })
      .then((result) => result.data || null);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return db
      .query(async () => {
        try {
          // Use drizzleDb transaction for cascading deletion
          const result = await drizzleDb.transaction(async (tx) => {
            // First find datasets for this customer
            const customerDatasets = await tx
              .select({ id: t_datasets.id })
              .from(t_datasets)
              .where(eq(t_datasets.customer_id, id));

            const datasetIds = customerDatasets.map((dataset) => dataset.id);
            console.log(
              "[CustomerService.deleteCustomer] - datasetIds: ",
              datasetIds
            );

            // For each dataset, find related tasks
            const customerTasks = await tx
              .select({ id: t_tasks.id })
              .from(t_tasks)
              .where(eq(t_tasks.customer_id, id));

            const taskIds = customerTasks.map((task) => task.id);
            console.log(
              "[CustomerService.deleteCustomer] - taskIds: ",
              taskIds
            );

            // Delete ttv_results that reference these tasks
            if (taskIds.length > 0) {
              // Check each task for ttv_results
              for (const taskId of taskIds) {
                console.log(
                  `[CustomerService.deleteCustomer] - Deleting ttv_results for task ${taskId}`
                );

                // Find all ttv_results for this task
                const ttvResults = await tx
                  .select({ id: ttv_results.id })
                  .from(ttv_results)
                  .where(eq(ttv_results.t_task_id, taskId));

                console.log(
                  `[CustomerService.deleteCustomer] - Found ${ttvResults.length} ttv_results for task ${taskId}`
                );

                // Delete each ttv_result individually
                for (const result of ttvResults) {
                  await tx
                    .delete(ttv_results)
                    .where(eq(ttv_results.id, result.id));
                }
              }
            }

            // Delete t_tasks for this customer
            await tx.delete(t_tasks).where(eq(t_tasks.customer_id, id));

            // Delete t_datasets for this customer
            await tx.delete(t_datasets).where(eq(t_datasets.customer_id, id));

            // Finally delete the customer
            const deleted = await tx
              .delete(customers)
              .where(eq(customers.id, id));

            return true; // If we get here without an error, deletion was successful
          });

          return result;
        } catch (error) {
          console.error("Error deleting customer:", error);
          throw error;
        }
      })
      .then((result) => (result.error ? false : result.data ?? false));
  }

  async searchCustomers(
    query: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ customersNames: string[]; total: number }> {
    return db
      .query(async () => {
        // Get total count first
        const countQuery = supabase
          .from("customers")
          .select("*", { count: "exact", head: true });
        // Only apply filter if query is not empty
        const filteredCountQuery = query
          ? countQuery.ilike("customer_name", `%${query}%`)
          : countQuery;
        const { count: total, error: countError } = await filteredCountQuery;

        if (countError) throw countError;

        // Build the data query
        const dataQuery = supabase
          .from("customers")
          .select("*")
          .order("co_code", { ascending: true });

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

        const customerNames = data.map((customer) => customer.customer_name);
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
        const fileFormats = data.map((item) => item.file_format);
        // Remove duplicates
        return [...new Set(fileFormats)];
      })
      .then((result) => result.data || []);
  }

  async getCustomerByHash(customerData: {
    customer_name: string;
    co_code: string;
    file_format: string;
    document_type: string;
  }): Promise<Customer | null> {
    const { customer_name, co_code, file_format, document_type } = customerData;
    const customerInfoHash = generateCustomerInfoHash(
      customer_name,
      co_code,
      file_format,
      document_type
    );

    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("customer_info_hash", customerInfoHash);

        if (error) throw error;
        return data[0] as Customer;
      })
      .then((result) => result.data || null);
  }

  async getDocumentTypesByCustomer(customerData: {
    customer_name: string;
    co_code: string;
    file_format: string;
  }): Promise<string[]> {
    const { customer_name, co_code, file_format } = customerData;

    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .select("document_type")
          .eq("customer_name", customer_name)
          .eq("co_code", co_code)
          .eq("file_format", file_format);

        if (error) throw error;

        const types = new Set<string>();
        data.forEach((item) => types.add(item.document_type));

        return Array.from(types);
      })
      .then((result) => result.data || []);
  }

  async findEndUserCustomerNumberByName(
    endUserCustomerName: string
  ): Promise<string | null> {
    return db
      .query(async () => {
        if (isEmpty(endUserCustomerName)) {
          return null;
        }

        // Normalize search string by removing trailing punctuation and special characters
        const trimmedName = endUserCustomerName.trim();
        const normalizedSearch = trimmedName.replace(/[.,:，?!;]/g, "");

        const { data, error } = await supabase
          .from("customers")
          .select("customer_code")
          .or(`customer_name.ilike.%${normalizedSearch}%`)
          .limit(1);

        if (error) {
          console.log("Error in customer search:", error);
          throw error;
        }

        if (data?.length === 0) {
          console.log("No customers found");
          return null;
        }

        return data[0]?.customer_code || null;
      })
      .then((result) => {
        return result.data || null;
      });
  }

  async findCustomerNumbersByCoCode(
    coCode: string
  ): Promise<Array<{ customerNumber: string; customerName: string }>> {
    return db
      .query(async () => {
        const trimmedCoCode = coCode.trim();

        const { data, error } = await supabase
          .from("customers")
          .select("customer_code, customer_name")
          .eq("co_code", trimmedCoCode)
          .not("customer_code", "is", null)
          .not("customer_name", "is", null);

        if (error) {
          console.log("Error in customer search by co_code:", error);
          throw error;
        }

        if (!data || data.length === 0) {
          console.log("No customers found for co_code:", trimmedCoCode);
          return [];
        }

        // Remove duplicates based on both customer_code and customer_name
        const uniqueCustomers = data.reduce((acc, current) => {
          const key = `${current.customer_code}-${current.customer_name}`;
          if (!acc.has(key)) {
            acc.set(key, {
              customerNumber: current.customer_code,
              customerName: current.customer_name,
            });
          }
          return acc;
        }, new Map());

        return Array.from(uniqueCustomers.values());
      })
      .then((result) => {
        return result.data || [];
      });
  }

  async getAllCustomerNames(): Promise<{ id: string; customerName: string }[]> {
    return db
      .query(async () => {
        // Get all customer names using Drizzle
        const customersData = await drizzleDb
          .select({
            id: customers.id,
            customer_name: customers.customer_name,
          })
          .from(customers)
          .orderBy(asc(customers.customer_name));

        // Remove duplicates by customer name at API layer
        const uniqueCustomerNames = new Map<
          string,
          { id: string; customerName: string }
        >();

        customersData.forEach((customer) => {
          if (
            customer.customer_name &&
            !uniqueCustomerNames.has(customer.customer_name)
          ) {
            uniqueCustomerNames.set(customer.customer_name, {
              id: customer.id,
              customerName: customer.customer_name,
            });
          }
        });

        // Convert Map values to array and return
        return Array.from(uniqueCustomerNames.values());
      })
      .then((result) => {
        return result.data || [];
      });
  }

  async getCoCodeByCustomerName(customerName: string): Promise<string | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("customers")
          .select("co_code")
          .eq("customer_name", customerName)
          .limit(1);

        if (error) throw error;
        return data[0]?.co_code || null;
      })
      .then((result) => result.data || null);
  }
}
