import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Define the Holiday schema locally if model doesn't exist yet, 
// though we usually have it in models/Holiday.ts
import Holiday from '@/models/Holiday';

export async function GET() {
  try {
    await connectDB();
    const holidays = await Holiday.find({}).sort({ date: 1 }).lean();
    return NextResponse.json({ success: true, holidays });
  } catch (error: any) {
    console.error('Fetch holidays error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch holidays' }, { status: 500 });
  }
}
