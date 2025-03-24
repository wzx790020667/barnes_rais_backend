/**
 * Application configuration
 */

// Server configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  HOST: process.env.HOST || "localhost",
  APP_NAME: process.env.APP_NAME || "ARD Server",
  NODE_ENV: process.env.NODE_ENV || "development",
};

// JWT configuration
export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || "default_secret_change_in_production",
  EXPIRES_IN: process.env.JWT_EXPIRES_IN
    ? parseInt(process.env.JWT_EXPIRES_IN)
    : 24 * 60 * 60, // 24 hours in seconds
};

// Database configuration
export const DB_CONFIG = {
  // Legacy database config (if needed)
  URL: process.env.DATABASE_URL || "localhost",
  NAME: process.env.DATABASE_NAME || "ard_database",
  USER: process.env.DATABASE_USER || "user",
  PASSWORD: process.env.DATABASE_PASSWORD || "password",

  // Supabase configuration
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
};
