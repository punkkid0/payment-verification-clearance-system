#!/usr/bin/env node
/**
 * One-time database setup helper for the Payment Verification & Clearance System.
 * 
 * What it does:
 *  - Connects to PostgreSQL (using backend/.env)
 *  - Creates the database `payment_verification_db` if it doesn't exist
 *  - Runs database-schema.sql
 *  - Runs migrations 001, 003, 004, 005 (idempotent on a fresh schema)
 *  - Runs seed-admin-user.sql (creates admin + test student + demo ledger row)
 *
 * Usage (after you have installed Postgres and updated backend/.env with the real DB_PASSWORD):
 *   node setup-database.js
 *
 * Requirements:
 *   - PostgreSQL server running and reachable on the host/port in .env
 *   - The 'postgres' superuser password in backend/.env (DB_USER and DB_PASSWORD)
 */

const fs = require('fs');
const path = require('path');
const { Client, Pool } = require('./backend/node_modules/pg');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const DB_NAME = process.env.DB_NAME || 'payment_verification_db';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_PASSWORD || DB_PASSWORD === 'CHANGE_ME_POSTGRES_PASSWORD' || DB_PASSWORD.includes('your_')) {
  console.error('\n❌ ERROR: You have not set a real DB_PASSWORD in backend/.env yet.');
  console.error('   Edit backend/.env and put your actual PostgreSQL postgres user password.');
  console.error('   Then run this script again.\n');
  process.exit(1);
}

const adminClientConfig = {
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: 'postgres',   // connect to default db first
};

async function runSqlFile(client, filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`\n📄 Running ${description} (${filePath}) ...`);
  await client.query(sql);
  console.log(`✅ ${description} completed.`);
}

async function main() {
  console.log('\n🚀 Payment Verification System - Database Setup');
  console.log('================================================');
  console.log(`Target DB: ${DB_NAME}`);
  console.log(`Host: ${DB_HOST}:${DB_PORT}`);
  console.log(`User: ${DB_USER}\n`);

  // 1. Connect to 'postgres' db and create our target DB if needed
  const adminClient = new Client(adminClientConfig);
  await adminClient.connect();

  try {
    const check = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );

    if (check.rows.length === 0) {
      console.log(`📦 Creating database "${DB_NAME}"...`);
      // CREATE DATABASE cannot run inside a transaction
      await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`✅ Database "${DB_NAME}" created.`);
    } else {
      console.log(`ℹ️  Database "${DB_NAME}" already exists.`);
    }
  } finally {
    await adminClient.end();
  }

  // 2. Now connect to the actual target database
  const targetConfig = { ...adminClientConfig, database: DB_NAME };
  const dbClient = new Client(targetConfig);
  await dbClient.connect();

  try {
    // Run the main schema
    await runSqlFile(dbClient, 'database-schema.sql', 'Main database schema');

    await runSqlFile(dbClient, 'migration-001-clearance-requests.sql', 'Clearance requests migration');
    await runSqlFile(dbClient, 'migration-003-auto-verification.sql', 'Auto-verification columns');
    await runSqlFile(dbClient, 'migration-004-indigene-and-official-payments.sql', 'Indigene status + official ledger');
    await runSqlFile(dbClient, 'migration-005-unify-users-schema.sql', 'Unify users schema');

    await runSqlFile(dbClient, 'seed-admin-user.sql', 'Seed admin + test student users');

    console.log('\n🎉 Database setup complete!');
    console.log('\nDefault login credentials you can use right now:');
    console.log('  Admin:   username=admin     password=admin123');
    console.log('  Student: username=student1  password=student123');
    console.log('\n⚠️  Change these passwords after first login!');
    console.log('\nNext steps:');
    console.log('  1. Start backend:   cd backend && npm run dev');
    console.log('  2. Start frontend:  cd frontend && npm start');
    console.log('  3. Open http://localhost:3000 and log in with the admin or student account.\n');
  } finally {
    await dbClient.end();
  }
}

main().catch(err => {
  console.error('\n❌ Setup failed:');
  console.error(err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('\nHint: Is PostgreSQL running? Can you connect with psql?');
    console.error('      Check that the password in backend/.env is correct for the postgres user.');
  }
  process.exit(1);
});
