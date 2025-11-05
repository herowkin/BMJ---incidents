import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import { ROLES } from '../src/utils/roles.js';

dotenv.config();

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI');
    process.exit(1);
  }
  await connectDB(process.env.MONGO_URI);

  const email = 'admin@bmj.local';
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Admin already exists:', email);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'BMJ Admin',
    email,
    password: 'Admin@123',
    role: ROLES.ADMIN,
  });
  console.log('Created admin:', admin.email);
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
