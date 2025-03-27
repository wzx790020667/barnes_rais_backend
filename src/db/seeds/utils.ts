import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Load JSON data from a file in the data directory
 * @param callerPath The import.meta.url of the calling module
 * @param fileName The name of the JSON file in the data directory
 * @returns The parsed JSON data
 */
export function loadJsonData<T>(callerPath: string, fileName: string): T[] {
  // Get the directory name of the calling module
  const __filename = fileURLToPath(callerPath);
  const __dirname = path.dirname(__filename);
  
  // Read data from JSON file
  const dataPath = path.join(__dirname, 'data', fileName);
  
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (error: any) {
    console.error(`Error loading JSON data from ${dataPath}:`, error);
    throw new Error(`Failed to load seed data from ${fileName}: ${error.message || String(error)}`);
  }
} 