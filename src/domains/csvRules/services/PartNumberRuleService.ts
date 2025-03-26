import { supabase, db } from "../../../lib/db";
import type { PartNumberRule } from "../../../db/schema";

export class PartNumberRuleService {
  async getPartNumberRuleById(id: string): Promise<PartNumberRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("part_number_rules")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        return data as PartNumberRule;
      })
      .then((result) => result.data || null);
  }

  async getAllPartNumberRules(): Promise<PartNumberRule[]> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("part_number_rules")
          .select("part_number, product_code")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as PartNumberRule[];
      })
      .then((result) => result.data || []);
  }

  async getPartNumberRules(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ partNumberRules: PartNumberRule[]; total: number }> {
    return db
      .query(async () => {
        // Calculate offset based on page and pageSize
        const offset = (page - 1) * pageSize;
        
        // Get total count first
        const { data: countData, error: countError } = await supabase
          .from("part_number_rules")
          .select("count", { count: "exact" });
          
        if (countError) throw countError;
        
        // Get paginated results
        const { data, error } = await supabase
          .from("part_number_rules")
          .select("*")
          .range(offset, offset + pageSize - 1)
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        
        return { 
          partNumberRules: data as PartNumberRule[], 
          total: countData?.[0]?.count || 0 
        };
      })
      .then((result) => result.data || { partNumberRules: [], total: 0 });
  }

  async createPartNumberRule(
    partNumberRule: { part_number: string; product_code: string }
  ): Promise<PartNumberRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("part_number_rules")
          .insert(partNumberRule)
          .select()
          .single();

        if (error) throw error;
        return data as PartNumberRule;
      })
      .then((result) => result.data || null);
  }

  async updatePartNumberRule(
    id: string,
    partNumberRuleData: Partial<PartNumberRule>
  ): Promise<PartNumberRule | null> {
    return db
      .query(async () => {
        const { data, error } = await supabase
          .from("part_number_rules")
          .update(partNumberRuleData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data as PartNumberRule;
      })
      .then((result) => result.data || null);
  }

  async deletePartNumberRule(id: string): Promise<boolean> {
    return db
      .query(async () => {
        const { error } = await supabase
          .from("part_number_rules")
          .delete()
          .eq("id", id);

        if (error) throw error;
        return true;
      })
      .then((result) => result.error ? false : true);
  }
} 