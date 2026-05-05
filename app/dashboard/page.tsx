'use client';

import React, { useState, useEffect } from 'react';
import DashboardView from '@/components/DashboardView';
import ActivityPanel from '@/components/ActivityPanel';
import LeaveFormModal from '@/components/LeaveFormModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';

import { Skeleton } from 'boneyard-js/react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  return res.json();
};

export default function DashboardPage() {
  const { data: leavesData, mutate: mutateLeaves } = useSWR('/api/leaves', fetcher);
  const { data: profileData, mutate: mutateProfile } = useSWR('/api/user/profile', fetcher);

  const leaves = leavesData?.data || [];
  const userData = profileData?.user || null;
  const loading = !leavesData || !profileData;

  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDeleteLeave = (leave: any) => {
    setLeaveToDelete(leave);
  };

  const confirmDelete = async () => {
    if (!leaveToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/leaves/${leaveToDelete._id}`, { method: 'DELETE' });
      if (res.ok) mutateLeaves();
    } catch (err) { 
      console.error(err); 
    } finally {
      setIsDeleting(false);
      setLeaveToDelete(null);
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
    <Skeleton name="dashboard" loading={loading}>
      <div style={{ display: 'flex', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>
      <div style={{ flex: 1, padding: isMobile ? '1.25rem' : '1.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#000' }}>
        <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="outfit" style={{ fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Overview</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>Real-time leave analytics and performance</p>
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
              {!isActivityOpen && <span>View Activity</span>}
            </button>
          </div>
        </header>

        <DashboardView leaves={leaves} userData={userData} onRefresh={mutateProfile} />
      </div>

      <LeaveFormModal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        onSuccess={() => { mutateLeaves(); mutateProfile(); }} 
      />

      <ConfirmationModal 
        isOpen={!!leaveToDelete}
        title="Delete Leave Request"
        message={`Are you sure you want to delete the leave range (${formatDateRange(leaveToDelete)})? Your balance will be restored automatically.`}
        confirmText="Delete"
        cancelText="Keep"
        type="danger"
        loading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setLeaveToDelete(null)}
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
                background: '#050505', 
                overflow: 'hidden',
                position: isMobile ? 'fixed' : 'relative',
                top: 0, right: 0, height: '100%',
                zIndex: 110,
                width: isMobile ? '85%' : '320px'
              }}
            >
              <ActivityPanel 
                leaves={leaves} 
                onDeleteLeave={handleDeleteLeave} 
                onClose={() => setIsActivityOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
    </Skeleton>
  );
}
