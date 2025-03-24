import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

async function main() {
    const client = postgres(process.env.DATABASE_URL as string)
    const db = drizzle({ client });
}

main();
