'use client';

import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import Pusher from 'pusher-js';
import { Search, User as UserIcon, Mail, Briefcase, Calendar, Users, SlidersHorizontal, X, ArrowUpRight, ShieldCheck, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { Skeleton } from 'boneyard-js/react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TeamDirectoryPage() {
  const { data: profileData } = useSWR('/api/user/profile', fetcher);
  const { data, isLoading } = useSWR('/api/team', fetcher);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  // Pusher Presence
  useEffect(() => {
    if (!profileData?.user) return;
    
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!pusherKey || !pusherCluster) return;

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      channelAuthorization: {
        customHandler: async ({ socketId, channelName }, callback) => {
          try {
            const res = await fetch('/api/pusher/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `socket_id=${socketId}&channel_name=${channelName}`
            });
            const data = await res.json();
            callback(null, data);
          } catch (err: any) {
            callback(err, null);
          }
        }
      }
    });

    const channel = pusher.subscribe('presence-chat');
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      setOnlineUsers(new Set(Object.keys(members.members)));
    });
    channel.bind('pusher:member_added', (member: any) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.add(member.id);
        return next;
      });
    });
    channel.bind('pusher:member_removed', (member: any) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe('presence-chat');
      pusher.disconnect();
    };
  }, [profileData]);
  
  const members = data?.members || [];

  const filteredMembers = useMemo(() => {
    const list = members.filter((m: any) => 
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.designation.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    );

    return [...list].sort((a, b) => {
      if (sortBy === 'asc') return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });
  }, [members, search, sortBy]);

  return (
    <Skeleton name="employees" loading={isLoading}>
      <div style={{ padding: '1.5rem', background: '#000', height: '100vh', overflowY: 'auto', color: 'white', boxSizing: 'border-box' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="outfit" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Team Directory</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Connect and collaborate with your colleagues</p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name, role or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', background: '#09090b', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '12px 14px 12px 42px', color: 'white', fontSize: '0.9rem', outline: 'none' }} 
          />
        </div>
        <button 
          onClick={() => setSortBy(sortBy === 'asc' ? 'desc' : 'asc')}
          style={{ background: '#09090b', border: '1px solid #1a1a1a', color: 'white', padding: '0 1.25rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <SlidersHorizontal size={16} color="#3b82f6" /> {sortBy === 'asc' ? 'Name: A-Z' : 'Name: Z-A'}
        </button>
      </div>

      {filteredMembers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <Users size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
          <p>No colleagues found matching your search.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <AnimatePresence>
            {filteredMembers.map((m: any, idx: number) => (
              <motion.div
                key={m._id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{ background: '#09090b', border: '1px solid #1a1a1a', borderRadius: '24px', padding: '1.5rem', position: 'relative' }}
              >
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '20px', overflow: 'hidden', border: '1px solid #1a1a1a', flexShrink: 0 }}>
                    <img 
                      src={m.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`} 
                      alt={m.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {onlineUsers.has(m._id) && (
                      <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid #09090b' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', color: 'white' }}>{m.name}</h3>
                    <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.designation || m.role}</div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <InfoRow icon={<Mail size={14} />} text={m.email} />
                  {m.role && <InfoRow icon={<Briefcase size={14} />} text={m.role} />}
                  <InfoRow icon={<Calendar size={14} />} text={`Joined ${new Date(m.joinedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`} />
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setSelectedMember(m)}
                    style={{ flex: 1, background: 'white', color: 'black', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    View Profile
                  </button>
                  <a 
                    href={`mailto:${m.email}`}
                    style={{ width: '42px', background: '#111', border: '1px solid #222', color: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textDecoration: 'none' }}
                  >
                    <Mail size={16} />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {selectedMember && (
          <MemberProfileModal 
            member={selectedMember} 
            isOnline={onlineUsers.has(selectedMember._id)}
            onClose={() => setSelectedMember(null)} 
          />
        )}
      </AnimatePresence>
      </div>
    </Skeleton>
  );
}

function MemberProfileModal({ member, isOnline, onClose }: { member: any, isOnline: boolean, onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        style={{ 
          position: 'relative', width: '100%', maxWidth: '420px', background: '#050505', 
          border: '1px solid #1a1a1a', borderRadius: '32px', padding: '2.5rem', color: 'white',
          overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: '#111', border: 'none', color: 'var(--text-muted)', padding: '8px', borderRadius: '12px', cursor: 'pointer' }}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '40px', overflow: 'hidden', border: '4px solid #111', boxShadow: '0 0 0 1px #1a1a1a' }}>
              <img src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: isOnline ? '#10b981' : '#3f3f46', width: '20px', height: '20px', borderRadius: '50%', border: '4px solid #050505' }} />
          </div>

          <h2 className="outfit" style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px' }}>{member.name}</h2>
          <div style={{ color: '#3b82f6', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>{member.designation || member.role}</div>
          {!isOnline && member.lastSeen && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Last seen: {new Date(member.lastSeen).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
            </div>
          )}

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#09090b', padding: '1.5rem', borderRadius: '24px', border: '1px solid #111', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                <Mail size={16} color="var(--text-muted)" /> Email
              </div>
              <a href={`mailto:${member.email}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3b82f6', textDecoration: 'none' }}>{member.email}</a>
            </div>
            {member.role && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  <ShieldCheck size={16} color="var(--text-muted)" /> Organization Role
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{member.role}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                <Calendar size={16} color="var(--text-muted)" /> Joining Date
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Date(member.joinedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', width: '100%', display: 'flex', gap: '12px' }}>
            <Link href={`/chat?userId=${btoa(member._id).replace(/=/g, '')}`} style={{ flex: 1, textDecoration: 'none' }}>
              <button style={{ width: '100%', background: 'white', color: 'black', border: 'none', padding: '14px', borderRadius: '16px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Send Message <ArrowUpRight size={18} />
              </button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
      <div style={{ color: 'var(--text-dim)' }}>{icon}</div>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
    </div>
  );
}
