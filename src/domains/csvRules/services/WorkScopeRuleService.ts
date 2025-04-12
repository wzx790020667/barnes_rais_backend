import { supabase, db } from "../../../lib";
import { type WorkScopeRule } from "../../../db/schema";

export class WorkScopeRuleService {
  async getWorkScopeRuleById(id: string): Promise<WorkScopeRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("work_scope_rules")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        return data as WorkScopeRule;
      })
      .then((result) => result.data || null);
  }

  async getAllWorkScopeRules(): Promise<WorkScopeRule[]> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("work_scope_rules")
          .select("overhaul_keywords, result_display");

        if (error) throw error;
        return data as WorkScopeRule[];
      })
      .then((result) => result.data || []);
  }

  async getWorkScopeRules(page: number | null = 1, pageSize: number | null = 10): Promise<{ workScopeRules: WorkScopeRule[]; total: number }> {
    return db
      .query(async () => {
        // Get total count first
        const { data: countData, error: countError } = await supabase
          .from("work_scope_rules")
          .select("count", { count: "exact" });
          
        if (countError) throw countError;
        
        // If both page and pageSize are null, return all results
        if (page === null && pageSize === null) {
          const { data, error } = await supabase
            .from("work_scope_rules")
            .select("*");
            
          if (error) throw error;
          
          return { 
            workScopeRules: data as WorkScopeRule[], 
            total: countData?.[0]?.count || 0 
          };
        }
        
        // Otherwise, use pagination
        // Calculate offset based on page and pageSize
        const offset = ((page || 1) - 1) * (pageSize || 10);
        
        // Get paginated results
        const { data, error } = await supabase
          .from("work_scope_rules")
          .select("*")
          .range(offset, offset + (pageSize || 10) - 1);
          
        if (error) throw error;
        
        return { 
          workScopeRules: data as WorkScopeRule[], 
          total: countData?.[0]?.count || 0 
        };
      })
      .then((result) => result.data || { workScopeRules: [], total: 0 });
  }

  async createWorkScopeRule(
    workScopeRule: Omit<WorkScopeRule, "id" | "created_at" | "updated_at">
  ): Promise<WorkScopeRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("work_scope_rules")
          .insert(workScopeRule)
          .select()
          .single();

        if (error) throw error;
        return data as WorkScopeRule;
      })
      .then((result) => result.data || null);
  }

  async updateWorkScopeRule(
    id: string,
    workScopeRuleData: Partial<WorkScopeRule>
  ): Promise<WorkScopeRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("work_scope_rules")
          .update(workScopeRuleData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data as WorkScopeRule;
      })
      .then((result) => result.data || null);
  }

  async deleteWorkScopeRule(id: string): Promise<boolean> {
    return db
      .query(async () => {
        const { error } = await supabase
          .from("work_scope_rules")
          .delete()
          .eq("id", id);

        if (error) throw error;
        return true;
      })
      .then((result) => result.error ? false : true);
  }
} 