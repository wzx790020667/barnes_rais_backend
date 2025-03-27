import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { customers } from '../schema';
import { loadJsonData } from './utils';

export async function seedCustomers(db: PostgresJsDatabase) {
  console.log('Seeding customers...');
  
  try {
    // Check if customers already exist to avoid duplicates
    const existingCustomers = await db.select().from(customers);
    
    if (existingCustomers.length > 0) {
      console.log('Customers already exist, skipping seeding.');
      return;
    }
    
    // Load customer data from JSON file
    const customerData = loadJsonData<typeof customers.$inferInsert>(
      import.meta.url, 
      'customers.json'
    );
    
    // Insert customers from the JSON data
    await db.insert(customers).values(customerData);
    
    console.log('Customers seeded successfully!');
  } catch (error) {
    console.error('Error seeding customers:', error);
    throw error;
  }
} 