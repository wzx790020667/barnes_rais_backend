import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { users } from '../schema';
import { loadJsonData } from './utils';

export async function seedUsers(db: PostgresJsDatabase) {
  console.log('Seeding users...');
  
  try {
    // Check if users already exist to avoid duplicates
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length > 0) {
      console.log('Users already exist, skipping seeding.');
      return;
    }
    
    // Load user data from JSON file
    const userData = loadJsonData<typeof users.$inferInsert>(import.meta.url, 'users.json');
    
    // Insert users from the JSON data
    await db.insert(users).values(userData);
    
    console.log('Users seeded successfully!');
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
} 