import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const ADMIN_EMAIL = 'sd22.rsr@gmail.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'CodeAtlas Admin';

async function upsertAdminUser() {
  await connectDB();

  let user = await User.findOne({ email: ADMIN_EMAIL }).select(
    '+password +verificationCode +verificationCodeExpires',
  );

  if (!user) {
    user = new User({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      isVerified: true,
      isAdmin: true,
    });
  } else {
    user.name = user.name || ADMIN_NAME;
    user.password = ADMIN_PASSWORD;
    user.isVerified = true;
    user.isAdmin = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
  }

  await user.save();

  console.log('Admin user is ready:');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log('Password: admin123');
  console.log(`User ID: ${user._id.toString()}`);
}

upsertAdminUser()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Failed to upsert admin user:', error);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
