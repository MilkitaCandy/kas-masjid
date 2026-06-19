const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'rekap_kas';

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not configured.');
}

let cachedClient = global._mongoClient;
let cachedDb = global._mongoDb;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  const client = new MongoClient(uri);

  await client.connect();
  const db = client.db(dbName);

  global._mongoClient = client;
  global._mongoDb = db;

  return db;
}

module.exports = { connectToDatabase };
