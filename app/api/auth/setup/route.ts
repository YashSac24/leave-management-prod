import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    // Security check to prevent unauthorized setup in production
    const { searchParams } = new URL(req.url);
    const setupKey = searchParams.get('key');
    const expectedKey = process.env.SETUP_KEY;

    if (process.env.NODE_ENV === 'production' && (!expectedKey || setupKey !== expectedKey)) {
      return NextResponse.json({ error: 'Unauthorized setup request.' }, { status: 401 });
    }

    const email = process.env.ADMIN_INITIAL_EMAIL || 'admin@gmail.com';
    const password = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
    
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      return NextResponse.json({ message: 'Administrator already exists. No action taken.' });
    }

    await User.create({
      name: 'System Admin',
      email: email,
      password: password,
      role: 'Administrator'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Initial Administrator account created successfully!',
      info: 'Please delete this route or secure it properly before proceeding further.'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
