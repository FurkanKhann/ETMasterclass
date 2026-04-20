import connectToDatabase from '@/lib/mongodb';
import { AgentContribution } from '@/models';
import { NextResponse } from 'next/server';

export async function GET(req) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const masterclassId = searchParams.get('masterclass');
  
  const query = {};
  if (masterclassId) query.masterclass = masterclassId;
  
  const records = await AgentContribution.find(query).populate('agent').sort({ date: -1 });
  return NextResponse.json(records);
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const data = await req.json();
    
    const dateObj = new Date(data.date);
    const startOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const endOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 1);

    // This checks if a record for this Masterclass + Agent + Month exists.
    // If so, it adds the new figures (upserting if not present).
    const newRecord = await AgentContribution.findOneAndUpdate(
      {
        agent: data.agent,
        masterclass: data.masterclass,
        date: { $gte: startOfMonth, $lt: endOfMonth }
      },
      {
        $inc: {
          usersConverted: Number(data.usersConverted) || 0,
          revenue: Number(data.revenue) || 0
        },
        $setOnInsert: {
          date: dateObj
        }
      },
      { upsert: true, new: true }
    );
    
    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
