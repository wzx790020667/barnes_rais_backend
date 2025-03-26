// Export the Supabase client
export { supabase, db } from "./supabase";

// Export Drizzle client
export { drizzleDb, closeDrizzleConnection, drizzleConnectionTest } from "./drizzle";

// Export repositories
export { UserRepository } from "./example-repository";

// You can add more repositories here as your application grows
