import fs from "fs";
import { log } from "./log.mjs";

const DB_PATH = process.env.DB_PATH || "./data/mailer.json";

// Initialize database
export const db = {
  subscribers: [],
  lastMailout: 0,
};

// Load existing database if it exists
try {
  const jsonString = fs.readFileSync(DB_PATH, "utf8");
  log("loaded:", jsonString, typeof jsonString);

  const loadedDb = JSON.parse(jsonString);
  db.subscribers = loadedDb.subscribers;
  db.lastMailout = loadedDb.lastMailout;
} catch (error) {
  log(error);
  // Database doesn't exist, use default structure
  log("Creating new database file");
}

// Migration function to remove inactive subscribers
export function runMigration() {
  const initialLength = db.subscribers.length;
  db.subscribers = db.subscribers.filter(
    (subscriber) => subscriber.active !== false
  );
  const removedCount = initialLength - db.subscribers.length;

  if (removedCount > 0) {
    log(`Migration: Removed ${removedCount} inactive subscribers`);
    syncDatabase();
  }
}

// Run migration on startup
runMigration();

export function syncDatabase() {
  log("Writing DB");
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
