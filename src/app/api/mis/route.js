import connectToDatabase from '@/lib/mongodb';
import { MIS } from '@/models';
import { NextResponse } from 'next/server';

export async function GET(req) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const masterclassId = searchParams.get('masterclass');
  const agentId = searchParams.get('agent');
  
  const query = {};
  if (masterclassId) query.masterclass = masterclassId;
  if (agentId) query.agent = agentId;
  
  const records = await MIS.find(query).populate('agent').populate('masterclass').sort({ date: 1 });
  return NextResponse.json(records);
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const data = await req.json();
    
    // Convert time duration "HH:MM:SS" logically or just store as string
    const newRecord = await MIS.create({
      ...data,
      date: new Date(data.date)
    });
    
    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error('MIS Posting Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
