'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, ArrowLeft, Check, User as UserIcon, Search, ChevronRight, Clock, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from 'boneyard-js/react';
import dayjs from 'dayjs';

export default function EarnedLeavePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [earnedLeaveBalance, setEarnedLeaveBalance] = useState<number | string>(0);
  const [workingDaysCounter, setWorkingDaysCounter] = useState<number | string>(0);
  
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isMobile, setIsMobile] = useState(false);

  const [actionResult, setActionResult] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      if (data.user?.role) setCurrentUserRole(data.user.role);
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      const uRes = await fetch('/api/admin/users');
      const uData = await uRes.json();
      if (uData.success) {
        setUsers(uData.users.filter((u: any) => u.status !== 'Inactive'));
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerRecalculation = async () => {
    setActionLoading(true);
    setErrorMsg('');
    setActionResult(null);

    try {
      const res = await fetch('/api/admin/system/force-recalculate', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setActionResult({ success: true, message: data.message });
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'Recalculation failed');
      }
    } catch (err) {
      setErrorMsg('Connection error');
    } finally {
      setActionLoading(false);
    }
  };

  // Populate form when a user is selected
  useEffect(() => {
    if (selectedUser) {
      const u = users.find(u => u._id === selectedUser);
      if (u) {
        setEarnedLeaveBalance(u.earnedLeaveBalance || 0);
        setWorkingDaysCounter(u.workingDaysCounter || 0);
        setSuccessMsg('');
        setErrorMsg('');
      }
    }
  }, [selectedUser, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return setErrorMsg('Please select a user');

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/earned-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          action: 'update_balance',
          earnedLeaveBalance: Number(earnedLeaveBalance),
          workingDaysCounter: Number(workingDaysCounter)
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccessMsg('Earned leave records updated successfully.');
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'Failed to update leave');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeUser = users.find(u => u._id === selectedUser);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Skeleton name="earned-leave" loading={loading}>
      <div style={{ 
        height: '100vh', 
        background: '#000', 
        color: 'white', 
        padding: isMobile ? '1.25rem' : '1.5rem', 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}>
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        marginBottom: '1.25rem',
        gap: isMobile ? '12px' : '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/admin">
            <motion.div whileHover={{ x: -3 }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
              <ArrowLeft size={12} /> Admin
            </motion.div>
          </Link>
          <span style={{ color: '#27272a', fontSize: '0.7rem' }}>/</span>
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: '8px' }}>
            <div style={{ background: '#6366f1', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Clock size={14} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Earned Leave Ledger</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>{isMobile ? 'Adjust EL records' : 'Manually adjust earned leave balances and working days counter'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Recalculate Card */}
      <div style={{ background: '#050505', border: '1px solid #111', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#6366f1' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} color="#6366f1" /> Recalculate 2026 Earned Leaves
            </h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
              Reset all employee trackers to **Jan 1st, 2026** to re-calculate leaves based on new rules.
            </p>
          </div>
          <button 
            onClick={triggerRecalculation}
            disabled={actionLoading}
            style={{ 
              background: actionLoading ? '#222' : '#6366f1', 
              color: 'white', 
              border: 'none', 
              padding: '8px 14px', 
              borderRadius: '10px', 
              fontWeight: 800, 
              fontSize: '0.75rem', 
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {actionLoading ? 'Resetting...' : 'Reset & Recalculate All'}
          </button>
        </div>
        <AnimatePresence>
          {actionResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: '1rem', color: '#10b981', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓ {actionResult.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', 
        gap: '1.5rem', 
        alignItems: 'stretch', 
        minHeight: 0,
        overflowY: isMobile ? 'visible' : 'hidden'
      }}>
        
        {/* Left: User Table */}
        <div style={{ background: '#050505', border: '1px solid #111', borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: isMobile ? 'auto' : 'calc(100vh - 200px)', height: '100%', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #111' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
              <input 
                type="text" 
                placeholder={isMobile ? "Search employees..." : "Search employees by name or email..."} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '10px 12px 10px 34px', color: 'white', fontSize: '0.8rem', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => e.currentTarget.style.borderColor = '#333'}
                onBlur={e => e.currentTarget.style.borderColor = '#1a1a1a'}
              />
            </div>
          </div>

          <div style={{ overflowY: isMobile ? 'visible' : 'auto', flex: 1, padding: '0 1.25rem 1.25rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#050505', zIndex: 5 }}>
                  <tr>
                    <th style={{...th, width: '40px'}}>#</th>
                    <th style={th}>Employee</th>
                    <th style={th}>Role</th>
                    {!isMobile && <th style={th}>Total (EL)</th>}
                    {!isMobile && <th style={th}>Used (EL)</th>}
                    <th style={th}>Bal (EL)</th>
                    <th style={{...th, textAlign: 'right'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr><td colSpan={isMobile ? 5 : 8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No employees found.</td></tr>
                  ) : paginatedUsers.map((u, index) => (
                    <tr key={u._id} 
                        onClick={() => setSelectedUser(u._id)}
                        style={{ 
                          borderBottom: '1px solid #0f0f0f', 
                          cursor: 'pointer',
                          background: selectedUser === u._id ? '#6366f110' : 'transparent',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => { if (selectedUser !== u._id) e.currentTarget.style.background = '#0a0a0a'; }}
                        onMouseLeave={e => { if (selectedUser !== u._id) e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{...td, width: '40px', fontSize: '0.7rem', color: '#71717a', fontWeight: 600}}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', fontSize: '0.7rem', fontWeight: 700, overflow: 'hidden' }}>
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedUser === u._id ? '#6366f1' : '#e4e4e7' }}>{u.name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px', background: '#111', color: '#a1a1aa', fontWeight: 600 }}>{u.role}</span>
                      </td>
                      {!isMobile && (
                        <>
                          <td style={td}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa' }}>
                              {u.earnedLeaveTotal ?? 0}
                            </div>
                          </td>
                          <td style={td}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>
                              {u.earnedLeaveTaken ?? 0}
                            </div>
                          </td>
                        </>
                      )}
                      <td style={td}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1' }}>
                          {u.earnedLeaveBalance ?? 0}
                        </div>
                      </td>
                      <td style={{...td, textAlign: 'right'}}>
                        <button 
                          style={{
                            background: selectedUser === u._id ? '#6366f1' : '#111', 
                            border: selectedUser === u._id ? '1px solid #6366f1' : '1px solid #222',
                            color: selectedUser === u._id ? 'white' : '#a1a1aa',
                            padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                          {selectedUser === u._id ? (isMobile ? 'Selected' : 'Selected') : (isMobile ? 'Edit' : 'Edit')}
                          {selectedUser !== u._id && <ChevronRight size={12} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{ padding: '0.8rem 1.25rem', borderTop: '1px solid #111', background: '#050505', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 500 }}>
                 {filteredUsers.length > 0 ? (
                   `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredUsers.length)} of ${filteredUsers.length} users`
                 ) : (
                   '0 users'
                 )}
              </span>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)); }}
                  disabled={currentPage === 1}
                  style={{ ...pgBtn, opacity: currentPage === 1 ? 0.3 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronRight size={12} style={{ transform: 'rotate(180deg)' }} /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button 
                    key={p} 
                    onClick={(e) => { e.stopPropagation(); setCurrentPage(p); }}
                    style={{ 
                      ...pgBtn, 
                      background: p === currentPage ? '#6366f1' : '#111', 
                      color: p === currentPage ? 'white' : '#a1a1aa',
                      minWidth: '30px',
                      justifyContent: 'center',
                      fontWeight: p === currentPage ? 800 : 600,
                      border: p === currentPage ? '1px solid #6366f1' : '1px solid #1a1a1a'
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                  disabled={currentPage === totalPages}
                  style={{ ...pgBtn, opacity: currentPage === totalPages ? 0.3 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Form Container */}
        <div style={{ background: '#080808', border: '1px solid #141414', borderRadius: '16px', padding: isMobile ? '1.25rem' : '1.5rem', maxHeight: isMobile ? 'auto' : 'calc(100vh - 140px)', height: '100%', overflowY: isMobile ? 'visible' : 'auto' }}>
          
          {!activeUser ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
              <UserIcon size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e4e4e7', marginBottom: '0.5rem' }}>No Employee Selected</h3>
              <p style={{ fontSize: '0.75rem', maxWidth: '200px' }}>Use the table on the left to search and select an employee to adjust their Earned Leave.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Active User Top Bar */}
              <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #1a1a1a' }}>
                <h3 style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6366f1', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Editing Record For</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#6366f120', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {activeUser.avatar ? (
                      <img src={activeUser.avatar} alt={activeUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#6366f1' }}>{activeUser.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>{activeUser.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{activeUser.email}</div>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div style={{ padding: '12px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: '8px', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ padding: '12px', background: '#10b98115', border: '1px solid #10b98130', borderRadius: '8px', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div style={{ padding: '12px', background: '#111', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Last Earned Leave Log Time:</div>
                  <div style={{ fontSize: '0.85rem', color: '#f4f4f5', fontWeight: 600 }}>
                    {activeUser.lastEarnedLeaveUpdate ? dayjs(activeUser.lastEarnedLeaveUpdate).format('MMMM D, YYYY [at] h:mm A') : 'No updates recorded yet'}
                  </div>
                </div>

                <Field label="Earned Leave Balance">
                  <input 
                    required 
                    type="number" 
                    step="0.5" 
                    min="0" 
                    value={earnedLeaveBalance} 
                    onChange={e => setEarnedLeaveBalance(e.target.value)} 
                    style={{...inp, fontFamily: 'monospace', fontWeight: 800, color: '#6366f1'}} 
                  />
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Manually add or deduct the total available Earned Leave balance.
                  </p>
                </Field>

                <Field label="Working Days Counter (Count Time)">
                  <input 
                    required 
                    type="number" 
                    step="0.5" 
                    min="0" 
                    value={workingDaysCounter} 
                    onChange={e => setWorkingDaysCounter(e.target.value)} 
                    style={{...inp, fontFamily: 'monospace', fontWeight: 800, color: '#f59e0b'}} 
                  />
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    The number of working days accumulated so far (resets to 0 at 20 days).
                  </p>
                </Field>

                <button type="submit" disabled={submitting} style={{ background: 'white', color: 'black', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '0.5rem', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                  Save Changes
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
    </Skeleton>
  );
}

function Field({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px',
  padding: '10px 12px', color: 'white', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box'
};

const th: React.CSSProperties = { padding: '1rem 0.5rem', fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left', borderBottom: '1px solid #111' };
const td: React.CSSProperties = { padding: '0.75rem 0.5rem', verticalAlign: 'middle' };

const pgBtn: React.CSSProperties = {
  background: '#111',
  border: '1px solid #1a1a1a',
  color: '#a1a1aa',
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '0.65rem',
  fontWeight: 700,
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
};
