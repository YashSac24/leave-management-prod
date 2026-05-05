import { NextResponse } from 'next/server';
import Pusher from 'pusher';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth';

function getPusher() {
  if (!process.env.PUSHER_APP_ID || process.env.PUSHER_APP_ID === 'your_app_id') return null;
  return new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true
  });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 403 });
    
    const decoded = await verifyAccessToken(token) as any;
    if (!decoded) return new NextResponse('Unauthorized', { status: 403 });

    const text = await req.text();
    const params = new URLSearchParams(text);
    const socketId = params.get('socket_id') as string;
    const channelName = params.get('channel_name') as string;

    const pusher = getPusher();
    if (!pusher) return new NextResponse('Pusher not configured', { status: 500 });

    const userId = decoded.userId || decoded.id;
    const presenceData = {
      user_id: typeof userId === 'object' ? userId.toString() : String(userId),
      user_info: {
        name: decoded.name || 'User'
      }
    };

    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
