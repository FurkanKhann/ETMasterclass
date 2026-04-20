import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);

const MasterclassSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  targetRevenue: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Masterclass = mongoose.models.Masterclass || mongoose.model('Masterclass', MasterclassSchema);

const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  masterclasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Masterclass' }],
  createdAt: { type: Date, default: Date.now },
});

export const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);

const MISSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }, // Can be null for overall MIS
  masterclass: { type: mongoose.Schema.Types.ObjectId, ref: 'Masterclass' },
  agentsAvailable: { type: Number, default: 0 },
  leadPushed: { type: Number, default: 0 },
  dialed: { type: Number, default: 0 },
  reachable: { type: Number, default: 0 },
  totalEngaged: { type: Number, default: 0 },
  interested: { type: Number, default: 0 },
  usersConverted: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  agentTalkTimeDuration: { type: String, default: '00:00:00' },
});

export const MIS = mongoose.models.MIS || mongoose.model('MIS', MISSchema);

const AgentContribSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  masterclass: { type: mongoose.Schema.Types.ObjectId, ref: 'Masterclass', required: true },
  usersConverted: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
});

export const AgentContribution = mongoose.models.AgentContribution || mongoose.model('AgentContribution', AgentContribSchema);
