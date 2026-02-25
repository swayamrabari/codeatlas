/**
 * One-time migration: normalize all backslash paths in MongoDB to forward slashes.
 * Run with: node fix-paths.js
 */
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codeatlas';

async function fixPaths() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // --- Fix files collection ---
  const filesCol = db.collection('files');
  const fileCursor = filesCol.find({ path: /\\/ });
  let fixedFiles = 0;

  for await (const doc of fileCursor) {
    const newPath = doc.path.replace(/\\/g, '/');
    await filesCol.updateOne({ _id: doc._id }, { $set: { path: newPath } });
    fixedFiles++;
  }
  console.log(`Fixed ${fixedFiles} file paths`);

  // --- Fix features collection (categorizedFiles + rebuild fileIds) ---
  const featuresCol = db.collection('features');
  const featureCursor = featuresCol.find({});
  let fixedFeatures = 0;

  for await (const feat of featureCursor) {
    const update = {};
    let changed = false;

    // Fix categorizedFiles paths
    if (feat.categorizedFiles) {
      const cats = { ...feat.categorizedFiles };
      for (const [key, arr] of Object.entries(cats)) {
        if (Array.isArray(arr)) {
          const fixed = arr.map((p) => (typeof p === 'string' ? p.replace(/\\/g, '/') : p));
          if (fixed.some((p, i) => p !== arr[i])) {
            cats[key] = fixed;
            changed = true;
          }
        }
      }
      if (changed) {
        update.categorizedFiles = cats;
      }
    }

    // Rebuild fileIds from all categorized file paths
    const allPaths = [];
    if (feat.categorizedFiles) {
      for (const arr of Object.values(feat.categorizedFiles)) {
        if (Array.isArray(arr)) {
          for (const p of arr) {
            if (typeof p === 'string') allPaths.push(p.replace(/\\/g, '/'));
          }
        }
      }
    }

    if (allPaths.length > 0) {
      const matchingFiles = await filesCol
        .find({ projectId: feat.projectId, path: { $in: allPaths } }, { projection: { _id: 1 } })
        .toArray();
      update.fileIds = matchingFiles.map((f) => f._id);
      changed = true;
    }

    if (changed) {
      await featuresCol.updateOne({ _id: feat._id }, { $set: update });
      fixedFeatures++;
    }
  }
  console.log(`Fixed ${fixedFeatures} features (paths + fileIds)`);

  await mongoose.disconnect();
  console.log('Done!');
}

fixPaths().catch((err) => {
  console.error(err);
  process.exit(1);
});
