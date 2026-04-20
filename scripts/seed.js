require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
});

const MasterclassSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  targetRevenue: { type: Number, default: 0 },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Masterclass = mongoose.models.Masterclass || mongoose.model('Masterclass', MasterclassSchema);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const hashedPassword = await bcrypt.hash('Pragati', 10);

    await User.findOneAndUpdate(
      { email: 'pragati.sawarn@timesinternet.in' },
      { password: hashedPassword, role: 'admin' },
      { upsert: true, new: true }
    );
    console.log('Admin user created or updated.');

    const classes = ['AI kids', 'AI_BP', 'MM', 'PM', 'V&V'];
    for (const c of classes) {
      await Masterclass.findOneAndUpdate(
        { name: c },
        { targetRevenue: 1000000 },
        { upsert: true }
      );
    }
    console.log('Masterclasses seeded.');

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
