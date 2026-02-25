const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGOURI);
    console.log('Connected to database');

    const email = process.argv[2] || 'admin@trackit.com';
    const password = process.argv[3] || 'admin123';
    const name = process.argv[4] || 'Admin';

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists. Updating to admin...');
      existingUser.role = 'admin';
      await existingUser.save();
      console.log('✅ User updated to admin successfully!');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      provider: 'local',
      categories: {
        income: [],
        expense: [],
        investment: [],
        savings: [],
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', admin.role);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdmin();
