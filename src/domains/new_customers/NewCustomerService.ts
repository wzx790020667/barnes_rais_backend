import { supabase, db, drizzleDb } from "../../lib";
import { new_customers, type NewCustomer } from "../../db/schema";
import { count, eq, sql, asc, ilike } from "drizzle-orm";

export class NewCustomerService {
  async getNewCustomerById(id: string): Promise<NewCustomer | null> {
    const { data, error } = await supabase
      .from("new_customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return data as NewCustomer;
  }

  async getNewCustomers(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ newCustomers: NewCustomer[]; total: number }> {
    // Calculate offset based on page and pageSize
    const offset = (page - 1) * pageSize;

    // Get total count first using Drizzle
    const [countResult] = await drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(new_customers);

    const total = Number(countResult.count);

    // Get paginated data using Supabase
    const { data, error } = await supabase
      .from("new_customers")
      .select("*")
      .order("co_code", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    return {
      newCustomers: (data || []) as NewCustomer[],
      total,
    };
  }

  async createNewCustomer(
    newCustomer: Partial<NewCustomer>
  ): Promise<NewCustomer | null | "DUPLICATED_NEW_CUSTOMER"> {
    const { data, error } = await supabase
      .from("new_customers")
      .insert(newCustomer)
      .select()
      .single();

    if (error && error.code === "23505") {
      return "DUPLICATED_NEW_CUSTOMER";
    }

    if (error) throw error;

    return data as NewCustomer;
  }

  async updateNewCustomer(
    id: string,
    newCustomerData: Partial<NewCustomer>
  ): Promise<NewCustomer | null | "DUPLICATED_NEW_CUSTOMER"> {
    const { data, error } = await supabase
      .from("new_customers")
      .update({
        ...newCustomerData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error && error.code === "23505") {
      return "DUPLICATED_NEW_CUSTOMER";
    }

    if (error) throw error;

    return data as NewCustomer;
  }

  async deleteNewCustomer(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("new_customers")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return true;
  }

  async searchNewCustomers(
    query: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ newCustomers: NewCustomer[]; total: number }> {
    // Get total count first
    const countQuery = supabase
      .from("new_customers")
      .select("*", { count: "exact", head: true });
    // Only apply filter if query is not empty
    const filteredCountQuery = query
      ? countQuery.ilike("co_code", `%${query}%`)
      : countQuery;
    const { count: total, error: countError } = await filteredCountQuery;

    if (countError) throw countError;

    // Build the data query
    const dataQuery = supabase
      .from("new_customers")
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Only apply filter if query is not empty
    const filteredDataQuery = query
      ? dataQuery.ilike("co_code", `%${query}%`)
      : dataQuery;

    const { data, error } = await filteredDataQuery;

    if (error) throw error;

    return {
      newCustomers: (data || []) as NewCustomer[],
      total: total || 0,
    };
  }

  async getNewCustomerByName(
    customerName: string
  ): Promise<NewCustomer | null> {
    const { data, error } = await supabase
      .from("new_customers")
      .select("*")
      .ilike("customer_name", `%${customerName}%`)
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;

    return data as NewCustomer;
  }

  async getAllNewCustomerNames(): Promise<string[]> {
    const { data, error } = await supabase
      .from("new_customers")
      .select("customer_name")
      .order("customer_name", { ascending: true });

    if (error) throw error;

    return (data || []).map((item) => item.customer_name);
  }

  async getAllNewCustomers(): Promise<NewCustomer[]> {
    const { data, error } = await supabase
      .from("new_customers")
      .select("*")
      .order("co_code", { ascending: true });

    if (error) throw error;

    return (data || []) as NewCustomer[];
  }

  async findCustomerNumbersByCoCode(
    coCode: string
  ): Promise<Array<{ customerNumber: string; customerName: string }>> {
    const trimmedCoCode = coCode.trim();

    const { data, error } = await supabase
      .from("new_customers")
      .select("customer_code, customer_name")
      .eq("co_code", trimmedCoCode)
      .not("customer_code", "is", null)
      .not("customer_name", "is", null);

    if (error) {
      console.log("Error in new customer search by co_code:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log("No new customers found for co_code:", trimmedCoCode);
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
  }
}
