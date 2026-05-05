'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Check, 
  X,
  Sparkles,
  Info,
  Sun,
  Building2,
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ConfirmationModal from '@/components/ConfirmationModal';
import CustomDatePicker from '@/components/CustomDatePicker';
import CustomSelect from '@/components/CustomSelect';
import { Skeleton } from 'boneyard-js/react';


export default function HolidayManagementPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const ROWS_PER_PAGE = 10;


  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/admin/holidays');
      const data = await res.json();
      if (data.success) {
        const sorted = data.holidays.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setHolidays(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHolidays(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHoliday)
      });
      if (res.ok) {
        setNewHoliday({ name: '', date: '', type: 'Public', description: '' });
        setIsAdding(false);
        fetchHolidays();
      }
    } catch (err) {
      console.error('Failed to create holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.id;
    if (!id) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/holidays?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchHolidays();
    } catch (err) {
      console.error('Failed to delete holiday');
    } finally {
      setDeletingId(null);
      setConfirmModal({ isOpen: false, id: null });
    }
  };


  const typeConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    Public:   { color: '#3b82f6', bg: '#3b82f620', icon: Sun,       label: 'Public Holiday' },
    Optional: { color: '#f59e0b', bg: '#f59e0b20', icon: Star,      label: 'Optional Holiday' },
    Company:  { color: '#10b981', bg: '#10b98120', icon: Building2, label: 'Company Holiday' },
  };

  const upcomingCount = holidays.filter(h => new Date(h.date) >= new Date()).length;
  const pastCount = holidays.length - upcomingCount;
  const totalPages = Math.max(1, Math.ceil(holidays.length / ROWS_PER_PAGE));
  const paginatedHolidays = holidays.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  return (
    <Skeleton name="admin-holidays" loading={loading}>
      <div style={{ 
        height: '100vh', 
        overflowY: 'auto',
        background: '#000', 
        color: 'white', 
        padding: isMobile ? '1.25rem' : '1.5rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
      <div style={{ width: '100%' }}>

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
              <div style={{ background: '#059669', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                <CalendarIcon size={14} color="white" />
              </div>
              <div>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : '8px' }}>
                  <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Holiday Management</h1>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { label: `${holidays.length} Total`, color: '#3b82f6', bg: '#3b82f615' },
                      { label: `${upcomingCount} Upcoming`, color: '#10b981', bg: '#10b98115' },
                    ].map(chip => (
                      <span key={chip.label} style={{ fontSize: '0.55rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: chip.bg, color: chip.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{chip.label}</span>
                    ))}
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>{isMobile ? 'Company calendar config' : 'Configure company calendar and annual leave days'}</p>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAdding(true)}
            style={{ 
              background: 'white', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '9px', 
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', 
              gap: '6px', width: isMobile ? '100%' : 'auto', justifyContent: 'center'
            }}
          >
            <Plus size={14} strokeWidth={3} /> Add Holiday
          </motion.button>
        </header>

        {/* Add Form (Responsive Grid) */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ background: '#09090b', border: '1px solid #1e3a5f', borderRadius: '24px', padding: isMobile ? '1.5rem' : '2rem', marginBottom: '2rem', position: 'relative', boxShadow: '0 0 40px rgba(59,130,246,0.08)' }}
            >
              <button onClick={() => setIsAdding(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#111', border: '1px solid #1a1a1a', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                <X size={16} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.75rem' }}>
                <Sparkles size={16} color="#3b82f6" />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0 }}>Create Holiday Event</h2>
              </div>
              <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={labelStyle}>Holiday Name</label>
                  <input required type="text" value={newHoliday.name} onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})} placeholder="e.g. New Year's Day" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <CustomDatePicker
                    label="Date"
                    required
                    value={newHoliday.date}
                    onChange={(v) => setNewHoliday({...newHoliday, date: v})}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <CustomSelect
                    label="Type"
                    value={newHoliday.type}
                    onChange={(v) => setNewHoliday({...newHoliday, type: v})}
                    options={[
                      { value: 'Public', label: 'Public Holiday', icon: Sun, color: '#3b82f6' },
                      { value: 'Optional', label: 'Optional Holiday', icon: Star, color: '#f59e0b' },
                      { value: 'Company', label: 'Company Holiday', icon: Building2, color: '#10b981' }
                    ]}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={labelStyle}>Description (Optional)</label>
                  <input type="text" value={newHoliday.description} onChange={(e) => setNewHoliday({...newHoliday, description: e.target.value})} placeholder="Brief context..." style={inputStyle} />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: '1px solid #1a1a1a', color: '#a1a1aa', padding: '10px 20px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={{ background: 'white', color: 'black', border: 'none', padding: '10px 24px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
                    {submitting ? 'Saving...' : 'Add Holiday'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div style={{ background: '#080808', border: '1px solid #141414', borderRadius: '24px', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#09090b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#10b98115', padding: '6px', borderRadius: '8px' }}>
                <Info size={15} color="#10b981" />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>
                All Holidays <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>({holidays.length})</span>
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#060606' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Holiday Name</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Day</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {holidays.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '5rem', textAlign: 'center' }}>
                        <div style={{ opacity: 0.2, marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                          <CalendarIcon size={52} />
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>No holidays scheduled yet. Click "+ Add New Holiday" to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedHolidays.map((holiday, idx) => {
                      const cfg = typeConfig[holiday.type] || typeConfig.Public;
                      const TypeIcon = cfg.icon;
                      const date = new Date(holiday.date);
                      const isUpcoming = date >= new Date();
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
                      const formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

                      return (
                        <motion.tr
                          key={holiday._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.04 }}
                          style={{ borderBottom: '1px solid #0f0f0f', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#0d0d0d')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={tdStyle}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>#{idx + 1 + (currentPage - 1) * ROWS_PER_PAGE}</span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e4e4e7' }}>{holiday.name}</div>
                            {holiday.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>{holiday.description}</div>}
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 600 }}>{formattedDate}</span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 500 }}>{dayName}</span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '5px 12px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', background: cfg.bg, color: cfg.color, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <TypeIcon size={11} /> {holiday.type}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', background: isUpcoming ? '#10b98112' : '#71717a12', color: isUpcoming ? '#10b981' : '#71717a' }}>
                              {isUpcoming ? 'Upcoming' : 'Past'}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(holiday._id)}
                              disabled={deletingId === holiday._id}
                              style={{ background: '#ef444410', border: '1px solid #ef444420', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: deletingId === holiday._id ? 0.5 : 1 }}
                            >
                              {deletingId === holiday._id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.25rem', background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}>
            <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 500 }}>
              {holidays.length > 0 ? `Showing ${Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, holidays.length)}–${Math.min(currentPage * ROWS_PER_PAGE, holidays.length)} of ${holidays.length} holidays` : '0 holidays'}
            </span>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={pgBtn(currentPage === 1)}>
                <ChevronLeft size={12} /> Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)} style={{ ...pgBtn(false), background: p === currentPage ? '#2563eb' : '#111', color: p === currentPage ? 'white' : '#a1a1aa', minWidth: '30px', justifyContent: 'center', fontWeight: p === currentPage ? 800 : 600, border: p === currentPage ? '1px solid #2563eb' : '1px solid #2a2a2a' }}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={pgBtn(currentPage === totalPages)}>
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

      </div>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen} 
        title="Delete Holiday" 
        message="Are you sure you want to delete this holiday? This action is permanent."
        onConfirm={confirmDelete} 
        onCancel={() => setConfirmModal({ isOpen: false, id: null })} 
        type="danger" 
        loading={deletingId !== null} 
      />
      </div>
    </Skeleton>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px'
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#050505', border: '1px solid #1a1a1a', borderRadius: '12px',
  padding: '11px 14px', color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1.25rem', fontSize: '0.6rem', fontWeight: 800,
  textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left', borderBottom: '1px solid #111', color: 'var(--text-muted)'
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1.25rem', verticalAlign: 'middle'
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
