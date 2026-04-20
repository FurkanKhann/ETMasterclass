require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');

// Schemas mappings manually to run correctly in script
const MasterclassSchema = new mongoose.Schema({ name: String });
const AgentSchema = new mongoose.Schema({ name: String, masterclasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Masterclass' }] });
const MISSchema = new mongoose.Schema({
  date: Date, agentsAvailable: Number,
  masterclass: { type: mongoose.Schema.Types.ObjectId },
  leadPushed: Number, dialed: Number, reachable: Number,
  totalEngaged: Number, interested: Number, usersConverted: Number,
  revenue: Number, agentTalkTimeDuration: String
});
const AgentContribSchema = new mongoose.Schema({
  date: Date, agent: { type: mongoose.Schema.Types.ObjectId },
  masterclass: { type: mongoose.Schema.Types.ObjectId },
  usersConverted: Number, revenue: Number
});

const Masterclass = mongoose.models.Masterclass || mongoose.model('Masterclass', MasterclassSchema);
const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
const MIS = mongoose.models.MIS || mongoose.model('MIS', MISSchema);
const AgentContribution = mongoose.models.AgentContribution || mongoose.model('AgentContribution', AgentContribSchema);

const parseNum = (str) => {
  if (!str || str.trim() === '' || str.includes('#DIV/0!')) return 0;
  return Number(str.replace(/,/g, '')) || 0;
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Wiping existing metrics...');

  // Reset MIS and AgentContrib completely
  await MIS.deleteMany({});
  await AgentContribution.deleteMany({});
  console.log('Cleared DB metrics successfully.');

  let mmClass = await Masterclass.findOne({ name: 'MM' });
  if (!mmClass) {
    mmClass = await Masterclass.create({ name: 'MM' });
  }

  // Parse MIS
  console.log('Loading MIS Data...');
  const misResults = [];
  await new Promise((resolve) => {
    fs.createReadStream(path.join(__dirname, '../../data/MM _Telecalling - MIS.csv'))
      .pipe(csv())
      .on('data', (data) => misResults.push(data))
      .on('end', () => resolve());
  });

  const misDocs = [];
  for (const row of misResults) {
    if (!row['Date']) continue;
    misDocs.push({
      date: new Date(row['Date']),
      masterclass: mmClass._id,
      agentsAvailable: parseNum(row['Agents available']),
      leadPushed: parseNum(row['Lead Pushed']),
      agentTalkTimeDuration: row['Agent Talk Time Duration'] || '00:00:00',
      dialed: parseNum(row['Dialed']),
      reachable: parseNum(row['Reachable']),
      totalEngaged: parseNum(row['Total Engaged']),
      interested: parseNum(row['Interested']),
      usersConverted: parseNum(row['Users Converted']),
      revenue: parseNum(row['Revenue'])
    });
  }

  await MIS.insertMany(misDocs);
  console.log(`Inserted ${misDocs.length} Daily MIS records for MM.`);

  // Parse Agent Wise Monthly
  console.log('Loading Agent-Wise Monthly Data...');
  const agentResults = [];
  await new Promise((resolve) => {
    fs.createReadStream(path.join(__dirname, '../../data/MM _Telecalling - Agent-Wise Monthly.csv'))
      .pipe(csv())
      .on('data', (data) => agentResults.push(data))
      .on('end', () => resolve());
  });

  const rowConverisons = agentResults.find(r => r['Type'] === 'Users Converted');
  const rowRevenue = agentResults.find(r => r['Type'] === 'Revenue');
  const mockDate = new Date('2026-04-01');

  if (rowConverisons && rowRevenue) {
    const skipKeys = ['Month', 'Type', '', 'Total'];
    for (const key of Object.keys(rowConverisons)) {
      if (skipKeys.includes(key)) continue;
      
      const agentName = key.trim();
      if (!agentName) continue;

      let agent = await Agent.findOne({ name: agentName });
      if (!agent) {
        agent = await Agent.create({ name: agentName, masterclasses: [mmClass._id] });
      } else if (!agent.masterclasses.includes(mmClass._id)) {
        agent.masterclasses.push(mmClass._id);
        await agent.save();
      }

      await AgentContribution.create({
        date: mockDate,
        masterclass: mmClass._id,
        agent: agent._id,
        usersConverted: parseNum(rowConverisons[key]),
        revenue: parseNum(rowRevenue[key])
      });
    }
  }

  console.log('Agent contributions processed.');
  console.log('Data Append Complete!');
  process.exit();
}

run();
