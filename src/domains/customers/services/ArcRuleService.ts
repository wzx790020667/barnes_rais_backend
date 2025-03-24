import { supabase, db } from "../../../lib/db";
import { arc_rules, type ArcRule } from "../../../db/schema";

export class ArcRuleService {
  async getArcRuleById(id: string): Promise<ArcRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("arc_rules")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        return data as ArcRule;
      })
      .then((result) => result.data || null);
  }

  async getArcRules(page: number = 1, pageSize: number = 10): Promise<{ arcRules: ArcRule[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;
        
        // Get total count first
        const { data: countData, error: countError } = await supabase
          .from("arc_rules")
          .select("count", { count: "exact" });
          
        if (countError) throw countError;
        
        // Get paginated results
        const { data, error } = await supabase
          .from("arc_rules")
          .select("*")
          .range(offset, offset + pageSize - 1)
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        
        return { 
          arcRules: data as ArcRule[], 
          total: countData?.[0]?.count || 0 
        };
      })
      .then((result) => result.data || { arcRules: [], total: 0 });
  }

  async createArcRule(
    arcRule: Omit<ArcRule, "id" | "created_at" | "updated_at">
  ): Promise<ArcRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("arc_rules")
          .insert(arcRule)
          .select()
          .single();

        if (error) throw error;
        return data as ArcRule;
      })
      .then((result) => result.data || null);
  }

  async updateArcRule(
    id: string,
    arcRuleData: Partial<ArcRule>
  ): Promise<ArcRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("arc_rules")
          .update(arcRuleData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data as ArcRule;
      })
      .then((result) => result.data || null);
  }

  async deleteArcRule(id: string): Promise<boolean> {
    return db
      .query(async () => {
        const { error } = await supabase
          .from("arc_rules")
          .delete()
          .eq("id", id);

        if (error) throw error;
        return true;
      })
      .then((result) => result.error ? false : true);
  }
} 