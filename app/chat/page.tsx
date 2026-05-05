'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Pusher from 'pusher-js';
import useSWR from 'swr';
import { Send, MessageSquare, Search, Check, CheckCheck, X, Users, Sparkles, MessageCircle, AlertCircle, Smile, MoreVertical, Copy, Trash, Reply, Pin, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Skeleton } from 'boneyard-js/react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Helper to hide ID in URL
const encodeId = (id: string) => btoa(id).replace(/=/g, '');
const decodeId = (encoded: string) => {
  try { return atob(encoded); } catch { return encoded; }
};

const isOnlyEmojis = (text: string) => {
  const t = text.trim();
  return t.length > 0 && /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\s]+$/u.test(t);
};

const STICKERS = [
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Smiling%20Eyes.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Star-Struck.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Loudly%20Crying%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Red%20Heart.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Hearts.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Face%20with%20Tears%20of%20Joy.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Pleading%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Exploding%20Head.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Partying%20Face.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Heart%20on%20Fire.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Sunglasses.png',
  'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Zany%20Face.png'
];

const chatSidebarStyles = `
  .room-item:hover .room-menu-trigger {
    opacity: 1 !important;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #222;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #333;
  }
`;

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: string;
  read: boolean;
  error?: boolean;
  pinned?: boolean;
  pinnedBy?: string;
  isGroup?: boolean;
  replyTo?: { _id: string; text: string; senderName: string };
}

interface Contact {
  _id: string;
  name: string;
  email: string;
  designation?: string;
  avatar?: string;
  role?: string;
  isGroup?: boolean;
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  adminId: string;
  members: string[];
  isGroup: boolean;
}

