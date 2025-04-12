/**
 * Application configuration
 */

// Server configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  HOST: process.env.HOST || "localhost",
  APP_NAME: process.env.APP_NAME || "ARD Server",
  NODE_ENV: process.env.NODE_ENV || "development",
  // HTTPS configuration
  HTTPS_PORT: process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT) : 3443,
  TLS_KEY_PATH: process.env.TLS_KEY_PATH,
  TLS_CERT_PATH: process.env.TLS_CERT_PATH,
  TLS_PASSPHRASE: process.env.TLS_PASSPHRASE,
};

// JWT configuration
export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || "default_secret_change_in_production",
  EXPIRES_IN: process.env.JWT_EXPIRES_IN
    ? parseInt(process.env.JWT_EXPIRES_IN)
    : 7 * 24 * 60 * 60, // 7 days in seconds (updated from 24 hours)
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

// AI Service configuration
export const AI_SERVICE_CONFIG = {
  URL: process.env.AI_SERVICE_URL || "http://localhost:5000",
};

// Training data storage configuration
export const TRAINING_DATA_CONFIG = {
  // Detect if running in container by checking for a container-specific env var
  BASE_DATASET_OUTPUT_PATH: process.env.IS_CONTAINER === 'true' 
    ? '/app/barnes_rais_training/training_data'
    : `${process.env.HOME || '/home'}/barnes_rais_training/training_data`,
  BASE_DATASET_INPUT_PATH: '/barnes_rais_training/training_data',
  BASE_MODEL_PATH: `/barnes_rais_training/models`,
};
