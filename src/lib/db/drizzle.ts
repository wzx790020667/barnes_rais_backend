import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import "dotenv/config";

// Validate environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Missing Database URL. Please set DATABASE_URL in your .env file."
  );
}

// Create a PostgreSQL client with connection pooling
// Disable prepared statements for compatibility with Supabase connection pooling
const client = postgres(databaseUrl, { prepare: false });

// Create and export the Drizzle ORM instance
export const drizzleDb = drizzle({ client });

// Helper function to handle cleanup during application shutdown
export const closeDrizzleConnection = async () => {
  console.log("🔄 Closing Drizzle database connection...");
  try {
    await client.end();
    console.log("✅ Drizzle database connection closed successfully");
    return true;
  } catch (err) {
    console.error(
      "❌ Error closing Drizzle database connection:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}; 