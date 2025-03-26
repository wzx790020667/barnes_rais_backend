import { supabase, db } from "../../../lib/db";
import { engine_model_rules, type EngineModelRule } from "../../../db/schema";

export class EngineModelRuleService {
  async getEngineModelRuleById(id: string): Promise<EngineModelRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("engine_model_rules")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        return data as EngineModelRule;
      })
      .then((result) => result.data || null);
  }

  async getAllEngineModelRules(): Promise<EngineModelRule[]> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("engine_model_rules")
          .select("engine_model_title, common_prefix, result_display")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as EngineModelRule[];
      })
      .then((result) => result.data || []);
  }

  async getEngineModelRules(page: number = 1, pageSize: number = 10): Promise<{ engineModelRules: EngineModelRule[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;
        
        // Get total count first
        const { data: countData, error: countError } = await supabase
          .from("engine_model_rules")
          .select("count", { count: "exact" });
          
        if (countError) throw countError;
        
        // Get paginated results
        const { data, error } = await supabase
          .from("engine_model_rules")
          .select("*")
          .range(offset, offset + pageSize - 1)
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        
        return { 
          engineModelRules: data as EngineModelRule[], 
          total: countData?.[0]?.count || 0 
        };
      })
      .then((result) => result.data || { engineModelRules: [], total: 0 });
  }

  async createEngineModelRule(
    engineModelRule: Omit<EngineModelRule, "id" | "created_at" | "updated_at">
  ): Promise<EngineModelRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("engine_model_rules")
          .insert(engineModelRule)
          .select()
          .single();

        if (error) throw error;
        return data as EngineModelRule;
      })
      .then((result) => result.data || null);
  }

  async updateEngineModelRule(
    id: string,
    engineModelRuleData: Partial<EngineModelRule>
  ): Promise<EngineModelRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("engine_model_rules")
          .update(engineModelRuleData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data as EngineModelRule;
      })
      .then((result) => result.data || null);
  }

  async deleteEngineModelRule(id: string): Promise<boolean> {
    return db
      .query(async () => {
        const { error } = await supabase
          .from("engine_model_rules")
          .delete()
          .eq("id", id);

        if (error) throw error;
        return true;
      })
      .then((result) => result.error ? false : true);
  }
} 