const { connectToDatabase } = require('./mongodb');

const sendJson = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

exports.handler = async function(event) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('kas');
    const method = event.httpMethod;
    const query = event.queryStringParameters || {};

    if (method === 'GET') {
      const docs = await collection.find({}).toArray();
      const kas = docs.reduce((acc, doc) => {
        acc[doc._id] = {
          pemasukan: doc.pemasukan || 0,
          pengeluaran: doc.pengeluaran || 0,
          manualPengeluaran: doc.manualPengeluaran || 0,
          updatedAt: doc.updatedAt,
        };
        return acc;
      }, {});
      return sendJson(200, { kas });
    }

    if (method === 'POST' || method === 'PUT') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { key, data } = body;
      if (!key || !data) {
        return sendJson(400, { error: 'Missing key or data' });
      }

      await collection.updateOne(
        { _id: key },
        { $set: { ...data, updatedAt: new Date() } },
        { upsert: true }
      );

      return sendJson(200, { ok: true });
    }

    if (method === 'DELETE') {
      const key = query.key;
      if (!key) {
        return sendJson(400, { error: 'Missing key' });
      }

      await collection.deleteOne({ _id: key });
      return sendJson(200, { ok: true });
    }

    return sendJson(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Netlify Function /api/kas error:', error);
    return sendJson(500, { error: 'Internal Server Error' });
  }
};
