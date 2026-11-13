// usage: npm run set-role -- user@example.com admin|authority|citizen
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';

const [email, role] = process.argv.slice(2);
if (!email || !['admin', 'authority', 'citizen'].includes(role)) {
  console.error('usage: npm run set-role -- <email> <admin|authority|citizen>');
  process.exit(1);
}
await connectDb();
const user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { role }, { new: true });
console.log(user ? `${user.email} is now ${role}` : 'No user with that e-mail');
await mongoose.disconnect();
