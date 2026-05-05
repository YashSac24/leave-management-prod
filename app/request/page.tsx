'use client';

import React, { useState } from 'react';
import { Send, Calendar as CalendarIcon, FileText, ChevronDown, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import Calendar from '@/components/Calendar';
import { motion, AnimatePresence } from 'framer-motion';

export default function RequestLeave() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowForm(false);
      alert('Leave request submitted successfully!');
    }, 1500);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="reveal">
      <header style={{ marginBottom: '3rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '600', marginBottom: '1.5rem' }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <h1 className="outfit" style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '10px' }}>Select Leave Date</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Click on a date in the calendar to apply for leave.</p>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Calendar onDateClick={handleDateClick} />
      </div>

      <AnimatePresence>
        {showForm && (
          <div style={{ 
            position: 'fixed', 
            top: 0, left: 0, width: '100%', height: '100%', 
            background: 'rgba(0,0,0,0.8)', 
            backdropFilter: 'blur(8px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel"
              style={{ width: '100%', maxWidth: '600px', padding: '3rem', position: 'relative', background: '#09090b', border: '1px solid var(--card-border)' }}
            >
              <button 
                onClick={() => setShowForm(false)}
                style={{ position: 'absolute', right: '2rem', top: '2rem', background: 'none', border: 'none', color: 'var(--text-muted)' }}
              >
                <X size={24} />
              </button>

              <h2 className="outfit" style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>New Leave Request</h2>

              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
                <div className="field-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Leave Type</label>
                  <div style={{ position: 'relative' }}>
                    <select required style={{ appearance: 'none' }}>
                      <option value="LOP (Loss of Pay)">LOP (Loss of Pay)</option>
                      <option value="Sick">Sick Leave</option>
                      <option value="Casual">Casual Leave</option>
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="field-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Start Date</label>
                    <input type="date" defaultValue={formatDate(selectedDate)} required />
                  </div>
                  <div className="field-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>End Date</label>
                    <input type="date" defaultValue={formatDate(selectedDate)} required />
                  </div>
                </div>

                <div className="field-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Reason</label>
                  <textarea rows={3} required placeholder="Why are you taking leave?"></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary"
                  style={{ justifyContent: 'center', width: '100%', padding: '16px' }}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
