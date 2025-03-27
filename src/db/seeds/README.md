# Database Seeding

This directory contains the files needed for seeding the database with initial data.

## Directory Structure

```
seeds/
├── data/              # JSON data files for seeding
│   ├── users.json
│   ├── customers.json
│   ├── arc-rules.json
│   ├── engine-model-rules.json
│   ├── work-scope-rules.json
│   └── part-number-rules.json
├── users.ts           # Seed function for users
├── customers.ts       # Seed function for customers
├── arc-rules.ts       # Seed function for ARC rules
├── engine-model-rules.ts # Seed function for engine model rules
├── work-scope-rules.ts # Seed function for work scope rules
├── part-number-rules.ts # Seed function for part number rules
├── utils.ts           # Utility functions for seeding
├── index.ts           # Main seeding orchestrator
└── README.md          # This file
```

## How It Works

The seeding process works as follows:

1. JSON data files in the `data/` directory contain the seed data
2. Individual seed functions load the data from these files and insert them into the database
3. The `index.ts` file orchestrates the seeding process by running all seed functions sequentially

Each seed function checks if data already exists in the table before inserting, to avoid duplicate entries.

## Adding a New Seed File

To add a new seed file for a new table:

1. Create a new JSON file in the `data/` directory (e.g., `new-table.json`) with your seed data
2. Create a new TypeScript file (e.g., `new-table.ts`) with a seed function:

```typescript
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { new_table } from "../schema";
import { loadJsonData } from "./utils";

export async function seedNewTable(db: PostgresJsDatabase) {
  console.log("Seeding new table...");

  try {
    // Check if data already exists
    const existingData = await db.select().from(new_table);

    if (existingData.length > 0) {
      console.log("New table data already exists, skipping seeding.");
      return;
    }

    // Load data from JSON file
    const newTableData = loadJsonData<typeof new_table.$inferInsert>(
      import.meta.url,
      "new-table.json"
    );

    // Insert data
    await db.insert(new_table).values(newTableData);

    console.log("New table seeded successfully!");
  } catch (error) {
    console.error("Error seeding new table:", error);
    throw error;
  }
}
```

3. Update the `index.ts` file to import and use your new seed function:

```typescript
// Add the import
import { seedNewTable } from "./new-table";

// Add to the seedFunctions array
const seedFunctions = [
  // ... existing seed functions
  { name: "New Table", fn: seedNewTable },
];
```

## Running Seeds

To run the seeds, use:

```bash
# Using npm
npm run db:seed

# Using bun
bun run db:seed

# Using Docker
docker compose -f seed.yml --env-file .env up --build
```
