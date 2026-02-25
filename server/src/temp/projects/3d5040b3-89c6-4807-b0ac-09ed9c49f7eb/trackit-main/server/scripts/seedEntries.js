require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Entry = require('../models/Entries');
const User = require('../models/User');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGOURI);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Main function
const seedEntries = async () => {
  try {
    // Get user email from command line argument
    const userEmail = process.argv[2];

    if (!userEmail) {
      console.error('❌ Please provide user email as argument');
      console.log('Usage: node server/scripts/seedEntries.js <user-email>');
      process.exit(1);
    }

    // Connect to database
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`❌ User with email "${userEmail}" not found`);
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user._id}`);

    // Read generated entries JSON file
    // Adjust path based on where you run the script from
    const entriesPath = path.join(
      __dirname,
      '../../client/src/json/generated-entries.json'
    );

    if (!fs.existsSync(entriesPath)) {
      console.error(`❌ Entries file not found at: ${entriesPath}`);
      await mongoose.connection.close();
      process.exit(1);
    }

    const rawEntries = JSON.parse(fs.readFileSync(entriesPath, 'utf-8'));
    console.log(`📄 Loaded ${rawEntries.length} entries from JSON file`);

    // Check if entries already exist for this user
    const existingCount = await Entry.countDocuments({ userId: user._id });
    if (existingCount > 0) {
      console.log(
        `⚠️  Warning: User already has ${existingCount} entries in database`
      );
      console.log('   The script will still proceed to insert new entries...');
    }

    // Map entries to database format
    const entriesToInsert = rawEntries.map((entry) => ({
      userId: user._id,
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      date: new Date(entry.date),
      description: entry.description || '',
    }));

    // Validate entries
    const invalidEntries = entriesToInsert.filter(
      (entry) =>
        !entry.type ||
        !entry.category ||
        entry.amount === undefined ||
        !entry.date
    );

    if (invalidEntries.length > 0) {
      console.error(`❌ Found ${invalidEntries.length} invalid entries`);
      await mongoose.connection.close();
      process.exit(1);
    }

    // Insert entries in batches (MongoDB recommends batches of 1000)
    const batchSize = 1000;
    let totalInserted = 0;

    console.log('📥 Inserting entries...');

    for (let i = 0; i < entriesToInsert.length; i += batchSize) {
      const batch = entriesToInsert.slice(i, i + batchSize);
      const result = await Entry.insertMany(batch, { ordered: false });
      totalInserted += result.length;
      console.log(
        `   Inserted batch ${Math.floor(i / batchSize) + 1}: ${
          result.length
        } entries (Total: ${totalInserted}/${entriesToInsert.length})`
      );
    }

    console.log(
      `\n✅ Successfully inserted ${totalInserted} entries for user: ${user.email}`
    );

    // Show summary
    const finalCount = await Entry.countDocuments({ userId: user._id });
    console.log(`📊 Total entries in database for this user: ${finalCount}`);

    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedEntries();
