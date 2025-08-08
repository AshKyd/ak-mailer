import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const DB_PATH = process.env.DB_PATH || "./data/mailer.json";

// Initialize database
export const db = {
  subscribers: [],
  lastMailout: 0,
};

// Load existing database if it exists
try {
  const jsonString = fs.readFileSync(DB_PATH, "utf8");
  console.log("loaded:", jsonString, typeof jsonString);

  const loadedDb = JSON.parse(jsonString);
  db.subscribers = loadedDb.subscribers;
  db.lastMailout = loadedDb.lastMailout;
} catch (error) {
  console.log(error);
  // Database doesn't exist, use default structure
  console.log("Creating new database file");
}

export function syncDatabase() {
  console.log("Writing DB");
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