type ChatRoom = Contact | Group;

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const encodedUserId = searchParams.get('userId');
  const targetUserId = encodedUserId ? decodeId(encodedUserId) : null;

  const { data: profileData } = useSWR('/api/user/profile', fetcher);
  const { data: teamData } = useSWR('/api/team', fetcher);
  const { data: groupsData, mutate: mutateGroups } = useSWR('/api/chat/groups', fetcher);
  const currentUser = profileData?.user;

  const [isMobile, setIsMobile] = useState(false);
  const isInitialLoading = !profileData || !teamData || !groupsData;

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  const [selectedContact, setSelectedContact] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [lastMsgMap, setLastMsgMap] = useState<Record<string, string>>({}); // contactId → timestamp
  const [lastMsgTextMap, setLastMsgTextMap] = useState<Record<string, string>>({}); // contactId → text preview
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupAvatarPicker, setShowGroupAvatarPicker] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [tempSelectedMembers, setTempSelectedMembers] = useState<string[]>([]);
  const [showEmojis, setShowEmojis] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker'>('emoji');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
    loading?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'info', loading: false });
  const [pinnedRooms, setPinnedRooms] = useState<string[]>([]);
  const [activeRoomMenu, setActiveRoomMenu] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pusherRef = useRef<any>(null);
  const userPusherRef = useRef<any>(null);
  const selectedContactRef = useRef<ChatRoom | null>(null);

  const pollSidebar = useCallback(() => {
    fetch('/api/chat/unread')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUnreadMap(prev => JSON.stringify(prev) !== JSON.stringify(data.unreadMap) ? data.unreadMap : prev);
          setLastMsgMap(prev => JSON.stringify(prev) !== JSON.stringify(data.lastMsgMap) ? data.lastMsgMap : prev);
          setLastMsgTextMap(prev => JSON.stringify(prev) !== JSON.stringify(data.lastMsgTextMap) ? data.lastMsgTextMap : prev);
        }
      })
      .catch(console.error);
  }, []);

  // Load initial unread counts & timestamps
  useEffect(() => {
    pollSidebar();

    // Load pinned rooms from local storage
    const saved = localStorage.getItem('pinned_chats');
    if (saved) setPinnedRooms(JSON.parse(saved));
  }, [pollSidebar]);



  const togglePinRoom = (roomId: string) => {
    const newPinned = pinnedRooms.includes(roomId)
      ? pinnedRooms.filter(id => id !== roomId)
      : [...pinnedRooms, roomId];
    setPinnedRooms(newPinned);
    localStorage.setItem('pinned_chats', JSON.stringify(newPinned));
    setActiveRoomMenu(null);
  };

  // Auto-select contact from URL parameter
  useEffect(() => {
    if (targetUserId && teamData?.members && groupsData?.groups && !selectedContact) {
      const allRooms = [...(teamData.members || []), ...(groupsData.groups || [])];
      const room = allRooms.find(r => r._id === targetUserId);
      if (room) {
        selectContact(room);
        // Clear the URL parameter without refreshing
        window.history.replaceState(null, '', '/chat');
      }
    }
  }, [targetUserId, teamData, groupsData, selectedContact]);

  const contacts: Contact[] = useMemo(() => {
    const list = [...(teamData?.members || [])];
    if (profileData?.user) {
      const u = profileData.user;
      const selfId = u.id || u._id;
      if (!list.find(c => c._id === selfId)) {
        list.push({
          _id: selfId,
          name: u.name + ' (You)',
          email: u.email,
          role: u.role,
          designation: u.designation || u.role,
          avatar: u.avatar,
          isGroup: false
        });
      }
    }
    return list.map((c: any) => ({ ...c, isGroup: false }));
  }, [teamData, profileData]);

  const groups: Group[] = (groupsData?.groups || []).map((g: any) => ({ ...g, isGroup: true }));
  const rooms: ChatRoom[] = [...contacts, ...groups];

  // Sort: Pinned first, then rooms with unread first, then by last message time, then alphabetically
  const sortedRooms = rooms
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aPinned = pinnedRooms.includes(a._id);
      const bPinned = pinnedRooms.includes(b._id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      const aUnread = unreadMap[a._id] || 0;
      const bUnread = unreadMap[b._id] || 0;
      if (bUnread !== aUnread) return bUnread - aUnread;
      const aTime = lastMsgMap[a._id] || '';
      const bTime = lastMsgMap[b._id] || '';
      if (bTime !== aTime) return bTime > aTime ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

  const getAvatar = (name: string, avatar?: string) =>
    avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;

  const makeConvId = (id1: string, id2: string) => [id1, id2].sort().join('-');

  const loadMessages = useCallback(async (contact: ChatRoom) => {
    setLoadingMessages(true);
    setMessages([]);
    setReplyingTo(null);
    try {
      const url = contact.isGroup ? `/api/chat?groupId=${contact._id}` : `/api/chat?with=${contact._id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
      setUnreadMap(prev => ({ ...prev, [contact._id]: 0 }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const pollMessages = useCallback(async (contact: ChatRoom) => {
    try {
      const url = contact.isGroup ? `/api/chat?groupId=${contact._id}` : `/api/chat?with=${contact._id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMessages(prev => {
          // Filter out optimistic temp messages from current state
          const confirmedPrev = prev.filter(m => !m._id?.toString().startsWith('temp-'));
          // Compare only confirmed (non-temp) message counts and latest ID
          const lastConfirmedId = confirmedPrev[confirmedPrev.length - 1]?._id;
          const lastFetchedId = data.messages[data.messages.length - 1]?._id;
          const hasNewMessages = data.messages.length > confirmedPrev.length;
          const lastIdChanged = lastFetchedId && lastConfirmedId && lastFetchedId !== lastConfirmedId;
          const readChanged = data.messages.length > 0 && prev.length > 0 &&
            data.messages[data.messages.length - 1].read !== prev[prev.length - 1].read;

          if (hasNewMessages || lastIdChanged || readChanged) {
            // Preserve any temp messages that haven't been confirmed yet
            const tempMsgs = prev.filter(m => m._id?.toString().startsWith('temp-'));
            return [...data.messages, ...tempMsgs];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, []);

  // Polling fallback — fires every 5s for messages, 10s for sidebar
  // Works alongside Pusher; fixed pollMessages fn handles temp-ID conflicts
  useEffect(() => {
    const sid = setInterval(pollSidebar, 10000);
    return () => clearInterval(sid);
  }, [pollSidebar]);

  useEffect(() => {
    if (!selectedContact) return;
    const mid = setInterval(() => pollMessages(selectedContact), 5000);
    return () => clearInterval(mid);
  }, [selectedContact, pollMessages]);

  const selectContact = (contact: ChatRoom) => {
    setSelectedContact(contact);
    selectedContactRef.current = contact;
    
    // Update URL with obfuscated ID
    router.replace(`/chat?userId=${encodeId(contact._id)}`, { scroll: false });

    setUnreadMap(prev => ({ ...prev, [contact._id]: 0 })); // clear badge
    loadMessages(contact);
    // Mark as read when selecting a contact
    if (!contact.isGroup) {
      fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: contact._id, isGroup: false })
      }).catch(console.error);
    }
  };
  // 2. Room-specific subscription (Subscribes/Unsubscribes on contact change)
  useEffect(() => {
    if (!selectedContact || !currentUser || !pusherRef.current) return;

    const pusher = pusherRef.current;
    const currentUserId = currentUser._id || currentUser.id;
    const convId = selectedContact.isGroup ? selectedContact._id : makeConvId(currentUserId, selectedContact._id);
    const channelName = selectedContact.isGroup ? `group-${convId}` : `dm-${convId}`;

    const channel = pusher.subscribe(channelName);

    channel.bind('new-message', (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        const myId = currentUser?._id || currentUser?.id;

        // Match with optimistic message
        if (msg.senderId === myId) {
          const tempIdx = prev.findIndex(m =>
            m.senderId === myId &&
            m.text === msg.text &&
            m._id?.toString().startsWith('temp-')
          );
          if (tempIdx !== -1) {
            const newMsgs = [...prev];
            newMsgs[tempIdx] = msg;
            return newMsgs;
          }
        }
        return [...prev, msg];
      });

      const roomId = msg.isGroup ? msg.conversationId : (msg.senderId === currentUserId ? msg.receiverId : msg.senderId);
      const prefix = msg.isGroup ? `${msg.senderName}: ` : '';
      const previewText = msg.text.startsWith('STICKER:') ? 'Sent a sticker' : msg.text;
      setLastMsgTextMap(prev => ({ ...prev, [roomId]: prefix + previewText }));
      setLastMsgMap(prev => ({ ...prev, [roomId]: msg.createdAt }));

      if (msg.senderId !== currentUserId) {
        setUnreadMap(prev => ({ ...prev, [roomId]: 0 }));
        if (selectedContactRef.current?._id === roomId) {
          fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactId: roomId, isGroup: !!msg.isGroup })
          }).catch(console.error);
        }
      }
    });

    channel.bind('messages-read', (data: { readerId: string, readAt: string }) => {
      setMessages(prev => prev.map(m => (m.senderId === currentUserId && !m.read) ? { ...m, read: true, readAt: new Date(data.readAt) } : m));
    });

    channel.bind('message-updated', (data: { _id: string, pinned: boolean, pinnedBy?: string }) => {
      setMessages(prev => prev.map(m => m._id?.toString() === data._id?.toString() ? { ...m, pinned: data.pinned, pinnedBy: data.pinnedBy } : m));
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [selectedContact?._id, currentUser?._id || currentUser?.id]);
  // 1. Unified Pusher initialization (Run once when currentUser is available)
  useEffect(() => {
    if (!currentUser) return;
    const currentUserId = currentUser._id || currentUser.id;

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!pusherKey || !pusherCluster) {
      console.warn('[PUSHER] Missing keys, falling back to polling');
      return;
    }

    // Initialize Pusher only if it doesn't exist
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

    // Subscribe to Global/Notification channels
    const userChannel = pusher.subscribe(`private-user-${currentUserId}`);
    const presenceChannel = pusher.subscribe('presence-chat');

    userChannel.bind('new-dm', (msg: Message) => {
      const myId = currentUser?._id || currentUser?.id;
      const targetId = msg.isGroup ? msg.conversationId : (msg.senderId === myId ? msg.receiverId : msg.senderId);
      const prefix = msg.isGroup ? `${msg.senderName}: ` : '';
      const previewText = msg.text.startsWith('STICKER:') ? 'Sent a sticker' : msg.text;

      setLastMsgTextMap(prev => ({ ...prev, [targetId]: prefix + previewText }));
      setLastMsgMap(prev => ({ ...prev, [targetId]: msg.createdAt }));

      // Only increment unread if not currently chatting with that room
      const currentSelectedId = selectedContactRef.current?._id?.toString();
      if (currentSelectedId !== targetId) {
        setUnreadMap(prev => ({ ...prev, [targetId]: (prev[targetId] || 0) + 1 }));
      }
    });

    presenceChannel.bind('pusher:subscription_succeeded', (members: any) => {
      setOnlineUsers(new Set(Object.keys(members.members)));
    });
    presenceChannel.bind('pusher:member_added', (member: any) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.add(member.id);
        return next;
      });
    });
    presenceChannel.bind('pusher:member_removed', (member: any) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    });

    return () => {
      userChannel.unbind_all();
      presenceChannel.unbind_all();
      pusher.unsubscribe(`private-user-${currentUserId}`);
      pusher.unsubscribe('presence-chat');
    };
  }, [currentUser?._id || currentUser?.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages.length]);

  // Click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojis(false);
      }
    };
    if (showEmojis) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojis]);

  // Global Escape key listener to "get back" or close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Priority: Close modals/menus first, then deselect contact
        if (showEmojis) { setShowEmojis(false); return; }
        if (showAddMemberModal) { setShowAddMemberModal(false); return; }
        if (showCreateGroup) { setShowCreateGroup(false); return; }
        if (showGroupAvatarPicker) { setShowGroupAvatarPicker(false); return; }
        if (confirmModal.isOpen) { setConfirmModal(prev => ({ ...prev, isOpen: false })); return; }
        if (activeMenu) { setActiveMenu(null); return; }
        if (activeRoomMenu) { setActiveRoomMenu(null); return; }
        if (replyingTo) { setReplyingTo(null); return; }
        if (showProfile) { setShowProfile(false); return; }

        // If nothing else is open, deselect the chat
        if (selectedContact) {
          setSelectedContact(null);
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showEmojis, showAddMemberModal, showCreateGroup, showGroupAvatarPicker, confirmModal.isOpen, activeMenu, activeRoomMenu, replyingTo, showProfile, selectedContact]);

  const togglePin = async (msgId: string, forceState?: boolean) => {
    if (!msgId) return;
    setActiveMenu(null);

    let finalState: boolean;

    // Optimistic update using functional state to ensure we have latest
    setMessages(prev => {
      const msg = prev.find(m => m._id?.toString() === msgId.toString());
      if (!msg) return prev;

      finalState = typeof forceState === 'boolean' ? forceState : !msg.pinned;
      console.log(`[PIN] Toggling msg ${msgId} to ${finalState}`);

      return prev.map(m =>
        m._id?.toString() === msgId.toString()
          ? { ...m, pinned: finalState, pinnedBy: finalState ? currentUser?.name : undefined }
          : m
      );
    });

    try {
      const res = await fetch(`/api/chat/${msgId}/pin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: typeof forceState === 'boolean' ? JSON.stringify({ pinned: forceState }) : undefined
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('[PIN] API Failed:', err);
        // Revert optimistic on failure
        setMessages(prev => prev.map(m => m._id?.toString() === msgId.toString() ? { ...m, pinned: !finalState } : m));
      } else {
        // Focus input after pinning for convenience
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch (e) {
      console.error('[PIN] Network error:', e);
      // Revert optimistic on failure
      setMessages(prev => prev.map(m => m._id?.toString() === msgId.toString() ? { ...m, pinned: !finalState } : m));
    }
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text?.startsWith?.('STICKER:') ? text.substring(8) : text);
    setActiveMenu(null);
  };

  const scrollToMessage = (msgId: string) => {
    if (!msgId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ block: 'center' });
      // Visual highlight effect
      const originalFilter = el.style.filter;
      const originalTransition = el.style.transition;
      el.style.transition = 'all 0.3s ease';
      el.style.filter = 'brightness(1.5) drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))';
      setTimeout(() => {
        el.style.filter = originalFilter;
        setTimeout(() => { el.style.transition = originalTransition; }, 300);
      }, 800);
    }
  };
  const sendMessage = async (textOverride?: string) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : input.trim();
    if (!textToSend || !selectedContact || !currentUser) return;
    const text = textToSend;
    if (typeof textOverride !== 'string') setInput('');
    const replyData = replyingTo ? { _id: replyingTo._id, text: replyingTo.text, senderName: replyingTo.senderName } : undefined;
    console.log('[REPLY DEBUG] replyingTo:', replyingTo, 'replyData:', replyData);
    setReplyingTo(null);

    // Optimistic insert — show message immediately
    const currentUserId = currentUser._id || currentUser.id;
    const isGroup = !!selectedContact.isGroup;
    const optimisticMsg: Message = {
      _id: `temp-${Date.now()}`,
      conversationId: isGroup ? selectedContact._id : makeConvId(currentUserId, selectedContact._id),
      senderId: currentUserId,
      receiverId: selectedContact._id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar || '',
      text,
      createdAt: new Date().toISOString(),
      read: false,
      isGroup,
      replyTo: replyData
    };
    setMessages(prev => [...prev, optimisticMsg]);

    // Update sidebar preview immediately for sender too
    const roomId = isGroup ? selectedContact._id : selectedContact._id; // selectedContact._id is the other person in DM
    const prefix = isGroup ? `${currentUser.name}: ` : '';
    const previewContent = text.startsWith('STICKER:') ? 'Sent a sticker' : text;
    setLastMsgTextMap(prev => ({ ...prev, [roomId]: prefix + previewContent }));
    setLastMsgMap(prev => ({ ...prev, [roomId]: optimisticMsg.createdAt }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: selectedContact._id, text, replyTo: replyData, isGroup })
      });
      const data = await res.json();
      // Replace optimistic msg with real one from server
      if (data.success) {
        setMessages(prev => {
          const realId = data.message._id?.toString();
          const hasReal = prev.some(m => m._id?.toString() === realId);
          const withoutOptimistic = prev.filter(m => m._id !== optimisticMsg._id);
          if (hasReal) {
            // Pusher already added it — update it in place with full data (includes replyTo)
            return withoutOptimistic.map(m => m._id?.toString() === realId ? { ...m, ...data.message } : m);
          }
          // Pusher not fired yet — add real message
          return [...withoutOptimistic, data.message];
        });
      }
    } catch (err) {
      console.error(err);
      // Mark optimistic message as error on failure
      setMessages(prev => prev.map(m => m._id === optimisticMsg._id ? { ...m, error: true } : m));
    }
  };

  const removeMember = async (groupId: string, memberId: string) => {
    const user = contacts.find(c => c._id === memberId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${user?.name || 'this member'} from the group?`,
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const currentGroup = groups.find(g => g._id === groupId);
          if (!currentGroup) return;
          const newMembers = currentGroup.members.filter(m => m !== memberId);
          const res = await fetch(`/api/chat/groups/${groupId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ members: newMembers })
          });
          if (res.ok) {
            mutateGroups();
            setSelectedContact(prev => prev ? { ...prev, members: newMembers } : null);
          }
        } catch (err) {
          console.error('Error removing member:', err);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const deleteGroup = async (groupId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Group',
      message: 'Are you sure you want to permanently delete this group? This action cannot be undone and all messages will be lost.',
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const res = await fetch(`/api/chat/groups/${groupId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            mutateGroups();
            setSelectedContact(null);
            setShowProfile(false);
          }
        } catch (err) {
          console.error('Error deleting group:', err);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const deleteMessage = async (msgId: string) => {
    setActiveMenu(null);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Message',
      message: 'Are you sure you want to permanently delete this message?',
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const res = await fetch(`/api/chat/${msgId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            setMessages(prev => prev.filter(m => m._id?.toString() !== msgId.toString()));
          }
        } catch (err) {
          console.error('Error deleting message:', err);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const openAddMemberModal = () => {
    setTempSelectedMembers([]);
    setGroupSearch('');
    setShowAddMemberModal(true);
  };

  const addMembersToGroup = async () => {
    if (!selectedContact || tempSelectedMembers.length === 0) return;
    try {
      const currentGroup = groups.find(g => g._id === selectedContact._id);
      if (!currentGroup) return;

      const newMembers = Array.from(new Set([...currentGroup.members, ...tempSelectedMembers]));

      const res = await fetch(`/api/chat/groups/${selectedContact._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: newMembers })
      });

      if (res.ok) {
        mutateGroups();
        setSelectedContact(prev => prev ? { ...prev, members: newMembers } : null);
        setShowAddMemberModal(false);
        setTempSelectedMembers([]);
      }
    } catch (err) {
      console.error('Error adding members:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const isMine = (msg: Message) => {
    const currentUserId = currentUser?._id || currentUser?.id;
    return msg.senderId?.toString() === currentUserId?.toString();
  };

  return (
    <Skeleton name="chat" loading={isInitialLoading}>
      <div style={{ display: 'flex', height: '100vh', background: '#000', overflow: 'hidden' }}>
      <style>{chatSidebarStyles}</style>
      {/* ── Left: Sidebar ── */}
      <div style={{ width: '320px', flexShrink: 0, borderRight: '1px solid #111', display: 'flex', flexDirection: 'column', background: '#000' }}>
        {/* Header */}
        <div style={{ height: '64px', padding: '0 1rem', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', flexShrink: 0, gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '8px 8px 8px 30px', color: 'white', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
            />
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #1a1a1a', background: '#0a0a0a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#111'}
            onMouseLeave={e => e.currentTarget.style.background = '#0a0a0a'}
          >
            <Users size={18} />
          </button>
        </div>

        {/* Rooms */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {sortedRooms.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>No conversations found</div>
          )}
          {sortedRooms.map(room => {
            const isSelected = selectedContact?._id === room._id;
            const unreadCount = unreadMap[room._id] || 0;
            const lastMsgTime = lastMsgMap[room._id];
            const isPinned = pinnedRooms.includes(room._id);

            return (
              <div
                key={room._id}
                onClick={() => selectContact(room)}
                className="room-item"
                style={{
                  width: '100%', padding: '12px 1rem', display: 'flex', alignItems: 'center', gap: '12px', background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', textAlign: 'left', marginBottom: '2px', borderRadius: '0 12px 12px 0'
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {room.isGroup ? (
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {room.avatar ? (
                        <img src={room.avatar} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                      ) : (
                        <Users size={20} color="#3b82f6" />
                      )}
                    </div>
                  ) : (
                    <img src={getAvatar(room.name, (room as Contact).avatar)} style={{ width: '42px', height: '42px', borderRadius: '12px', border: '1px solid #1a1a1a', objectFit: 'cover' }} />
                  )}
                  {!room.isGroup && onlineUsers.has(room._id) && (
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid #000' }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: unreadCount > 0 ? 700 : 600, color: isSelected ? '#fff' : '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {room.name}
                      {isPinned && <Pin size={12} color="#3b82f6" style={{ transform: 'rotate(45deg)' }} />}
                    </div>

                    {unreadCount > 0 && <div style={{ background: '#3b82f6', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>{unreadCount}</div>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: unreadCount > 0 ? '#aaa' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastMsgTextMap[room._id]
                      ? (lastMsgTextMap[room._id].includes('STICKER:') ? lastMsgTextMap[room._id].split('STICKER:')[0] + 'Sent a sticker' : lastMsgTextMap[room._id])
                      : (room.isGroup ? `${(room as Group).members?.filter(mId => contacts.some(c => c._id === mId)).length || 0} members` : (room as Contact).designation || (room as Contact).role)}
                  </div>
                </div>

                {/* 3-Dot Menu Button (Hover Only) */}
                <div
                  className="room-menu-trigger"
                  onClick={(e) => { e.stopPropagation(); setActiveRoomMenu(activeRoomMenu === room._id ? null : room._id); }}
                  style={{ opacity: activeRoomMenu === room._id ? 1 : 0, padding: '6px', borderRadius: '6px', color: '#666', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#666'}
                >
                  <MoreVertical size={16} />
                </div>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {activeRoomMenu === room._id && (
                    <>
                      <div
                        onClick={(e) => { e.stopPropagation(); setActiveRoomMenu(null); }}
                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        style={{ position: 'absolute', right: '10px', top: '45px', background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '4px', zIndex: 50, minWidth: '120px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePinRoom(room._id); }}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#eee', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#222'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Pin size={14} /> {pinnedRooms.includes(room._id) ? 'Unpin Chat' : 'Pin Chat'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!room.isGroup) {
                              setTempSelectedMembers([room._id]);
                            } else {
                              setTempSelectedMembers([]);
                            }
                            setShowCreateGroup(true);
                            setActiveRoomMenu(null);
                          }}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#eee', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#222'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Users size={14} /> Create Group
                        </button>
                        {room.isGroup && (room as Group).adminId === (currentUser?.id || currentUser?._id) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteGroup(room._id); setActiveRoomMenu(null); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Trash size={14} /> Delete Group
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Conversation ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: '#000' }}>
        {!selectedContact ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', position: 'relative', overflow: 'hidden' }}>

            {/* Illustration Container */}
            <div style={{ position: 'relative', width: '160px', height: '160px', marginBottom: '2rem', zIndex: 1 }}>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div style={{ width: '100px', height: '100px', borderRadius: '30px', background: 'linear-gradient(135deg, #111 0%, #050505 100%)', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8)', transform: 'rotate(-5deg)' }}>
                  <Users size={40} color="#fff" style={{ opacity: 0.8 }} />
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                style={{ position: 'absolute', top: '10%', right: '5%' }}
              >
                <div style={{ width: '70px', height: '70px', borderRadius: '22px', background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 30px -10px rgba(0,0,0,0.9)', transform: 'rotate(10deg)' }}>
                  <MessageCircle size={28} color="#3b82f6" />
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
                style={{ position: 'absolute', bottom: '15%', left: '0%' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#000', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color="#ec4899" />
                </div>
              </motion.div>
            </div>

            <motion.h3
              initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="outfit" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0 0 12px', zIndex: 1, letterSpacing: '-0.5px' }}
            >
              Your Workspace
            </motion.h3>
            <motion.p
              initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-dim)', maxWidth: '280px', textAlign: 'center', lineHeight: 1.5, zIndex: 1 }}
            >
              Select a colleague from the sidebar to start a seamless conversation.
            </motion.p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div
              onClick={() => setShowProfile(!showProfile)}
              style={{ height: '64px', padding: '0 2rem', background: '#000', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, position: 'relative', zIndex: 10, cursor: 'pointer' }}
            >
              {selectedContact.isGroup ? (
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {selectedContact.avatar ? (
                    <img src={selectedContact.avatar} alt="group" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Users size={20} color="#3b82f6" />
                  )}
                </div>
              ) : (
                <img src={getAvatar(selectedContact.name, (selectedContact as Contact).avatar)} alt={selectedContact.name}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #1a1a1a', objectFit: 'cover' }} />
              )}
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>{selectedContact.name}</div>
                <div style={{ fontSize: '0.75rem', color: (selectedContact.isGroup || onlineUsers.has(selectedContact._id)) ? '#10b981' : '#888', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, marginTop: '2px' }}>
                  {!selectedContact.isGroup && (
                    <>
                      <span style={{ width: '6px', height: '6px', background: onlineUsers.has(selectedContact._id) ? '#10b981' : '#666', borderRadius: '50%' }} />
                      {onlineUsers.has(selectedContact._id) ? 'Active Now' : 'Offline'}
                    </>
                  )}
                  {selectedContact.isGroup && `${(selectedContact as Group).members?.filter(mId => contacts.some(c => c._id === mId)).length || 0} members`}
                </div>
              </div>
            </div>

            {messages.filter(m => m.pinned).length > 0 && (
              <div style={{ maxHeight: '135px', overflowY: 'auto', flexShrink: 0, zIndex: 5, borderBottom: '1px solid #111' }}>
                {messages.filter(m => m.pinned).map(pMsg => (
                  <div key={`pin-${pMsg._id}`} style={{ padding: '12px 2rem', background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#111'} onMouseLeave={e => e.currentTarget.style.background = '#0a0a0a'} onClick={() => {
                    const el = document.getElementById(`msg-${pMsg._id}`);
                    if (el) el.scrollIntoView({ block: 'center' });
                  }}>
                    <Pin size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#ccc' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>Pinned: {pMsg.senderName}</span> - <span style={{ opacity: 0.8 }}>{pMsg.text?.startsWith?.('STICKER:') ? 'Sticker' : pMsg.text}</span>
                      {pMsg.pinnedBy && <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '2px' }}>Pinned by {pMsg.pinnedBy}</div>}
                    </div>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(pMsg._id, false); }} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'transparent'; }}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '16px', scrollBehavior: 'smooth' }}>
              {loadingMessages ? (
                <MessageSkeleton />
              ) : (
                <>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)', margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1a1a1a' }}>
                        <MessageSquare size={20} style={{ opacity: 0.5 }} />
                      </div>
                      <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.7 }}>Start a conversation with {selectedContact.name}</p>
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {messages.map((msg, index) => {
                      const mine = isMine(msg);
                      const isEmojiOnly = isOnlyEmojis(msg.text);
                      const isNearBottom = index >= messages.length - 3;
                      const isNearTop = index < 3;
                      const isBeingRepliedTo = replyingTo?._id === msg._id;
                      return (
                        <motion.div key={msg._id?.toString()}
                          id={`msg-${msg._id}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: isBeingRepliedTo ? 1.02 : 1,
                            x: isBeingRepliedTo ? (mine ? -10 : 10) : 0
                          }}
                          transition={{ duration: 0.2 }}
                          onMouseEnter={() => setHoveredMsg(msg._id?.toString() || null)}
                          onMouseLeave={() => setHoveredMsg(null)}
                          style={{
                            display: 'flex',
                            flexDirection: mine ? 'row-reverse' : 'row',
                            alignItems: 'flex-end',
                            gap: '10px',
                            zIndex: (activeMenu === msg._id?.toString() || isBeingRepliedTo) ? 50 : 1
                          }}
                        >
                          {!mine && (() => {
                            const sender = contacts.find(c => c._id === msg.senderId);
                            const avatarToShow = sender?.avatar || msg.senderAvatar;
                            return (
                              <img src={getAvatar(msg.senderName, avatarToShow)} alt={msg.senderName}
                                style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #1a1a1a', flexShrink: 0, objectFit: 'cover' }} />
                            );
                          })()}
                          <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                            {/* Reply quote above bubble */}
                            {msg.replyTo && msg.replyTo.text && (
                              <div
                                onClick={() => scrollToMessage(msg.replyTo!._id)}
                                style={{
                                  background: '#0f0f0f',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  color: '#ccc',
                                  borderLeft: '3px solid #3b82f6',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginBottom: '2px',
                                  cursor: 'pointer',
                                  transition: 'all 0.1s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = '#60a5fa'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#0f0f0f'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                              >
                                <span style={{ color: '#60a5fa', fontWeight: 600 }}>{msg.replyTo.senderName}</span>: <span style={{ opacity: 0.8 }}>{msg.replyTo.text?.startsWith?.('STICKER:') ? 'Sticker' : msg.replyTo.text}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'center', position: 'relative' }}>
                              {/* 3 Dot Menu Trigger */}
                              {(hoveredMsg === msg._id?.toString() || activeMenu === msg._id?.toString()) && (
                                <div style={{ position: 'absolute', [mine ? 'right' : 'left']: '100%', marginInline: '4px', zIndex: 10 }}>
                                  <button
                                    onClick={() => setActiveMenu(activeMenu === msg._id?.toString() ? null : msg._id?.toString() || null)}
                                    style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', transition: 'all 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {/* Dropdown Menu */}
                                  <AnimatePresence>
                                    {activeMenu === msg._id?.toString() && (
                                      <>
                                        <div
                                          onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }}
                                          style={{ position: 'fixed', inset: 0, zIndex: 25 }}
                                        />
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.95 }}
                                          transition={{ duration: 0.1 }}
                                          style={{
                                            position: 'absolute',
                                            ...(isNearBottom && !isNearTop ? { bottom: '100%', marginBottom: '4px' } : { top: '100%', marginTop: '4px' }),
                                            right: mine ? '0' : 'auto',
                                            left: mine ? 'auto' : '0',
                                            background: '#111',
                                            border: '1px solid #222',
                                            borderRadius: '8px',
                                            padding: '6px',
                                            minWidth: '150px',
                                            zIndex: 30,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                                          }}
                                        >
                                          <button
                                            onClick={() => copyMessage(msg.text)}
                                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#222'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <Copy size={14} /> Copy
                                          </button>
                                          <button
                                            onClick={() => {
                                              setReplyingTo({ ...msg });
                                              setActiveMenu(null);
                                              setTimeout(() => inputRef.current?.focus(), 10);
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#222'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <Reply size={14} /> Reply
                                          </button>
                                          <button
                                            onClick={() => togglePin(msg._id)}
                                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#222'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <Pin size={14} /> {msg.pinned ? 'Unpin' : 'Pin'}
                                          </button>
                                          {mine && (
                                            <button
                                              onClick={() => deleteMessage(msg._id)}
                                              style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                              <Trash size={14} /> Delete
                                            </button>
                                          )}
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}

                              {/* Bubble */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                                {selectedContact.isGroup && !mine && (
                                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', marginBottom: '4px', marginLeft: '2px' }}>
                                    {msg.senderName}
                                  </div>
                                )}
                                {msg.text?.startsWith?.('STICKER:') ? (
                                  <img src={msg.text.substring(8)} alt="sticker" style={{ width: '80px', height: '80px', objectFit: 'contain', filter: isBeingRepliedTo ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none' }} />
                                ) : (
                                  <div style={
                                    isEmojiOnly ? {
                                      fontSize: '3rem',
                                      lineHeight: 1,
                                      background: 'transparent',
                                      border: 'none',
                                      padding: 0,
                                      filter: isBeingRepliedTo ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' : 'none'
                                    } : {
                                      padding: '10px 14px',
                                      borderRadius: mine ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                                      background: isBeingRepliedTo ? '#001a33' : (mine ? '#fff' : '#0a0a0a'),
                                      border: isBeingRepliedTo ? '1px solid #3b82f6' : (mine ? '1px solid #fff' : '1px solid #1a1a1a'),
                                      boxShadow: isBeingRepliedTo ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none',
                                      color: isBeingRepliedTo ? '#fff' : (mine ? '#000' : '#fff'),
                                      fontSize: '0.85rem', lineHeight: 1.5, wordBreak: 'break-word',
                                      fontWeight: 500,
                                      transition: 'all 0.2s'
                                    }
                                  }>
                                    {msg.text}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingInline: '4px' }}>
                              <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 500 }}>{formatTime(msg.createdAt)}</span>
                              {mine && (
                                msg.error ? (
                                  <AlertCircle size={12} color="#ef4444" />
                                ) : msg.read ? (
                                  <CheckCheck size={14} color="#3b82f6" />
                                ) : (
                                  <Check size={14} color="#888" />
                                )
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '0.75rem 1.5rem 1.25rem', background: '#000', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'relative', zIndex: 10 }}>
              {replyingTo && (
                <div style={{ background: '#111', padding: '8px 12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ fontSize: '0.8rem', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>Replying to {replyingTo.senderName}</span>: <span style={{ opacity: 0.8 }}>{replyingTo.text?.startsWith?.('STICKER:') ? 'Sticker' : replyingTo.text}</span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px', display: 'flex' }}><X size={14} /></button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', position: 'relative' }}>
                <div ref={emojiPickerRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowEmojis(!showEmojis)}
                    style={{ width: '42px', height: '42px', borderRadius: '6px', background: '#0a0a0a', border: '1px solid #111', color: showEmojis ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s', flexShrink: 0 }}
                  >
                    <Smile size={18} />
                  </button>
                  <AnimatePresence>
                    {showEmojis && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{ position: 'absolute', bottom: '50px', left: 0, background: '#111', border: '1px solid #222', borderRadius: '12px', zIndex: 20, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)', width: '220px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                      >
                        <div style={{ display: 'flex', borderBottom: '1px solid #222' }}>
                          <button onClick={() => setPickerTab('emoji')} style={{ flex: 1, padding: '10px', background: pickerTab === 'emoji' ? '#1a1a1a' : 'transparent', border: 'none', color: pickerTab === 'emoji' ? '#fff' : '#666', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Emojis</button>
                          <button onClick={() => setPickerTab('sticker')} style={{ flex: 1, padding: '10px', background: pickerTab === 'sticker' ? '#1a1a1a' : 'transparent', border: 'none', color: pickerTab === 'sticker' ? '#fff' : '#666', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Stickers</button>
                        </div>
                        <div style={{ padding: '12px', maxHeight: '250px', overflowY: 'auto' }} className="custom-scrollbar">
                          {pickerTab === 'emoji' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                              {['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '🙏'].map(e => (
                                <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmojis(false); }} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.1s' }} onMouseEnter={ev => ev.currentTarget.style.background = '#222'} onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                                  {e}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                              {STICKERS.map(url => (
                                <button key={url} onClick={() => { sendMessage(`STICKER:${url}`); setShowEmojis(false); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'background 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={ev => ev.currentTarget.style.background = '#222'} onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                                  <img src={url} alt="sticker" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Write a message to ${selectedContact.name}...`}
                    rows={1}
                    style={{ display: 'block', boxSizing: 'border-box', width: '100%', background: '#0a0a0a', border: '1px solid #111', borderRadius: '6px', padding: '10px 14px', color: 'white', fontSize: '0.85rem', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: '100px', overflowY: 'auto', transition: 'border-color 0.2s' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#222'}
                    onBlur={e => e.currentTarget.style.borderColor = '#111'}
                    maxLength={1000}
                  />
                </div>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  style={{ width: '42px', height: '42px', borderRadius: '6px', background: input.trim() ? '#fff' : '#0a0a0a', border: '1px solid', borderColor: input.trim() ? '#fff' : '#111', color: input.trim() ? '#000' : '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.1s', flexShrink: 0 }}
                >
                  <Send size={16} style={{ transform: 'translate(-1px, 1px)' }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Right: Profile Sidebar ── */}
      <AnimatePresence>
        {showProfile && selectedContact && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ flexShrink: 0, borderLeft: '1px solid #111', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', height: '100%', background: '#050505' }}>
              {/* Top bar with close button */}
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  onClick={() => setShowProfile(false)}
                  style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#111'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #111' }}>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  {selectedContact.isGroup ? (
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: '#111', border: '2px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {selectedContact.avatar ? (
                          <img src={selectedContact.avatar} alt="group" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Users size={36} color="#3b82f6" />
                        )}
                      </div>
                      {(selectedContact as Group).adminId === (currentUser?._id || currentUser?.id) && (
                        <button
                          onClick={() => setShowGroupAvatarPicker(true)}
                          title="Change group avatar"
                          style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#3b82f6', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59,130,246,0.5)', transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Sparkles size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <img src={getAvatar(selectedContact.name, (selectedContact as Contact).avatar)} alt={selectedContact.name} style={{ width: '72px', height: '72px', borderRadius: '20px', border: '2px solid #1a1a1a', objectFit: 'cover' }} />
                      {onlineUsers.has(selectedContact._id) && (
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '14px', height: '14px', borderRadius: '50%', background: '#10b981', border: '3px solid #050505' }} />
                      )}
                    </>
                  )}
                </div>
                <h3 className="outfit" style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{selectedContact.name}</h3>
                <div style={{ fontSize: '0.8rem', color: (selectedContact.isGroup || onlineUsers.has(selectedContact._id)) ? '#10b981' : '#666', fontWeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div>
                    {selectedContact.isGroup ? `${(selectedContact as Group).members?.filter(mId => contacts.some(c => c._id === mId)).length || 0} Members` : (onlineUsers.has(selectedContact._id) ? 'Active Now' : 'Offline')}
                  </div>
                  {selectedContact.isGroup && (
                    <div style={{ fontSize: '0.75rem', color: '#999', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', marginTop: '10px', fontWeight: 500, display: 'inline-block' }}>
                      Admin: {contacts.find(c => c._id === (selectedContact as Group).adminId)?.name?.replace(' (You)', '') || 'Unknown'}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                {selectedContact.isGroup ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', fontWeight: 600 }}>Group Members</div>
                        {((selectedContact as Group).adminId === currentUser?.id || (selectedContact as Group).adminId === currentUser?._id) && (
                          <button
                            onClick={openAddMemberModal}
                            style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Users size={14} /> Add
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(selectedContact as Group).members?.map(mId => {
                          const user = contacts.find(c => c._id === mId);
                          if (!user) return null;
                          return (
                            <div key={mId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: '#0a0a0a', border: '1px solid #111' }}>
                              <img src={getAvatar(user.name, user.avatar)} style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                                  {mId === (selectedContact as Group).adminId && (
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap' }}>ADMIN</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#666' }}>{user.designation || 'Team Member'}</div>
                              </div>
                              {onlineUsers.has(mId) && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />}
                              {(selectedContact as Group).adminId === (currentUser?._id || currentUser?.id) && mId !== (selectedContact as Group).adminId && (
                                <button
                                  onClick={() => removeMember(selectedContact._id, mId)}
                                  title="Remove from group"
                                  style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'all 0.1s' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = '#444'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <Trash size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#0a0a0a', border: '1px solid #111', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginBottom: '4px', fontWeight: 600 }}>Designation</div>
                      <div style={{ color: '#eee', fontSize: '0.9rem', whiteSpace: 'normal' }}>{(selectedContact as Contact).designation || 'Team Member'}</div>
                    </div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginBottom: '4px', fontWeight: 600 }}>Email Address</div>
                      <div style={{ color: '#eee', fontSize: '0.9rem', whiteSpace: 'normal', wordBreak: 'break-all' }}>{(selectedContact as Contact).email || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginBottom: '4px', fontWeight: 600 }}>System Role</div>
                      <div style={{ color: '#eee', fontSize: '0.9rem', textTransform: 'capitalize' }}>{(selectedContact as Contact).role || 'User'}</div>
                    </div>
                  </div>
                )}

                {selectedContact.isGroup && ((selectedContact as Group).adminId === currentUser?.id || (selectedContact as Group).adminId === currentUser?._id) && (
                  <div style={{ marginTop: 'auto', padding: '1.25rem 0 0' }}>
                    <button
                      onClick={() => deleteGroup(selectedContact._id)}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
                    >
                      <Trash size={16} /> Delete Group
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Member Modal ── */}
      <AnimatePresence>
        {showAddMemberModal && selectedContact && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddMemberModal(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ position: 'relative', width: '100%', maxWidth: '440px', background: '#050505', border: '1px solid #1a1a1a', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.7)' }}
            >
              {/* Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#080808' }}>
                <div>
                  <h3 className="outfit" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Add Members</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#666' }}>Invite more colleagues to {selectedContact.name}</p>
                </div>
                <button onClick={() => setShowAddMemberModal(false)} style={{ background: '#111', border: '1px solid #222', color: '#888', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#888'}><X size={18} /></button>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Search bar */}
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                    <input
                      type="text"
                      placeholder="Search colleagues..."
                      value={groupSearch}
                      onChange={e => setGroupSearch(e.target.value)}
                      style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 10px 10px 34px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  {/* Member List (Filter out those already in group) */}
                  <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#0a0a0a', border: '1px solid #111', borderRadius: '12px', padding: '4px' }} className="custom-scrollbar">
                    {contacts.filter(c =>
                      c.name.toLowerCase().includes(groupSearch.toLowerCase()) &&
                      !(selectedContact as Group).members?.includes(c._id)
                    ).length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#444', fontSize: '0.85rem' }}>No more colleagues to add</div>
                      )}
                    {contacts.filter(c =>
                      c.name.toLowerCase().includes(groupSearch.toLowerCase()) &&
                      !(selectedContact as Group).members?.includes(c._id)
                    ).map(c => {
                      const isSelected = tempSelectedMembers.includes(c._id);
                      return (
                        <div
                          key={c._id}
                          onClick={() => {
                            if (isSelected) setTempSelectedMembers(prev => prev.filter(id => id !== c._id));
                            else setTempSelectedMembers(prev => [...prev, c._id]);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', cursor: 'pointer', borderRadius: '10px', transition: 'all 0.2s',
                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                          }}
                        >
                          <img src={getAvatar(c.name, c.avatar)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #1a1a1a' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#3b82f6' : '#eee' }}>{c.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#555' }}>{c.designation || 'Team Member'}</div>
                          </div>
                          <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid', borderColor: isSelected ? '#3b82f6' : '#222', background: isSelected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '1.5rem', borderTop: '1px solid #111', background: '#080808', display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowAddMemberModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #222', background: 'transparent', color: '#eee', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={addMembersToGroup}
                  disabled={tempSelectedMembers.length === 0}
                  style={{ flex: 1.5, padding: '14px', borderRadius: '12px', border: 'none', background: tempSelectedMembers.length > 0 ? '#fff' : '#111', color: tempSelectedMembers.length > 0 ? '#000' : '#444', fontSize: '0.9rem', fontWeight: 700, cursor: tempSelectedMembers.length > 0 ? 'pointer' : 'not-allowed' }}
                >
                  Add to Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create Group Modal ── */}
      <AnimatePresence>
        {showCreateGroup && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreateGroup(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ position: 'relative', width: '100%', maxWidth: '440px', background: '#050505', border: '1px solid #1a1a1a', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.7)' }}
            >
              {/* Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#080808' }}>
                <div>
                  <h3 className="outfit" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>New Group Chat</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#666' }}>Bring your team together</p>
                </div>
                <button onClick={() => setShowCreateGroup(false)} style={{ background: '#111', border: '1px solid #222', color: '#888', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#888'}><X size={18} /></button>
              </div>

              <div style={{ padding: '1.5rem' }}>
                {/* Group Name Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Group Identity</label>
                  <input
                    id="group-name-input"
                    type="text"
                    placeholder="E.g. Project Apollo 🚀"
                    style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '14px', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                    onBlur={e => e.currentTarget.style.borderColor = '#1a1a1a'}
                    autoFocus
                  />
                </div>

                {/* Member Selection Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                    <span>Add Members</span>
                    <span style={{ color: '#3b82f6' }}>{tempSelectedMembers.length} Selected</span>
                  </label>

                  {/* Selected Members Chips */}
                  <AnimatePresence>
                    {tempSelectedMembers.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px', background: '#0a0a0a', borderRadius: '12px', border: '1px solid #111', maxHeight: '100px', overflowY: 'auto' }}
                      >
                        {tempSelectedMembers.map(mId => {
                          const user = contacts.find(c => c._id === mId);
                          if (!user) return null;
                          return (
                            <motion.div
                              key={`chip-${mId}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#111', border: '1px solid #222', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', color: '#eee' }}
                            >
                              <img src={getAvatar(user.name, user.avatar)} style={{ width: '18px', height: '18px', borderRadius: '4px' }} />
                              <span>{user.name.split(' ')[0]}</span>
                              <X size={12} style={{ cursor: 'pointer', color: '#666' }} onClick={() => setTempSelectedMembers(prev => prev.filter(id => id !== mId))} />
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Search bar for members */}
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                    <input
                      type="text"
                      placeholder="Search colleagues..."
                      value={groupSearch}
                      onChange={e => setGroupSearch(e.target.value)}
                      style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 10px 10px 34px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  {/* Member List */}
                  <div style={{ maxHeight: '220px', overflowY: 'auto', background: '#0a0a0a', border: '1px solid #111', borderRadius: '12px', padding: '4px' }} className="custom-scrollbar">
                    {contacts.filter(c => c.name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#444', fontSize: '0.85rem' }}>No colleagues found</div>
                    )}
                    {contacts.filter(c => c.name.toLowerCase().includes(groupSearch.toLowerCase())).map(c => {
                      const isSelected = tempSelectedMembers.includes(c._id);
                      return (
                        <div
                          key={c._id}
                          onClick={() => {
                            if (isSelected) setTempSelectedMembers(prev => prev.filter(id => id !== c._id));
                            else setTempSelectedMembers(prev => [...prev, c._id]);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', cursor: 'pointer', borderRadius: '10px', transition: 'all 0.2s',
                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                          }}
                          onMouseEnter={e => !isSelected && (e.currentTarget.style.background = '#111')}
                          onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ position: 'relative' }}>
                            <img src={getAvatar(c.name, c.avatar)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #1a1a1a' }} />
                            {onlineUsers.has(c._id) && (
                              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', border: '2px solid #0a0a0a' }} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#3b82f6' : '#eee' }}>{c.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#555' }}>{c.designation || 'Team Member'}</div>
                          </div>
                          <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid', borderColor: isSelected ? '#3b82f6' : '#222', background: isSelected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '1.5rem', borderTop: '1px solid #111', background: '#080808', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #222', background: 'transparent', color: '#eee', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.borderColor = '#333'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#222'; }}
                >
                  Cancel
                </button>
                <button
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    const nameInput = document.getElementById('group-name-input') as HTMLInputElement;
                    const name = nameInput.value;
                    if (!name.trim() || tempSelectedMembers.length === 0) {
                      nameInput.style.borderColor = '#ef4444';
                      btn.disabled = false;
                      return;
                    }
                    try {
                      const res = await fetch('/api/chat/groups', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, members: tempSelectedMembers })
                      });
                      if (res.ok) {
                        mutateGroups();
                        setShowCreateGroup(false);
                        setTempSelectedMembers([]);
                        setGroupSearch('');
                      }
                    } finally {
                      btn.disabled = false;
                    }
                  }}
                  style={{ flex: 1.5, padding: '14px', borderRadius: '12px', border: 'none', background: '#fff', color: '#000', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  Create Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Avatar Picker */}
      {selectedContact?.isGroup && (
        <AvatarPickerModal
          isOpen={showGroupAvatarPicker}
          onClose={() => setShowGroupAvatarPicker(false)}
          userName={selectedContact.name}
          onSelect={async (url) => {
            try {
              const res = await fetch(`/api/chat/groups/${selectedContact._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar: url })
              });
              const data = await res.json();
              if (res.ok) {
                mutateGroups();
                setSelectedContact(prev => prev ? { ...prev, avatar: url } : null);
              } else {
                // Show meaningful error like 403 Forbidden (Not Admin)
                alert(data.error || 'Failed to update avatar');
              }
            } catch (err) {
              alert('Error updating group avatar');
            }
          }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      </div>
    </Skeleton>
  );
}

function MessageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'flex-end', 
          alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start', 
          maxWidth: '70%',
          flexDirection: i % 2 === 0 ? 'row-reverse' : 'row'
        }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#111', flexShrink: 0 }} />
          <div style={{ 
            padding: '12px 16px', 
            borderRadius: i % 2 === 0 ? '20px 20px 4px 20px' : '20px 20px 20px 4px', 
            background: i % 2 === 0 ? '#111' : '#080808',
            border: '1px solid #1a1a1a',
            width: i === 1 ? '180px' : i === 2 ? '240px' : i === 3 ? '150px' : '200px',
            animation: 'pulse 1.5s infinite ease-in-out'
          }}>
            <div style={{ height: '8px', background: '#1a1a1a', borderRadius: '4px', width: '100%', marginBottom: '8px' }} />
            <div style={{ height: '8px', background: '#1a1a1a', borderRadius: '4px', width: '60%' }} />
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ background: '#000', height: '100vh', width: '100vw' }} />}>
      <ChatContent />
    </Suspense>
  );
}
