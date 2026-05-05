'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, History, ArrowLeft, Check, CalendarDays, 
  Calculator, User as UserIcon, Search, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import CustomSelect from '@/components/CustomSelect';
import CustomDatePicker from '@/components/CustomDatePicker';
import { Skeleton } from 'boneyard-js/react';


export default function ManualLeavePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [leaveType, setLeaveType] = useState('Casual');
  const [duration, setDuration] = useState('Full Day');
  const [halfDayOption, setHalfDayOption] = useState<string>('First Half');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('Manual Entry for Previous Record');
  const [exactDeduction, setExactDeduction] = useState<number | string>(1);
  
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [holidays, setHolidays] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isMobile, setIsMobile] = useState(false);

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

      const hRes = await fetch('/api/holidays');
      const hData = await hRes.json();
      if (hData.success) {
        setHolidays(hData.holidays);
      }
    } finally {
      setLoading(false);
    }
  };

  const isDateRestricted = (date: Date) => {
    const day = date.getDay();
    if (day === 0) return true; // Sunday

    const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidays.some(h => {
      const hDate = new Date(h.date);
      const hStr = `${hDate.getUTCFullYear()}-${String(hDate.getUTCMonth() + 1).padStart(2, '0')}-${String(hDate.getUTCDate()).padStart(2, '0')}`;
      return hStr === dStr;
    });
  };

  useEffect(() => {
    if (duration === 'Half Day') {
      setEndDate(startDate);
      setExactDeduction(0.5);
    } else if (startDate && endDate) {
        let count = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end >= start) {
          const current = new Date(start);
          while (current <= end) {
            if (!isDateRestricted(current)) {
              count++;
            }
            current.setDate(current.getDate() + 1);
          }
          setExactDeduction(count);
        } else {
          setExactDeduction(0);
        }
    }
  }, [startDate, endDate, duration, holidays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !startDate || !endDate) return setErrorMsg('Please fill all required fields');
    if (new Date(endDate) < new Date(startDate)) return setErrorMsg('End date cannot be before start date');

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/manual-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          leaveType, 
          duration, 
          halfDayOption: duration === 'Full Day' ? 'None' : halfDayOption,
          startDate, endDate, reason, 
          exactDeduction: Number(exactDeduction)
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccessMsg('Leave record created and balance updated successfully.');
        setStartDate('');
        setEndDate('');
        setReason('Manual Entry for Previous Record');
        // Refresh users to get latest balances
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'Failed to create leave');
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
    <Skeleton name="manual-leave" loading={loading}>
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
            <div style={{ background: '#ec4899', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <History size={14} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Manual Leave Entry</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>{isMobile ? 'Inject backdated records' : 'Create backdated records bypassing standard workflow'}</p>
            </div>
          </div>
        </div>
      </header>

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
        <div style={{ background: '#050505', border: '1px solid #111', borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: isMobile ? 'auto' : 'calc(100vh - 140px)', height: '100%', overflow: 'hidden' }}>
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
                    {!isMobile && <th style={th}>Bal (C/S/E)</th>}
                    <th style={{...th, textAlign: 'right'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr><td colSpan={isMobile ? 4 : 5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No employees found.</td></tr>
                  ) : paginatedUsers.map((u, index) => (
                    <tr key={u._id} 
                        onClick={() => setSelectedUser(u._id)}
                        style={{ 
                          borderBottom: '1px solid #0f0f0f', 
                          cursor: 'pointer',
                          background: selectedUser === u._id ? '#ec489910' : 'transparent',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => { if (selectedUser !== u._id) e.currentTarget.style.background = '#0a0a0a'; }}
                        onMouseLeave={e => { if (selectedUser !== u._id) e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{...td, width: '40px', fontSize: '0.72rem', color: '#71717a', fontWeight: 600}}>
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
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedUser === u._id ? '#ec4899' : '#e4e4e7' }}>{u.name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px', background: '#111', color: '#a1a1aa', fontWeight: 600 }}>{u.role}</span>
                      </td>
                      {!isMobile && (
                        <td style={td}>
                          {(currentUserRole === 'Administrator' || (['Admin', 'HR'].includes(currentUserRole || '') && ['User', 'TL'].includes(u.role))) ? (
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a1a1aa' }}>
                              <span style={{ color: '#3b82f6' }}>{u.casualLeaveBalance ?? 0}</span> / <span style={{ color: '#ef4444' }}>{u.sickLeaveBalance ?? 0}</span> / <span style={{ color: '#10b981' }}>{u.earnedLeaveBalance ?? 0}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.62rem', background: '#ec489910', color: '#ec4899', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>PRIVATE</span>
                          )}
                        </td>
                      )}
                      <td style={{...td, textAlign: 'right'}}>
                        <button 
                          style={{
                            background: selectedUser === u._id ? '#ec4899' : '#111', 
                            border: selectedUser === u._id ? '1px solid #ec4899' : '1px solid #222',
                            color: selectedUser === u._id ? 'white' : '#a1a1aa',
                            padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                          {selectedUser === u._id ? (isMobile ? 'Selected' : 'Selected') : (isMobile ? 'Select' : 'Add Leave')}
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
                      background: p === currentPage ? '#ec4899' : '#111', 
                      color: p === currentPage ? 'white' : '#a1a1aa',
                      minWidth: '30px',
                      justifyContent: 'center',
                      fontWeight: p === currentPage ? 800 : 600,
                      border: p === currentPage ? '1px solid #ec4899' : '1px solid #1a1a1a'
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
              <p style={{ fontSize: '0.75rem', maxWidth: '200px' }}>Use the table on the left to search and select an employee to add a manual leave record.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Active User Top Bar */}
              <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #1a1a1a' }}>
                <h3 style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ec4899', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Inserting record for</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ec489920', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {activeUser.avatar ? (
                      <img src={activeUser.avatar} alt={activeUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ec4899' }}>{activeUser.name.charAt(0)}</span>
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
                
                <Field label="Leave Type" icon={<History size={12}/>}>
                  <CustomSelect
                    value={leaveType}
                    onChange={setLeaveType}
                    options={['Casual', 'Sick', 'LOP', 'Loyalty', 'Earned'].map(t => ({ value: t, label: t }))}
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', zIndex: 10 }}>
                  <CustomDatePicker
                    label="Start Date"
                    required
                    value={startDate}
                    isDateDisabled={isDateRestricted}
                    onChange={(newDate) => {
                      setStartDate(newDate);
                      if (duration === 'Half Day' || (endDate && new Date(endDate) < new Date(newDate))) {
                        setEndDate(newDate);
                      }
                    }}
                  />
                  <CustomDatePicker
                    label="End Date"
                    required
                    disabled={duration === 'Half Day'}
                    value={duration === 'Half Day' ? startDate : endDate}
                    isDateDisabled={isDateRestricted}
                    onChange={setEndDate}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', zIndex: 9 }}>
                  <Field label="Duration">
                    <CustomSelect
                      value={duration}
                      onChange={setDuration}
                      options={[{ value: 'Full Day', label: 'Full Day' }, { value: 'Half Day', label: 'Half Day' }]}
                    />
                  </Field>
                  {duration === 'Half Day' ? (
                    <Field label="Half Day Option">
                      <CustomSelect
                        value={halfDayOption}
                        onChange={setHalfDayOption}
                        options={[{ value: 'First Half', label: 'First Half' }, { value: 'Second Half', label: 'Second Half' }]}
                      />
                    </Field>
                  ) : (
                    <Field label="Days to Deduct" icon={<Calculator size={12}/>}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input required type="number" step="0.5" min="0" value={exactDeduction} onChange={e => setExactDeduction(e.target.value)} style={{...inp, fontFamily: 'monospace', fontWeight: 800, color: '#ec4899'}} />
                      </div>
                    </Field>
                  )}
                </div>

                {duration === 'Half Day' && (
                  <Field label="Days to Deduct" icon={<Calculator size={12}/>}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input required type="number" step="0.5" min="0" value={exactDeduction} onChange={e => setExactDeduction(e.target.value)} style={{...inp, fontFamily: 'monospace', fontWeight: 800, color: '#ec4899'}} />
                    </div>
                  </Field>
                )}

                <Field label="Reason">
                  <input required type="text" value={reason} onChange={e => setReason(e.target.value)} style={inp} />
                </Field>

                <button type="submit" disabled={submitting} style={{ background: 'white', color: 'black', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '0.5rem', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                  Inject Approved Leave
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
