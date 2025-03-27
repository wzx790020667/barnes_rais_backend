import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { work_scope_rules } from '../schema';
import { loadJsonData } from './utils';

export async function seedWorkScopeRules(db: PostgresJsDatabase) {
  console.log('Seeding work scope rules...');
  
  try {
    // Check if rules already exist to avoid duplicates
    const existingRules = await db.select().from(work_scope_rules);
    
    if (existingRules.length > 0) {
      console.log('Work scope rules already exist, skipping seeding.');
      return;
    }
    
    // Load work scope rules data from JSON file
    const workScopeRulesData = loadJsonData<typeof work_scope_rules.$inferInsert>(
      import.meta.url, 
      'work-scope-rules.json'
    );
    
    // Insert work scope rules from the JSON data
    await db.insert(work_scope_rules).values(workScopeRulesData);
    
    console.log('Work scope rules seeded successfully!');
  } catch (error) {
    console.error('Error seeding work scope rules:', error);
    throw error;
  }
} 