import connectToDatabase from '@/lib/mongodb';
import { Agent } from '@/models';
import { NextResponse } from 'next/server';

export async function GET(req) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const masterclassId = searchParams.get('masterclass');
  
  const query = masterclassId ? { masterclasses: masterclassId } : {};
  const agents = await Agent.find(query).populate('masterclasses');
  return NextResponse.json(agents);
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const { name, masterclassId } = await req.json();
    
    // Check if agent exists
    let agent = await Agent.findOne({ name });
    
    if (agent) {
      if (!agent.masterclasses.includes(masterclassId)) {
        agent.masterclasses.push(masterclassId);
        await agent.save();
      }
    } else {
      agent = await Agent.create({ name, masterclasses: [masterclassId] });
    }
    
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
