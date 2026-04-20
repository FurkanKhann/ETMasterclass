require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Schemas mappings manually to run correctly in script
const MasterclassSchema = new mongoose.Schema({ name: String });
const AgentSchema = new mongoose.Schema({ name: String, masterclasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Masterclass' }] });
const AgentContribSchema = new mongoose.Schema({
  date: Date, agent: { type: mongoose.Schema.Types.ObjectId },
  masterclass: { type: mongoose.Schema.Types.ObjectId },
  usersConverted: Number, revenue: Number
});

const Masterclass = mongoose.models.Masterclass || mongoose.model('Masterclass', MasterclassSchema);
const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
const AgentContribution = mongoose.models.AgentContribution || mongoose.model('AgentContribution', AgentContribSchema);

const parseNum = (str) => {
  if (!str || str.trim() === '' || str.includes('#DIV/0!')) return 0;
  return Number(str.replace(/,/g, '').replace(/"/g, '')) || 0;
};

// Raw parse to handle quotes and commas properly
function parseCSVLine(text) {
  let inQuote = false;
  let currentToken = '';
  let tokens = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i+1] === '"') {
      currentToken += '"';
      i++;
    } else if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      tokens.push(currentToken.trim());
      currentToken = '';
    } else {
      currentToken += char;
    }
  }
  tokens.push(currentToken.trim());
  return tokens;
}

async function processFile(filePath, masterclassName) {
  let masterclass = await Masterclass.findOne({ name: masterclassName });
  if (!masterclass) masterclass = await Masterclass.create({ name: masterclassName });

  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l);

  if (lines.length < 3) return;

  const headers = parseCSVLine(lines[0]);
  const convRow = parseCSVLine(lines[1]);
  const revRow = parseCSVLine(lines[2]);

  const mockDate = new Date('2026-04-01');

  for (let i = 2; i < headers.length; i++) { // Skip first two metadata columns
    const agentName = headers[i];
    if (!agentName || agentName.toLowerCase() === 'total') continue;
    
    let agent = await Agent.findOne({ name: agentName });
    if (!agent) {
      agent = await Agent.create({ name: agentName, masterclasses: [masterclass._id] });
    } else if (!agent.masterclasses.includes(masterclass._id)) {
      agent.masterclasses.push(masterclass._id);
      await agent.save();
    }

    const cVal = parseNum(convRow[i]);
    const rVal = parseNum(revRow[i]);

    // Upsert exact month to keep idempotent
    const startOfMonth = new Date(mockDate.getFullYear(), mockDate.getMonth(), 1);
    const endOfMonth = new Date(mockDate.getFullYear(), mockDate.getMonth() + 1, 1);

    await AgentContribution.findOneAndUpdate(
      {
        agent: agent._id,
        masterclass: masterclass._id,
        date: { $gte: startOfMonth, $lt: endOfMonth }
      },
      {
        $set: { usersConverted: cVal, revenue: rVal, date: mockDate }
      },
      { upsert: true, new: true }
    );
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Wiping existing Agent Contributions ONLY ...');

  await AgentContribution.deleteMany({});
  console.log('Cleared Agent Contributions successfully.');

  console.log('Processing MM Agents...');
  await processFile(path.join(__dirname, '../../data/MM _Telecalling - Agent-Wise Monthly.csv'), 'MM');
  
  console.log('Processing AI_KIDS Agents...');
  await processFile(path.join(__dirname, '../../AI_KIDS/AI_KIDS_Telecalling - Agent-Wise Monthly.csv'), 'AI kids');

  console.log('Data Append Complete!');
  process.exit();
}

run();
