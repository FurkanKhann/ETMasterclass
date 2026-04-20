import connectToDatabase from '@/lib/mongodb';
import { Masterclass } from '@/models';
import { NextResponse } from 'next/server';

export async function GET() {
  await connectToDatabase();
  const classes = await Masterclass.find({}).sort({ createdAt: -1 });
  return NextResponse.json(classes);
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const { name, targetRevenue } = await req.json();
    const newClass = await Masterclass.create({ name, targetRevenue });
    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Masterclass already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
