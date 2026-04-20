require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');

// Schemas mappings
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
  console.log('Connected to MongoDB.');

  // Find or Create 'AI kids' Masterclass
  let aiClass = await Masterclass.findOne({ name: 'AI kids' });
  if (!aiClass) {
    aiClass = await Masterclass.create({ name: 'AI kids' });
  }

  // NOTE: WE DO NOT WIPE THE DB. WE APPEND.
  
  // 1. Parse MIS
  console.log('Loading AI_KIDS MIS Data...');
  const misResults = [];
  await new Promise((resolve) => {
    fs.createReadStream(path.join(__dirname, '../../AI_KIDS/AI_KIDS_Telecalling - MIS.csv'))
      .pipe(csv())
      .on('data', (data) => misResults.push(data))
      .on('end', () => resolve());
  });

  const misDocs = [];
  let insertedDateIds = new Set();

  for (const row of misResults) {
    if (!row['Date']) continue;
    // Prevent duplicated insertion if script runs twice
    if (insertedDateIds.has(row['Date'])) continue;
    insertedDateIds.add(row['Date']);

    misDocs.push({
      date: new Date(row['Date']),
      masterclass: aiClass._id,
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
  console.log(`Inserted ${misDocs.length} Daily MIS records for AI kids.`);

  // 2. Parse Agent Wise Monthly (Without built-in Headers in the file)
  console.log('Loading Agent-Wise Monthly Data...');
  const agentResults = [];
  await new Promise((resolve) => {
    fs.createReadStream(path.join(__dirname, '../../AI_KIDS/AI_KIDS_Telecalling - Agent-Wise Monthly.csv'))
      .pipe(csv({ headers: false }))
      .on('data', (data) => agentResults.push(data))
      .on('end', () => resolve());
  });

  const rowConverisons = agentResults[0]; // Object mapping indices '0', '1', '2'...
  const rowRevenue = agentResults[1];

  const agentMapIndex = {
    2: 'Kajal', 3: 'mariya', 4: 'Mohita', 5: 'Ankita', 6: 'Aditi',
    7: 'Varsha', 8: 'Anamika', 9: 'Smriti', 10: 'arun', 11: 'ASZAD'
  };

  const mockDate = new Date('2026-04-01');

  if (rowConverisons && rowRevenue) {
    for (const [indexStr, agentName] of Object.entries(agentMapIndex)) {
      const idx = Number(indexStr);
      
      let agent = await Agent.findOne({ name: agentName });
      if (!agent) {
        agent = await Agent.create({ name: agentName, masterclasses: [aiClass._id] });
      } else if (!agent.masterclasses.includes(aiClass._id)) {
        agent.masterclasses.push(aiClass._id);
        await agent.save();
      }

      const convVal = parseNum(rowConverisons[idx]);
      const revVal = parseNum(rowRevenue[idx]);

      // Using the UPSERT monthly logic exactly matching the new backend logic
      const startOfMonth = new Date(mockDate.getFullYear(), mockDate.getMonth(), 1);
      const endOfMonth = new Date(mockDate.getFullYear(), mockDate.getMonth() + 1, 1);

      await AgentContribution.findOneAndUpdate(
        {
          agent: agent._id,
          masterclass: aiClass._id,
          date: { $gte: startOfMonth, $lt: endOfMonth }
        },
        {
          $inc: {
            usersConverted: convVal,
            revenue: revVal
          },
          $setOnInsert: {
            date: mockDate
          }
        },
        { upsert: true, new: true }
      );
    }
  }

  console.log('Agent contributions processed and correctly mapped to agents.');
  console.log('AI_KIDS Data Append Complete!');
  process.exit();
}

run();
