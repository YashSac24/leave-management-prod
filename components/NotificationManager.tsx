'use client';

import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import useSWR from 'swr';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Helper to decode ID from URL
const decodeId = (encoded: string) => {
  try { return atob(encoded); } catch { return encoded; }
};

export default function NotificationManager() {
  const { data: profileData } = useSWR('/api/user/profile', fetcher);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pusherRef = useRef<any>(null);
  const lastNotificationRef = useRef<string | null>(null);
  const notificationsRef = useRef<Notification[]>([]);

  // Use refs to track current route state without restarting Pusher
  const stateRef = useRef({ pathname, activeChatId: searchParams.get('userId') });

  useEffect(() => {
    stateRef.current = { pathname, activeChatId: searchParams.get('userId') };
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!profileData?.user) return;
    const user = profileData.user;
    const currentUserId = user._id || user.id;

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) return;

    if (!pusherRef.current) {
      pusherRef.current = new Pusher(pusherKey, {
        cluster: pusherCluster,
        channelAuthorization: {
          customHandler: async ({ socketId, channelName }, callback) => {
            try {
              const res = await fetch('/api/pusher/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `socket_id=${socketId}&channel_name=${channelName}`
              });
              if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
              const data = await res.json();
              callback(null, data);
            } catch (err: any) {
              callback(err, null);
            }
          }
        },
      });
    }

    const pusher = pusherRef.current;
    const channelName = `private-user-${currentUserId}`;
    const userChannel = pusher.subscribe(channelName);

    userChannel.bind('new-dm', (msg: any) => {
      // Avoid double notifications for the same message ID
      if (lastNotificationRef.current === msg._id) return;
      // Skip if I am the sender
      if (String(msg.senderId) === String(currentUserId)) return;
      
      lastNotificationRef.current = msg._id;

      const { pathname: currentPath, activeChatId: encodedChatId } = stateRef.current;
      const activeChatId = encodedChatId ? decodeId(encodedChatId) : null;
      const isWindowHidden = document.visibilityState === 'hidden';
      const isChatPage = currentPath === '/chat';
      const msgRoomId = msg.isGroup ? msg.conversationId : msg.senderId;

      if (isWindowHidden) {
        showBrowserNotification(msg);
      } else {
        // Robust string comparison
        const isLookingAtThisChat = isChatPage && String(activeChatId) === String(msgRoomId);
        if (!isLookingAtThisChat) {
          showToastNotification(msg);
        }
      }
    });

    const presenceChannel = pusher.subscribe('presence-chat');

    return () => {
      userChannel.unbind_all();
      presenceChannel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.unsubscribe('presence-chat');
    };
  }, [profileData?.user]);

  const showBrowserNotification = (msg: any) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (profileData?.user?.browserNotifications === false) return;

    const title = msg.isGroup ? `Group: ${msg.senderName}` : msg.senderName;
    const body = msg.text.startsWith('STICKER:') ? 'Sent a sticker' : msg.text;
    const icon = msg.senderAvatar || '/logo.png';

    const notification = new Notification(title, {
      body,
      icon,
      badge: '/logo.png',
      silent: false,
      requireInteraction: true
    });

    notificationsRef.current.push(notification);
    notification.onclose = () => {
      notificationsRef.current = notificationsRef.current.filter(n => n !== notification);
    };

    notification.onclick = () => {
      window.focus();
      router.push(`/chat?userId=${btoa(msg.isGroup ? msg.conversationId : msg.senderId).replace(/=/g, '')}`);
    };
  };

  const showToastNotification = (msg: any) => {
    const title = msg.isGroup ? `Group: ${msg.senderName}` : msg.senderName;
    const body = msg.text.startsWith('STICKER:') ? 'Sent a sticker' : msg.text;

    toast.info(
      <div
        onClick={() => router.push(`/chat?userId=${btoa(msg.isGroup ? msg.conversationId : msg.senderId).replace(/=/g, '')}`)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '4px 0'
        }}
      >
        {msg.senderAvatar && (
          <img
            src={msg.senderAvatar}
            alt=""
            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{body}</div>
        </div>
      </div>,
      {
        icon: false, // Using custom icon inside the flex container for better control
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }
    );
  };

  return null;
}
