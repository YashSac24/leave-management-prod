'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, Users, Search, Plus, MoreHorizontal, Check, X, 
  ArrowLeft, ChevronLeft, ChevronRight, Edit2, Trash2, 
  UserCog, ChevronDown, Eye, EyeOff, ShieldCheck, UserCircle2, Unlock, Lock, AlertTriangle
} from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import DropdownMenu from '@/components/DropdownMenu';
import CustomDatePicker from '@/components/CustomDatePicker';
import CustomSelect from '@/components/CustomSelect';
import { Skeleton } from 'boneyard-js/react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const ROLE_META: Record<string, { color: string; bg: string }> = {
  Administrator: { color: '#a78bfa', bg: '#a78bfa12' },
  Admin:         { color: '#3b82f6', bg: '#3b82f612' },
  HR:            { color: '#10b981', bg: '#10b98112' },
  TL:            { color: '#f59e0b', bg: '#f59e0b12' },
  User:          { color: '#71717a', bg: '#71717a12' },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ 
    name: '', email: '', password: '', role: 'User', 
    designation: '', joinedAt: new Date().toISOString().split('T')[0], casualLeaveBalance: 7.0, sickLeaveBalance: 7.0, loyaltyLeaveBalance: 0, earnedLeaveBalance: 0 
  });
  const [submitting, setSubmitting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [isMobile, setIsMobile] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; title: string; message: string; onConfirm: () => void; type: 'danger' | 'warning' | 'success'; loading?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger', loading: false });



  const availableRoles = currentUserRole === 'Administrator' ? ['Administrator', 'HR', 'Admin', 'TL', 'User'] : ['HR', 'Admin', 'TL', 'User'];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    setNewUser({ ...newUser, password: Array.from({length: 12}, () => chars[Math.floor(Math.random() * chars.length)]).join('') });
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      if (data.user?.role) setCurrentUserRole(data.user.role);
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim()) {
      return toast.error('Full Name is required', { theme: 'dark' });
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
      if (res.ok) { 
        toast.success('User created successfully', { theme: 'dark' });
        setNewUser({ name: '', email: '', password: '', role: 'User', designation: '', joinedAt: new Date().toISOString().split('T')[0], casualLeaveBalance: 7.0, sickLeaveBalance: 7.0, loyaltyLeaveBalance: 0, earnedLeaveBalance: 0 }); setIsAdding(false); fetchUsers(); 
      } else {
        const data = await res.json();
        toast.error(data.error || 'Creation failed', { theme: 'dark' });
      }
    } finally { setSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!editingUser.name.trim()) {
      return toast.error('Full Name is required', { theme: 'dark' });
    }
    setSubmitting(true);
    try {
      const { _id, ...updates } = editingUser;
      const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: _id, ...updates }) });
      if (res.ok) { 
        toast.success('User updated successfully', { theme: 'dark' });
        setEditingUser(null); fetchUsers(); 
      } else {
        const data = await res.json();
        toast.error(data.error || 'Update failed', { theme: 'dark' });
      }
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action is permanent and cannot be undone.',
      type: 'danger',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success('User deleted successfully', { theme: 'dark' });
            fetchUsers();
          } else {
            toast.error('Failed to delete user', { theme: 'dark' });
          }
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };

  const handleUnlock = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Unlock Account',
      message: 'Are you sure you want to unlock this account for system access?',
      type: 'success',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          const res = await fetch('/api/admin/users', { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ userId: id, isLocked: false, failedLoginAttempts: 0 }) 
          });
          if (res.ok) {
            toast.success('Account unlocked', { theme: 'dark' });
            fetchUsers();
          }
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        }
      }
    });
  };



  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <Skeleton name="admin-users" loading={loading}>
      <div style={{ 
        height: '100vh', 
        overflowY: 'auto',
        background: '#000', 
        color: 'white', 
        padding: isMobile ? '1.25rem' : '1.5rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>

      {/* Header */}
      <header style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        marginBottom: '1.25rem',
        gap: isMobile ? '15px' : '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
          <Link href="/admin">
            <motion.div whileHover={{ x: -3 }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
              <ArrowLeft size={12} /> Admin
            </motion.div>
          </Link>
          <span style={{ color: '#27272a', fontSize: '0.7rem' }}>/</span>
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: '8px' }}>
            <div style={{ background: '#2563eb', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Users size={14} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : '8px' }}>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>User Management</h1>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#2563eb15', color: '#3b82f6', textTransform: 'uppercase' }}>{users.length} Users</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>{isMobile ? 'Team access & roles' : 'Manage team members, roles, and leave balances'}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: isMobile ? 1 : 'none' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" placeholder={isMobile ? "Search..." : "Search users..."} value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ width: isMobile ? '100%' : '220px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '7px 10px 7px 30px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setIsAdding(true)}
            style={{ 
              background: 'white', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '9px', 
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', 
              gap: '6px', width: isMobile ? '100%': 'auto', justifyContent: 'center' 
            }}
          >
            <Plus size={14} strokeWidth={3} /> Add User
          </motion.button>
        </div>
      </header>

      {/* Table Section */}
      <div style={{ background: '#080808', border: '1px solid #141414', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#060606', borderBottom: '1px solid #111' }}>
                <th style={{ ...th, width: '40px' }}>#</th>
                <th style={th}>User</th>
                <th style={th}>Role</th>
                <th style={th}>Designation</th>
                <th style={th}>Casual</th>
                <th style={th}>Sick</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No users found</td></tr>
              ) : paginatedUsers.map((user, idx) => {
                const roleMeta = ROLE_META[user.role] || ROLE_META.User;
                return (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    style={{ borderBottom: '1px solid #0f0f0f', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0d0d0d'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={td}><span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>#{(currentPage - 1) * rowsPerPage + idx + 1}</span></td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0f0f0f', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3b82f6' }}>{user.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white' }}>{user.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: roleMeta.bg, color: roleMeta.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {user.role || 'USER'}
                      </span>
                    </td>
                    <td style={td}><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{user.designation || '—'}</span></td>
                    <td style={td}>
                      {(currentUserRole === 'Administrator' || (['Admin', 'HR'].includes(currentUserRole || '') && ['User', 'TL'].includes(user.role))) ? (
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#10b981' }}>{user.casualLeaveBalance?.toFixed(1) || '0.0'}</span>
                      ) : (
                        <span style={{ fontSize: '0.6rem', background: '#111', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 800 }}>PRIVATE</span>
                      )}
                    </td>
                    <td style={td}>
                      {(currentUserRole === 'Administrator' || (['Admin', 'HR'].includes(currentUserRole || '') && ['User', 'TL'].includes(user.role))) ? (
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ef4444' }}>{user.sickLeaveBalance?.toFixed(1) || '0.0'}</span>
                      ) : (
                        <span style={{ fontSize: '0.6rem', background: '#111', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 800 }}>PRIVATE</span>
                      )}
                    </td>
                    <td style={td}>
                      {user.isLocked ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444' }} />
                          <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 600 }}>Locked</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>Active</span>
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <DropdownMenu
                        trigger={
                          <button style={{ background: '#111', border: '1px solid #1a1a1a', color: 'var(--text-muted)', padding: '5px 8px', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <MoreHorizontal size={14} />
                          </button>
                        }
                      >
                        <button
                          onClick={() => setEditingUser(user)}
                          style={{ width: '100%', padding: '9px 12px', fontSize: '0.75rem', color: '#a1a1aa', background: 'transparent', border: 'none', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#18181b'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <UserCog size={13} /> Edit Profile
                        </button>
                        {user.isLocked && (
                          <button
                            onClick={() => handleUnlock(user._id)}
                            style={{ width: '100%', padding: '9px 12px', fontSize: '0.75rem', color: '#34d399', background: 'transparent', border: 'none', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '2px' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#064e3b20'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Unlock size={13} /> Unlock Account
                          </button>
                        )}
                        {((currentUserRole === 'Administrator' && user.role !== 'Administrator') ||
                          (currentUserRole === 'Admin' && ['HR', 'TL', 'User'].includes(user.role)) ||
                          (currentUserRole === 'HR' && ['TL', 'User'].includes(user.role))) && (
                          <>
                            <div style={{ height: '1px', background: '#1a1a1a', margin: '3px 0' }} />
                            <button
                              onClick={() => handleDelete(user._id)}
                              style={{ width: '100%', padding: '9px 12px', fontSize: '0.75rem', color: '#ef4444', background: 'transparent', border: 'none', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fee2e210'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </>
                        )}
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '0.8rem 1.25rem', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a' }}>
          <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 500 }}>
            {filteredUsers.length > 0 ? `Showing ${(currentPage-1)*rowsPerPage+1}–${Math.min(currentPage*rowsPerPage, filteredUsers.length)} of ${filteredUsers.length} users` : '0 results'}
          </span>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} style={pgBtn(currentPage === 1)}>
              <ChevronLeft size={12} /> Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)}
                style={{ ...pgBtn(false), background: p === currentPage ? '#2563eb' : '#111', color: p === currentPage ? 'white' : '#a1a1aa', minWidth: '30px', justifyContent: 'center', fontWeight: p === currentPage ? 800 : 600, border: p === currentPage ? '1px solid #2563eb' : '1px solid #2a2a2a' }}>
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} style={pgBtn(currentPage === totalPages)}>
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(isAdding || editingUser) && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: '18px', padding: '1.25rem 1.5rem', width: '100%', maxWidth: '500px', boxShadow: '0 40px 80px rgba(0,0,0,0.8)', maxHeight: '95vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{editingUser ? 'Edit Profile' : 'New User'}</h2>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Manage user account and leave balances</p>
                </div>
                <button onClick={() => { setIsAdding(false); setEditingUser(null); }} style={{ background: '#111', border: '1px solid #1a1a1a', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px', borderRadius: '8px', display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={editingUser ? handleUpdate : handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <Field label="Full Name">
                    <input required type="text" value={editingUser ? editingUser.name : newUser.name}
                      onChange={e => editingUser ? setEditingUser({...editingUser, name: e.target.value}) : setNewUser({...newUser, name: e.target.value})}
                      placeholder="e.g. John Doe" style={inp} />
                  </Field>
                  <Field label="Email Address">
                    <input required type="email" autoComplete="off" value={editingUser ? editingUser.email : newUser.email}
                      onChange={e => editingUser ? setEditingUser({...editingUser, email: e.target.value}) : setNewUser({...newUser, email: e.target.value})}
                      style={{ ...inp, color: editingUser ? 'var(--text-dim)' : 'white' }} />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <Field label="Role">
                    <CustomSelect
                      value={editingUser ? editingUser.role : newUser.role}
                      onChange={v => editingUser ? setEditingUser({...editingUser, role: v}) : setNewUser({...newUser, role: v})}
                      options={availableRoles.map(r => ({ value: r, label: r }))}
                    />
                  </Field>
                  <Field label="Designation">
                    <input type="text" value={editingUser ? editingUser.designation : newUser.designation}
                      onChange={e => editingUser ? setEditingUser({...editingUser, designation: e.target.value}) : setNewUser({...newUser, designation: e.target.value})}
                      placeholder="e.g. Senior Developer" style={inp} />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <Field label="Joining Date">
                    <CustomDatePicker
                      label=""
                      value={editingUser ? (editingUser.joinedAt ? new Date(editingUser.joinedAt).toISOString().split('T')[0] : '') : newUser.joinedAt}
                      onChange={v => {
                        if (editingUser) {
                          setEditingUser({...editingUser, joinedAt: v});
                        } else {
                          // Auto-calculate for new user
                          const joinDate = new Date(v);
                          const monthsRemaining = 12 - joinDate.getMonth();
                          const proRated = parseFloat(((monthsRemaining / 12) * 7).toFixed(1));
                          setNewUser({
                            ...newUser, 
                            joinedAt: v,
                            casualLeaveBalance: proRated,
                            sickLeaveBalance: proRated
                          });
                        }
                      }}
                    />
                  </Field>
                  <Field label="Status">
                    <CustomSelect
                      value={editingUser?.status || 'Active'}
                      onChange={v => setEditingUser({...editingUser, status: v})}
                      options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
                    />
                  </Field>
                </div>

                <div style={{ padding: '0.85rem', background: '#050505', borderRadius: '12px', border: '1px solid #111', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px' }}>Pro-rated Leave Balances</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <Field label="Casual Leave">
                      <input type="number" step="0.5" value={editingUser ? (editingUser.casualLeaveBalance ?? 0) : newUser.casualLeaveBalance}
                        onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value); editingUser ? setEditingUser({...editingUser, casualLeaveBalance: v}) : setNewUser({...newUser, casualLeaveBalance: v}); }}
                        style={inp} />
                    </Field>
                    <Field label="Sick Leave">
                      <input type="number" step="0.5" value={editingUser ? (editingUser.sickLeaveBalance ?? 0) : newUser.sickLeaveBalance}
                        onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value); editingUser ? setEditingUser({...editingUser, sickLeaveBalance: v}) : setNewUser({...newUser, sickLeaveBalance: v}); }}
                        style={inp} />
                    </Field>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <Field label="Loyalty Leave">
                      <input type="number" step="0.5" value={editingUser ? (editingUser.loyaltyLeaveBalance ?? 0) : newUser.loyaltyLeaveBalance}
                        onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value); editingUser ? setEditingUser({...editingUser, loyaltyLeaveBalance: v}) : setNewUser({...newUser, loyaltyLeaveBalance: v}); }}
                        style={inp} />
                    </Field>
                    <Field label="Earned Leave">
                      <input type="number" step="0.5" value={editingUser ? (editingUser.earnedLeaveBalance ?? 0) : newUser.earnedLeaveBalance}
                        onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value); editingUser ? setEditingUser({...editingUser, earnedLeaveBalance: v}) : setNewUser({...newUser, earnedLeaveBalance: v}); }}
                        style={inp} />
                    </Field>
                  </div>
                </div>

                {editingUser && (currentUserRole === 'Administrator' || currentUserRole === 'Admin') && (
                  <Field label="Reset Password">
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" 
                        placeholder="Leave blank to keep current"
                        onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                        style={{ ...inp, paddingRight: '36px', width: '100%', boxSizing: 'border-box' }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                        {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  </Field>
                )}

                {!editingUser && (
                  <Field label="Password" action={<button type="button" onClick={generatePassword} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }}>Generate</button>}>
                    <div style={{ position: 'relative' }}>
                      <input required type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        style={{ ...inp, paddingRight: '36px', width: '100%', boxSizing: 'border-box' }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                        {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  </Field>
                )}

                <motion.button
                  type="submit" disabled={submitting}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  style={{ marginTop: '0.35rem', background: 'white', color: 'black', border: 'none', padding: '11px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                  {submitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Save Changes' : 'Create User')}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

function Field({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.9rem 1rem', fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left' };
const td: React.CSSProperties = { padding: '0.7rem 1rem', verticalAlign: 'middle' };

const inp: React.CSSProperties = {
  width: '100%', background: '#050505', border: '1px solid #1a1a1a', borderRadius: '12px',
  padding: '11px 14px', color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
};

const pgBtn = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? 'transparent' : '#111',
  border: '1px solid #2a2a2a',
  color: disabled ? '#333' : '#a1a1aa',
  padding: '5px 10px', borderRadius: '7px',
  cursor: disabled ? 'default' : 'pointer',
  fontSize: '0.72rem', fontWeight: 700,
  display: 'flex', alignItems: 'center', gap: '3px',
  transition: 'all 0.15s'
});
