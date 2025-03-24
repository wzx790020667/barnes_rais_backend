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

// Connection verification state
let connectionVerified = false;
let connectionVerificationPromise: Promise<boolean> | null = null;

// Verify Drizzle connection
async function verifyConnection() {
  console.log("🔄 Verifying Drizzle database connection...");

  try {
    // Execute a simple query to check the connection
    await client`SELECT 1`;
    console.log("✅ Successfully connected to Drizzle database");
    connectionVerified = true;
    return true;
  } catch (err) {
    console.error(
      `❌ Failed to connect to Drizzle database, connection string: ${process.env.DATABASE_URL}, details:`,
      err instanceof Error ? err.message : String(err)
    );
    connectionVerified = false;
    return false;
  }
}

// Start the verification process but don't wait for it
connectionVerificationPromise = verifyConnection();

// Export database interface with connection verification
export const drizzleClient = {
  // Wait for connection verification to complete
  async waitForConnection(timeoutMs = 10000): Promise<boolean> {
    // If verification already completed, return result immediately
    if (connectionVerified !== null) {
      return connectionVerified;
    }

    // If verification is in progress, wait for it
    if (connectionVerificationPromise) {
      try {
        // Set a timeout to avoid waiting forever
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), timeoutMs);
        });

        // Wait for either the verification or the timeout
        return await Promise.race([
          connectionVerificationPromise,
          timeoutPromise,
        ]);
      } catch (err) {
        console.error("Error waiting for database connection:", err);
        return false;
      }
    }

    // If verification hasn't started yet, start it now
    connectionVerificationPromise = verifyConnection();
    return await connectionVerificationPromise;
  },
};

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