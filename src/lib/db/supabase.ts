import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file."
  );
}

// Create a single instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Connection verification state
let connectionVerified = false;
let connectionVerificationPromise: Promise<boolean> | null = null;

// Verify Supabase connection
async function verifyConnection() {
  console.log("🔄 Verifying Supabase connection...");

  try {
    // First check: Verify auth service is accessible
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error(
        "❌ Failed to connect to Supabase Auth:",
        authError.message
      );
    } else {
      console.log("✅ Successfully connected to Supabase Auth service");
    }

    // Second check: Try to query the database schema
    // This will help verify that DB permissions are working
    const { error: dbError, count } = await supabase
      .from("users")
      .select("*")
      .limit(1);

    if (dbError) {
      console.warn(
        "⚠️ Connected to Supabase but unable to query database tables:",
        dbError.message
      );
      console.log(
        "💡 This might be due to restricted permissions on the service key being used"
      );
      connectionVerified = authError ? false : true;
      return connectionVerified;
    }

    console.log(
      "✅ Successfully connected to Supabase Database, count:",
      count
    );
    connectionVerified = true;
    return true;
  } catch (err) {
    console.error(
      "❌ Failed to connect to Supabase:",
      err instanceof Error ? err.message : String(err)
    );
    connectionVerified = false;
    return false;
  }
}

// Start the verification process but don't wait for it
connectionVerificationPromise = verifyConnection();

// Helper functions for database operations
export const db = {
  // Query wrapper with error handling
  async query<T>(
    callback: () => Promise<T>
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      const result = await callback();
      return { data: result, error: null };
    } catch (error) {
      console.error("Database query error:", error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

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
