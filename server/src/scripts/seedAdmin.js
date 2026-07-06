import dotenv from 'dotenv';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';

dotenv.config();

async function main() {
  await connectDb();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Off-Cam Admin';

  if (!email || !password || password === 'change-this-password') {
    throw new Error('Set ADMIN_EMAIL and a strong ADMIN_PASSWORD in server/.env before seeding.');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log(`Promoted existing user to admin: ${email}`);
    return;
  }

  await User.create({
    name,
    email,
    password,
    role: 'admin',
    isEmailVerified: true
  });

  console.log(`Created admin user: ${email}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import('mongoose');
    await mongoose.default.disconnect();
  });
