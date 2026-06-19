const { connectToDatabase } = require('./mongodb');

const sendJson = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

exports.handler = async function(event) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('expenses');
    const method = event.httpMethod;
    const query = event.queryStringParameters || {};

    if (method === 'GET') {
      const expenses = await collection.find({}).toArray();
      return sendJson(200, { expenses });
    }

    if (method === 'POST' || method === 'PUT') {
      const body = event.body ? JSON.parse(event.body) : {};
      const expense = body;
      if (!expense.id) {
        return sendJson(400, { error: 'Missing expense id' });
      }

      await collection.updateOne(
        { _id: expense.id },
        { $set: { ...expense, updatedAt: new Date() } },
        { upsert: true }
      );

      return sendJson(200, { ok: true });
    }

    if (method === 'DELETE') {
      const id = query.id;
      if (!id) {
        return sendJson(400, { error: 'Missing id' });
      }

      await collection.deleteOne({ _id: id });
      return sendJson(200, { ok: true });
    }

    return sendJson(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Netlify Function /api/expenses error:', error);
    return sendJson(500, { error: 'Internal Server Error' });
  }
};
