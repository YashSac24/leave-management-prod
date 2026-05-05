'use client';

import React, { useState, useEffect } from 'react';
import Calendar from '@/components/Calendar';
import ActivityPanel from '@/components/ActivityPanel';
import LeaveFormModal from '@/components/LeaveFormModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { X, Plus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from 'boneyard-js/react';
import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  return res.json();
};

export default function CalendarPage() {
  const { data: leavesData, mutate: mutateLeaves } = useSWR('/api/leaves', fetcher);
  const { data: holidaysData } = useSWR('/api/holidays', fetcher);

  const leaves = leavesData?.data || [];
  const holidays = holidaysData?.holidays || [];
  const loading = !leavesData || !holidaysData;
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; leave: any | null }>({
    isOpen: false,
    leave: null
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDateClick = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    setSelectedLeave(null);
    setSelectedDate(dateStr);
    setShowForm(true);
  };

  const handleEditLeave = (leave: any) => {
    setSelectedLeave(leave);
    setShowForm(true);
  };

  const handleDeleteLeave = (leave: any) => {
    setDeleteConfirm({ isOpen: true, leave });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.leave || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leaves/${deleteConfirm.leave._id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        mutateLeaves();
        setDeleteConfirm({ isOpen: false, leave: null });
      } else {        console.error('Delete failed:', data.error);
      }
    } catch (err) { 
      console.error('Delete error:', err); 
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateRange = (leave: any) => {
    if (!leave) return '';
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const options: any = { day: '2-digit', month: '2-digit', year: 'numeric' };
    
    const startStr = start.toLocaleDateString('en-GB', options);
    const endStr = end.toLocaleDateString('en-GB', options);
    
    if (startStr === endStr) return startStr;
    return `${startStr} - ${endStr}`;
  };

  return (
    <Skeleton name="calendar" loading={loading}>
      <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', position: 'relative', background: '#000' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
        <header style={{ padding: isMobile ? '1.25rem 1.25rem 0.5rem' : '1.5rem 1.5rem 0', marginBottom: isMobile ? '0.5rem' : '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="outfit" style={{ fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Calendar</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>Manage team availability and absences</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => setIsActivityOpen(!isActivityOpen)}
              style={{ 
                background: isActivityOpen ? '#111' : 'transparent', 
                border: isActivityOpen ? '1px solid #333' : '1px solid #1a1a1a', 
                color: isActivityOpen ? 'white' : 'var(--text-muted)', 
                padding: isMobile ? '8px 12px' : '10px 14px', 
                borderRadius: '10px', 
                cursor: 'pointer',
                fontSize: '0.8rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                outline: 'none',
                minWidth: isActivityOpen ? '40px' : 'auto'
              }}
              onMouseEnter={(e) => {
                if (!isActivityOpen) {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.background = '#09090b';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActivityOpen) {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = '#1a1a1a';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {isActivityOpen ? <X size={15} strokeWidth={2.5} /> : <Clock size={15} strokeWidth={2.5} />}
              {!isActivityOpen && <span>Activity</span>}
            </button>
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, padding: '0 1.5rem 1.5rem' }}>
          <Calendar 
            onDateClick={handleDateClick} 
            onDeleteLeave={handleDeleteLeave} 
            onEditLeave={handleEditLeave} 
            leaves={leaves} 
            holidays={holidays}
          />
        </div>
      </div>

      <LeaveFormModal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        initialDate={selectedDate}
        existingLeave={selectedLeave}
        onSuccess={() => mutateLeaves()} 
      />

      <AnimatePresence>
        {isActivityOpen && (
          <>
            {isMobile && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsActivityOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }}
              />
            )}
            <motion.div 
              initial={isMobile ? { x: '100%' } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0 } : { width: '320px', opacity: 1 }}
              exit={isMobile ? { x: '100%' } : { width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ 
                borderLeft: '1px solid #1a1a1a', 
                background: 'rgba(5, 5, 5, 0.85)', 
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
                position: isMobile ? 'fixed' : 'relative',
                top: 0, right: 0, height: '100%',
                zIndex: 110,
                width: isMobile ? '85%' : '320px'
              }}
            >
              <ActivityPanel leaves={leaves} onDeleteLeave={handleDeleteLeave} onClose={() => setIsActivityOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={deleteConfirm.isOpen}
        title="Delete Leave Request"
        message={`Are you sure you want to delete the leave range (${formatDateRange(deleteConfirm.leave)})? Your balance will be restored automatically.`}
        confirmText="Delete"
        cancelText="Keep"
        type="danger"
        loading={submitting}
        onCancel={() => setDeleteConfirm({ isOpen: false, leave: null })}
      />
      </div>
    </Skeleton>
  );
}
