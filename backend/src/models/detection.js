export async function saveDetection(fastify, data) {
  const collection = fastify.mongo.db.collection('detections');

  const result = await collection.insertOne({
    originalImagePath: data.originalImagePath,
    annotatedImagePath: data.annotatedImagePath,
    detections: data.detections,
    inferenceTimeMs: data.inferenceTimeMs,
    createdAt: new Date(),
  });

  return result.insertedId;
}

export async function getRecentDetections(fastify, limit = 20) {
  const collection = fastify.mongo.db.collection('detections');

  return collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getPaginatedDetections(fastify, page = 1, pageSize = 12) {
  const collection = fastify.mongo.db.collection('detections');
  const skip = (page - 1) * pageSize;

  const [records, total] = await Promise.all([
    collection.find({}).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
    collection.countDocuments({}),
  ]);

  return {
    records,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    currentPage: page,
  };
}

export async function getDetectionById(fastify, id) {
  const collection = fastify.mongo.db.collection('detections');
  const { ObjectId } = fastify.mongo;

  return collection.findOne({ _id: new ObjectId(id) });
}