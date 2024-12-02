// Import modules
require("dotenv");
const { MongoClient } = require("mongodb");

// Import environment variables
MONGO_DB_USERNAME = process.env.MONGO_DB_USERNAME;
MONGO_DB_PASSWORD = process.env.MONGO_DB_PASSWORD;
MONGO_DB_NAME = process.env.MONGO_DB_NAME;
MONGO_DB_CONNECTION_URL = process.env.MONGO_DB_CONNECTION_URL;

// Define collections
MONGO_DB_COLLECTIONS = Object.freeze({
  USERS: "users",
  RECORDS: "records",
});

async function getMongoClient(url = MONGO_DB_CONNECTION_URL) {
  const client = new MongoClient(url);
  try {
    await client.connect();
    process.stdout.write("[MONGODB]: Server connected to MongoDB Atlas.\n");
    return client;
  } catch (error) {
    process.stdout.write(
      `[ERROR]: Connecting to MongoDB Atlas failed: ${error}\n`,
    );
    process.exit(1);
  }
}

module.exports = { MONGO_DB_NAME, MONGO_DB_COLLECTIONS, getMongoClient };
