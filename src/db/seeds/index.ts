import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { seedUsers } from './users';
import { seedArcRules } from './arc-rules';
import { seedEngineModelRules } from './engine-model-rules';
import { seedWorkScopeRules } from './work-scope-rules';
import { seedPartNumberRules } from './part-number-rules';
import { seedCustomers } from './customers';
import { seedNewCustomers } from './new-customers';

/**
 * Main seeding function that orchestrates the database seeding process
 */
async function main() {
  console.log('🌱 Starting database seeding...');
  
  let client;
  
  try {
    // Check database URL is available
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return new Error('DATABASE_URL environment variable is not set');
    }
    
    // Connect to the database
    client = postgres(databaseUrl);
    const db = drizzle(client);
    
    // Run all seed functions sequentially
    // Each function checks if data exists before inserting
    const seedFunctions = [
      { name: 'Users', fn: seedUsers },
      { name: 'Customers', fn: seedCustomers },
      { name: 'New Customers', fn: seedNewCustomers },
      { name: 'ARC Rules', fn: seedArcRules },
      { name: 'Engine Model Rules', fn: seedEngineModelRules },
      { name: 'Work Scope Rules', fn: seedWorkScopeRules },
      { name: 'Part Number Rules', fn: seedPartNumberRules }
    ];
    
    for (const { name, fn } of seedFunctions) {
      try {
        await fn(db);
      } catch (error) {
        console.error(`❌ Error seeding ${name}:`, error);
        // Continue with other seeds even if one fails
      }
    }
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error in database seeding process:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    if (client) {
      await client.end();
    }
  }
}

// Run the main function
await main();