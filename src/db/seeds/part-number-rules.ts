import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { part_number_rules } from '../schema';
import { loadJsonData } from './utils';

export async function seedPartNumberRules(db: PostgresJsDatabase) {
  console.log('Seeding part number rules...');
  
  try {
    // Check if rules already exist to avoid duplicates
    const existingRules = await db.select().from(part_number_rules);
    
    if (existingRules.length > 0) {
      console.log('Part number rules already exist, skipping seeding.');
      return;
    }
    
    // Load part number rules data from JSON file
    const partNumberRulesData = loadJsonData<typeof part_number_rules.$inferInsert>(
      import.meta.url, 
      'part-number-rules.json'
    );
    
    // Insert part number rules from the JSON data
    await db.insert(part_number_rules).values(partNumberRulesData);
    
    console.log('Part number rules seeded successfully!');
  } catch (error) {
    console.error('Error seeding part number rules:', error);
    throw error;
  }
} 