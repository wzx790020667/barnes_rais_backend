import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { engine_model_rules } from '../schema';
import { loadJsonData } from './utils';

export async function seedEngineModelRules(db: PostgresJsDatabase) {
  console.log('Seeding engine model rules...');
  
  try {
    // Check if rules already exist to avoid duplicates
    const existingRules = await db.select().from(engine_model_rules);
    
    if (existingRules.length > 0) {
      console.log('Engine model rules already exist, skipping seeding.');
      return;
    }
    
    // Load engine model rules data from JSON file
    const engineModelRulesData = loadJsonData<typeof engine_model_rules.$inferInsert>(
      import.meta.url, 
      'engine-model-rules.json'
    );
    
    // Insert engine model rules from the JSON data
    await db.insert(engine_model_rules).values(engineModelRulesData);
    
    console.log('Engine model rules seeded successfully!');
  } catch (error) {
    console.error('Error seeding engine model rules:', error);
    throw error;
  }
} 