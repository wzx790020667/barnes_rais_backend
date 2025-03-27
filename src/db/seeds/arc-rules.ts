import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { arc_rules } from '../schema';
import { loadJsonData } from './utils';

export async function seedArcRules(db: PostgresJsDatabase) {
  console.log('Seeding ARC rules...');
  
  try {
    // Check if rules already exist to avoid duplicates
    const existingRules = await db.select().from(arc_rules);
    
    if (existingRules.length > 0) {
      console.log('ARC rules already exist, skipping seeding.');
      return;
    }
    
    // Load ARC rules data from JSON file
    const arcRulesData = loadJsonData<typeof arc_rules.$inferInsert>(import.meta.url, 'arc-rules.json');
    
    // Insert ARC rules from the JSON data
    await db.insert(arc_rules).values(arcRulesData);
    
    console.log('ARC rules seeded successfully!');
  } catch (error) {
    console.error('Error seeding ARC rules:', error);
    throw error;
  }
} 