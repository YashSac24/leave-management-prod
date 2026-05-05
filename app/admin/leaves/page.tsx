'use client';

import React, { useEffect, useState } from 'react';
import { 
  ClipboardList, Search, ArrowLeft, Loader2, ArrowUpDown,
  ChevronLeft, ChevronRight, X, CircleAlert, History,
  TrendingDown, Users, Calendar as CalendarIcon, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from 'boneyard-js/react';
import ConfirmationModal from '@/components/ConfirmationModal';



interface LeaveUserSummary {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  casualBalance: number;
  sickBalance: number;
  casualUsed: number;
  sickUsed: number;
  totalLop: number;
  totalAssigned: number;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function LeaveManagementPage() {
  const [data, setData] = useState<LeaveUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof LeaveUserSummary>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const ROWS = 10;

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LeaveUserSummary | null>(null);
  const [userLeaves, setUserLeaves] = useState<any[]>([]);
  const [fetchingLeaves, setFetchingLeaves] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; leaveId: string | null }>({ isOpen: false, leaveId: null });
  const [deleting, setDeleting] = useState(false);


  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leave-summary?month=${selectedMonth}&year=${selectedYear}`);
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
    } finally { setLoading(false); }
  };

  const openDetails = async (user: LeaveUserSummary) => {
    setSelectedUser(user); setIsModalOpen(true); setFetchingLeaves(true);
    try {
      const res = await fetch(`/api/admin/user-leaves/${user.id}`);
      const d = await res.json();
      if (d.success) setUserLeaves(d.leaves);
    } finally { setFetchingLeaves(false); }
  };

  const deleteLeave = async (leaveId: string) => {
    setConfirmModal({ isOpen: true, leaveId });
  };

  const confirmDelete = async () => {
    const leaveId = confirmModal.leaveId;
    if (!leaveId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leaves/${leaveId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUserLeaves(prev => prev.filter(l => l._id !== leaveId));
        fetchData(); 
      }
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, leaveId: null });
    }
  };


  const shiftMonth = (offset: number) => {
    let m = selectedMonth + offset, y = selectedYear;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setSelectedMonth(m); setSelectedYear(y);
  };

  const handleSort = (field: keyof LeaveUserSummary) => {
    if (field === sortField) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const filteredData = data
    .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const vA = a[sortField], vB = b[sortField];
      if (typeof vA === 'string' && typeof vB === 'string') return sortOrder === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return sortOrder === 'asc' ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
    });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS));
  const paginatedData = filteredData.slice((currentPage - 1) * ROWS, currentPage * ROWS);

  const LEAVE_TYPES: Record<string, { color: string; bg: string }> = {
    Sick:    { color: '#ef4444', bg: '#ef444415' },
    Casual:  { color: '#3b82f6', bg: '#3b82f615' },
    LOP:     { color: '#f59e0b', bg: '#f59e0b15' },
    Loyalty: { color: '#a78bfa', bg: '#a78bfa15' },
    Earned:  { color: '#10b981', bg: '#10b98115' },
  };

  const SortTh = ({ field, label }: { field: keyof LeaveUserSummary; label: string }) => (
    <th onClick={() => handleSort(field)} style={thStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none' }}>
        {label}
        <ArrowUpDown size={10} style={{ opacity: sortField === field ? 1 : 0.3, color: sortField === field ? '#3b82f6' : 'inherit' }} />
      </div>
    </th>
  );

  return (
    <Skeleton name="admin-leaves" loading={loading}>
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
            <div style={{ background: '#7c3aed', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <ClipboardList size={14} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : '8px' }}>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Leave Matrix</h1>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#7c3aed15', color: '#a78bfa', textTransform: 'uppercase' }}>{MONTHS[selectedMonth]} {selectedYear}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>{isMobile ? 'Team leave usage log' : 'Real-time employee leave consumption and LOP logs'}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
          {/* Month Switcher */}
          <div style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: '10px', display: 'flex', alignItems: 'center', overflow: 'hidden', flex: isMobile ? 1 : 'none' }}>
            <button onClick={() => shiftMonth(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            <div style={{ padding: '0 10px', borderLeft: '1px solid #1a1a1a', borderRight: '1px solid #1a1a1a', textAlign: 'center', minWidth: isMobile ? 'auto' : '100px', flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>{MONTHS[selectedMonth]}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{selectedYear}</div>
            </div>
            <button onClick={() => shiftMonth(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: isMobile ? 1 : 'none' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#3f3f46' }} />
            <input
              type="text" placeholder={isMobile ? "Search..." : "Filter employees..."} value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ width: isMobile ? '100%' : '200px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '7px 10px 7px 30px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
            />
          </div>
        </div>
      </header>

      {/* Table */}
      <div style={{ background: '#080808', border: '1px solid #141414', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#060606', borderBottom: '1px solid #111' }}>
                <th style={{...thStyle, width: '40px'}}>#</th>
                <SortTh field="name" label="Employee" />
                <SortTh field="totalAssigned" label="Assigned" />
                <SortTh field="sickUsed" label={`Sick (${MONTHS[selectedMonth].slice(0,3)})`} />
                <SortTh field="casualUsed" label={`Casual (${MONTHS[selectedMonth].slice(0,3)})`} />
                <SortTh field="totalLop" label={`LOP (${MONTHS[selectedMonth].slice(0,3)})`} />
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '5rem', textAlign: 'center' }}>
                      <CircleAlert size={28} style={{ margin: '0 auto', color: 'var(--text-muted)' }} />
                      <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No records for {MONTHS[selectedMonth]} {selectedYear}</p>
                    </td>
                  </tr>
                ) : paginatedData.map((user, idx) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    style={{ borderBottom: '1px solid #0f0f0f', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0d0d0d'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{...td, width: '40px', fontSize: '0.72rem', color: '#71717a', fontWeight: 600}}>
                      {(currentPage - 1) * ROWS + idx + 1}
                    </td>
                    {/* Employee */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0f0f0f', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed' }}>{user.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white' }}>{user.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Assigned */}
                    <td style={td}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a1a1aa' }}>
                        {user.sickBalance} Sick / {user.casualBalance} Casual
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user.totalAssigned} Days Total</div>
                    </td>

                    {/* Sick */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ef4444', minWidth: '16px' }}>{user.sickUsed}</span>
                        <div style={{ flex: 1, maxWidth: '60px', height: '4px', background: '#111', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (user.sickUsed / (user.sickUsed + user.sickBalance || 1)) * 100)}%`, height: '100%', background: '#ef4444', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    </td>

                    {/* Casual */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#3b82f6', minWidth: '16px' }}>{user.casualUsed}</span>
                        <div style={{ flex: 1, maxWidth: '60px', height: '4px', background: '#111', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (user.casualUsed / (user.casualUsed + user.casualBalance || 1)) * 100)}%`, height: '100%', background: '#3b82f6', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    </td>

                    {/* LOP */}
                    <td style={td}>
                      {user.totalLop > 0 ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', background: '#ef444415', color: '#ef4444', border: '1px solid #ef444425' }}>
                          {user.totalLop} {user.totalLop === 1 ? 'day' : 'days'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td style={td}>
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => openDetails(user)}
                        style={{ background: '#111', border: '1px solid #1a1a1a', color: '#a1a1aa', padding: '6px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <History size={12} /> View Logs
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '0.8rem 1.25rem', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a' }}>
            <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 500 }}>
              {filteredData.length > 0 ? `Showing ${(currentPage-1)*ROWS+1}-${Math.min(currentPage*ROWS, filteredData.length)} of ${filteredData.length} users` : '0 users'}
            </span>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} style={pgBtn(currentPage === 1)}>
                <ChevronLeft size={12} /> Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  style={{ ...pgBtn(false), background: p === currentPage ? '#7c3aed' : '#111', color: p === currentPage ? 'white' : '#a1a1aa', minWidth: '30px', justifyContent: 'center', fontWeight: p === currentPage ? 800 : 600, border: p === currentPage ? '1px solid #7c3aed' : '1px solid #2a2a2a' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} style={pgBtn(currentPage === totalPages)}>
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Detail Modal */}
    <AnimatePresence>
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', padding: '1.5rem' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            style={{ width: '100%', maxWidth: '900px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.9)' }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#060606' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#7c3aed15', border: '1px solid #7c3aed30', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {selectedUser?.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#a78bfa' }}>{selectedUser?.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'white' }}>{selectedUser?.name}'s Leave History</h2>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>Complete absence and leave log archive</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(false)}
                style={{ background: '#111', border: '1px solid #1a1a1a', color: 'var(--text-muted)', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
              >
                <X size={15} />
              </motion.button>
            </div>

            {/* Modal Body */}
            <div style={{ maxHeight: '55vh', overflowY: 'auto', background: '#050505' }}>
              {fetchingLeaves ? (
                <div style={{ padding: '5rem', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto', color: '#7c3aed' }} />
                  <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Syncing records...</p>
                </div>
              ) : userLeaves.length === 0 ? (
                <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CircleAlert size={28} style={{ margin: '0 auto' }} />
                  <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>No leave records found.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#060606', borderBottom: '1px solid #111' }}>
                      {['Date', 'Type', 'Duration', 'Reason', 'Status', 'Action'].map(h => (
                        <th key={h} style={{ padding: '0.7rem 1.1rem', fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', textAlign: h === 'Action' ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userLeaves.map((l, i) => {
                      const lt = LEAVE_TYPES[l.leaveType] || { color: '#71717a', bg: '#71717a15' };
                      const startD = new Date(l.startDate);
                      const endD = new Date(l.endDate);
                      const sameDay = startD.toDateString() === endD.toDateString();
                      return (
                        <tr key={l._id} style={{ borderBottom: '1px solid #0f0f0f', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#0a0a0a'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={mTd}>
                            <div style={{ fontSize: '0.78rem', color: '#e4e4e7', fontWeight: 600 }}>
                              {startD.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            {!sameDay && <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>→ {endD.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>}
                          </td>
                          <td style={mTd}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', background: lt.bg, color: lt.color }}>
                              {l.leaveType}
                            </span>
                          </td>
                          <td style={mTd}>
                            <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500 }}>{l.duration}</div>
                            {l.duration === 'Half Day' && (
                              <div style={{ fontSize: '0.62rem', color: '#3b82f6', fontWeight: 700 }}>({l.halfDayOption || '1st Half'})</div>
                            )}
                          </td>
                          <td style={{ ...mTd, maxWidth: '220px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                              {l.reason || 'No reason provided'}
                            </span>
                          </td>
                          <td style={mTd}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase',
                              background: l.status === 'Approved' ? '#10b98115' : l.status === 'Pending' ? '#f59e0b15' : '#ef444415',
                              color: l.status === 'Approved' ? '#10b981' : l.status === 'Pending' ? '#f59e0b' : '#ef4444' }}>
                              {l.status}
                            </span>
                          </td>
                          <td style={{ ...mTd, textAlign: 'right' }}>
                            <button
                              onClick={() => deleteLeave(l._id)}
                              style={{ background: 'transparent', border: '1px solid #ef444430', color: '#ef4444', padding: '5px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex' }}
                              title="Delete Record & Refund Balance"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '0.9rem 1.5rem', background: '#060606', borderTop: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{userLeaves.length} record{userLeaves.length !== 1 ? 's' : ''} found</span>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setIsModalOpen(false)}
                style={{ background: '#111', border: '1px solid #1a1a1a', color: '#a1a1aa', padding: '7px 18px', borderRadius: '9px', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title="Delete Leave Record"
        message="Are you sure you want to delete this leave record? The balance will be refunded automatically if applicable."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, leaveId: null })}
        type="danger"
        loading={deleting}
      />
    </Skeleton>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.7rem 1rem', fontSize: '0.58rem', color: '#71717a',
  fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'left'
};

const td: React.CSSProperties = { padding: '0.75rem 1rem', verticalAlign: 'middle' };
const mTd: React.CSSProperties = { padding: '0.65rem 1.1rem', verticalAlign: 'middle' };

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
