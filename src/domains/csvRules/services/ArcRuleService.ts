import { supabase, db } from "../../../lib";
import { arc_rules, type ArcRule } from "../../../db/schema";

export class ArcRuleService {
  async getArcRuleById(id: string): Promise<ArcRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("arc_rules")
          .select("arc_appearance, result_display")
          .eq("id", id)
          .single();

        if (error) throw error;
        return data as ArcRule;
      })
      .then((result) => result.data || null);
  }

  async getAllArcRules(): Promise<ArcRule[]> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("arc_rules")
          .select("*");

        if (error) throw error;
        return data as ArcRule[];
      })
      .then((result) => result.data || []);
  }

  async getArcRules(page: number | null = 1, pageSize: number | null = 10): Promise<{ arcRules: ArcRule[]; total: number }> {
    return db
      .query(async () => {
        // If both page and pageSize are null, return all results without pagination
        if (page === null && pageSize === null) {
          const { data, error } = await supabase
            .from("arc_rules")
            .select("*");
                        
          if (error) throw error;
          
          return { 
            arcRules: data as ArcRule[], 
            total: data.length 
          };
        }
        
        // Use default values if null is passed for only one parameter
        const effectivePage = page ?? 1;
        const effectivePageSize = pageSize ?? 10;
        
        // Calculate offset based on page and pageSize
        const offset = (effectivePage - 1) * effectivePageSize;
        
        // Get total count first
        const { data: countData, error: countError } = await supabase
          .from("arc_rules")
          .select("count", { count: "exact" });
          
        if (countError) throw countError;
        
        // Get paginated results
        const { data, error } = await supabase
          .from("arc_rules")
          .select("*")
          .range(offset, offset + effectivePageSize - 1);
          
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