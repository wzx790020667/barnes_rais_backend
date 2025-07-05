import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { new_customers } from '../schema';
import { loadJsonData } from './utils';

// Type for the JSON data structure
interface NewCustomerJsonData {
  'Customer Number': string;
  'Customer Name': string;
  'Customer Code': string;
}

export async function seedNewCustomers(db: PostgresJsDatabase) {
  console.log('Seeding new customers...');
  
  try {
    // Check if new customers already exist to avoid duplicates
    const existingNewCustomers = await db.select().from(new_customers);
    
    if (existingNewCustomers.length > 0) {
      console.log('New customers already exist, skipping seeding.');
      return;
    }
    
    // Load new customer data from JSON file
    const newCustomerJsonData = loadJsonData<NewCustomerJsonData>(
      import.meta.url, 
      'new-customers.json'
    );
    
    // Transform the JSON data to match the database schema
    const newCustomerData = newCustomerJsonData.map(item => ({
      customer_name: item['Customer Name'],
      customer_code: item['Customer Number'],
      co_code: item['Customer Code']
    }));
    
    // Insert new customers from the transformed data
    await db.insert(new_customers).values(newCustomerData);
    
    console.log(`New customers seeded successfully! Inserted ${newCustomerData.length} records.`);
  } catch (error) {
    console.error('Error seeding new customers:', error);
    throw error;
  }
}