import { supabase, db } from "../../../lib";
import { type EngineModelRule } from "../../../db/schema";

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
          .select("engine_model_title, common_prefix, result_display");

        if (error) throw error;
        return data as EngineModelRule[];
      })
      .then((result) => result.data || []);
  }

  async getEngineModelRules(
    page: number | null = 1,
    pageSize: number | null = 10
  ): Promise<{ engineModelRules: EngineModelRule[]; total: number }> {
    return db
      .query(async () => {
        // Get total count first
        const { data: countData, error: countError } = await supabase
          .from("engine_model_rules")
          .select("count", { count: "exact" });

        if (countError) throw countError;

        let query = supabase.from("engine_model_rules").select("*");

        // Apply pagination only if both page and pageSize are not null
        if (page !== null && pageSize !== null) {
          const offset = (page - 1) * pageSize;
          query = query.range(offset, offset + pageSize - 1);
        }

        // Execute query
        const { data, error } = await query;

        if (error) throw error;

        return {
          engineModelRules: data as EngineModelRule[],
          total: countData?.[0]?.count || 0,
        };
      })
      .then((result) => result.data || { engineModelRules: [], total: 0 });
  }

  async searchEngineModelRules(
    page: number,
    pageSize: number,
    query: string
  ): Promise<{ engineModelRules: EngineModelRule[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;

        // Get total count first with search filter
        const { data: countData, error: countError } = await supabase
          .from("engine_model_rules")
          .select("count", { count: "exact" })
          .or(`result_display.ilike.%${query}%`);

        if (countError) throw countError;

        // Get paginated results with search filter
        const { data, error } = await supabase
          .from("engine_model_rules")
          .select("*")
          .or(`result_display.ilike.%${query}%`)
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        return {
          engineModelRules: data as EngineModelRule[],
          total: countData?.[0]?.count || 0,
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
      .then((result) => (result.error ? false : true));
  }
}
