import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
      const { email, password } = await req.json();
  
      const user = await User.findOne({ email }) as IUser | null;
      if (!user) {
        return NextResponse.json({ error: 'Identity verification failed' }, { status: 401 });
      }

    if (user.isLocked) {
      return NextResponse.json({ error: 'Account locked. Contact administration or HR to change password.' }, { status: 403 });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { failedLoginAttempts: 1 } },
        { new: true }
      );
      
      if (updatedUser.failedLoginAttempts >= 5) {
        await User.updateOne({ _id: user._id }, { isLocked: true });
        return NextResponse.json({ error: 'Account locked due to 5 failed attempts. Contact administration or HR to change password.' }, { status: 403 });
      }
      
      return NextResponse.json({ error: 'Invalid credentials. Please check your email and password.' }, { status: 401 });
    }

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);

    // Store refresh token and reset failed attempts
    await User.findByIdAndUpdate(user._id, { 
      refreshToken, 
      failedLoginAttempts: 0 
    });

    const response = NextResponse.json({ 
      success: true, 
      user: { name: user.name, email: user.email, role: user.role } 
    });

    // Set HTTP-only cookies
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh', // Only sent to refresh endpoint
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
