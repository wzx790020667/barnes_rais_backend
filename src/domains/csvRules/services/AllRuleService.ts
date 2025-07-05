import { drizzleDb } from "../../../lib/db/drizzle";
import { 
  arc_rules, 
  engine_model_rules, 
  part_number_rules, 
  work_scope_rules,
  type ArcRule,
  type EngineModelRule,
  type PartNumberRule,
  type WorkScopeRule
} from "../../../db/schema";

export interface AllRulesResponse {
  arcRules: ArcRule[];
  engineModelRules: EngineModelRule[];
  partNumberRules: PartNumberRule[];
  workScopeRules: WorkScopeRule[];
}

export class AllRuleService {
  /**
   * Fetches all rules from the 4 rule tables in parallel using DrizzleORM
   * @returns Promise containing all rules from arc_rules, engine_model_rules, part_number_rules, and work_scope_rules tables
   */
  async getAllRules(): Promise<AllRulesResponse> {
    try {
      // Execute all 4 queries in parallel for better performance
      const [arcRules, engineModelRules, partNumberRules, workScopeRules] = await Promise.all([
        drizzleDb.select().from(arc_rules),
        drizzleDb.select().from(engine_model_rules),
        drizzleDb.select().from(part_number_rules),
        drizzleDb.select().from(work_scope_rules)
      ]);

      return {
        arcRules,
        engineModelRules,
        partNumberRules,
        workScopeRules
      };
    } catch (error) {
      console.error('Error fetching all rules:', error);
      throw new Error('Failed to fetch all rules from database');
    }
  }
}