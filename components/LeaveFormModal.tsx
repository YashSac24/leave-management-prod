'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, CheckCircle, AlertCircle, Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';

interface Leave {
  _id: string;
  leaveType: string;
  duration: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

interface LeaveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  existingLeave?: Leave | null;
}

export default function LeaveFormModal({ isOpen, onClose, onSuccess, initialDate, existingLeave }: LeaveFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [userBalances, setUserBalances] = useState({ casual: 0.0, sick: 0.0, loyalty: 0.0, earned: 0.0 });
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [holidays, setHolidays] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    leaveType: 'Casual',
    duration: 'Full Day',
    halfDayOption: 'First Half',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchHolidays = async () => {
    try {
      const res = await fetch('/api/holidays');
      const data = await res.json();
      if (data.success) setHolidays(data.holidays);
    } catch (err) {
      console.error('Failed to fetch holidays');
    }
  };

  const isDateRestricted = (date: Date) => {
    if (date.getDay() === 0) return true; // Sunday
    return holidays.some(h => new Date(h.date).toDateString() === date.toDateString());
  };

  const fetchBalances = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      if (data.success) {
        setUserBalances({
          casual: data.user.casualLeaveBalance ?? 0,
          sick: data.user.sickLeaveBalance ?? 0,
          loyalty: data.user.loyaltyLeaveBalance ?? 0,
          earned: data.user.earnedLeaveBalance ?? 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch balances');
    } finally {
      setLoadingBalances(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
        setLoadingBalances(true);
        fetchBalances();
        fetchHolidays();
        if (existingLeave) {
            setFormData({
              leaveType: existingLeave.leaveType || 'Casual',
              duration: existingLeave.duration || 'Full Day',
              halfDayOption: (existingLeave as any).halfDayOption || 'First Half',
              startDate: existingLeave.startDate.split('T')[0],
              endDate: existingLeave.endDate.split('T')[0],
              reason: existingLeave.reason || ''
            });
          } else {
            setFormData({
              leaveType: 'Casual',
              duration: 'Full Day',
              halfDayOption: 'First Half',
              startDate: initialDate || '',
              endDate: initialDate || '',
              reason: ''
            });
          }
    }
  }, [isOpen, initialDate, existingLeave]);

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      showNotify('Please fill in all fields', 'error');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      showNotify('End date cannot be before start date', 'error');
      return;
    }

    if (isDateRestricted(new Date(formData.startDate))) {
      showNotify('Leave cannot start on a Sunday or Holiday', 'error');
      return;
    }

    if (isDateRestricted(new Date(formData.endDate))) {
      showNotify('Leave cannot end on a Sunday or Holiday', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showNotify('Leave request submitted successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 200);
      } else {
        showNotify(data.error || 'Request failed', 'error');
      }
    } catch (err: any) {
      showNotify('Network error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          {/* Toast Notification */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -20, x: '-50%' }}
                animate={{ opacity: 1, y: 30, x: '-50%' }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed', top: 0, left: '50%', zIndex: 2100,
                  background: notification.type === 'success' ? '#16a34a' : '#dc2626',
                  color: 'white', padding: '12px 24px', borderRadius: '12px',
                  fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {notification.message}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            style={{
              width: '90%', maxWidth: '420px', padding: '4rem 2rem 2rem',
              background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '24px', boxShadow: '0 50px 100px rgba(0,0,0,0.9)',
              position: 'relative'
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute', right: '1.25rem', top: '1.25rem',
                background: 'rgba(255,255,255,0.03)', border: '1px solid #1a1a1a',
                color: 'var(--text-muted)', borderRadius: '50%', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10
              }}
            >
              <X size={16} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
                {loadingBalances ? (
                  <>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ height: '24px', background: '#111', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                        <motion.div 
                          animate={{ x: ['-100%', '100%'] }} 
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                          style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)' }}
                        />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <span style={{ background: '#3b82f620', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800 }}>CASUAL: {(userBalances.casual ?? 0).toFixed(1)}</span>
                    <span style={{ background: '#ef444420', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800 }}>SICK: {(userBalances.sick ?? 0).toFixed(1)}</span>
                    <span style={{ background: '#8b5cf620', color: '#8b5cf6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800 }}>LOYALTY: {(userBalances.loyalty ?? 0).toFixed(1)}</span>
                    <span style={{ background: '#ec489920', color: '#ec4899', padding: '4px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800 }}>EARNED: {(userBalances.earned ?? 0).toFixed(1)}</span>
                  </>
                )}
              </div>
              <h2 className="outfit" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
                {existingLeave ? 'Edit Request' : 'New Request'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Leave Type <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                      style={{
                        width: '100%', background: '#000', color: '#e4e4e7', border: '1px solid #111',
                        fontSize: '0.85rem', padding: '12px 14px', borderRadius: '12px',
                        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <span style={{ fontWeight: '600' }}>{formData.leaveType}</span>
                      <ChevronDown size={12} style={{ color: '#3f3f46' }} />
                    </div>
                    {showTypeDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, width: '100%',
                        background: '#0c0c0e', border: '1px solid #27272a',
                        borderRadius: '12px', overflow: 'hidden', zIndex: 10, padding: '4px', marginTop: '4px'
                      }}>
                        {['Casual', 'Sick', 'Loyalty', 'Earned', 'LOP'].map((t) => (
                          <div
                            key={t}
                            onClick={() => { setFormData({ ...formData, leaveType: t }); setShowTypeDropdown(false); }}
                            style={{
                              padding: '10px 12px', fontSize: '0.8rem', color: formData.leaveType === t ? 'white' : '#a1a1aa',
                              cursor: 'pointer', borderRadius: '8px',
                              background: formData.leaveType === t ? '#1a1a1a' : 'transparent'
                            }}
                          >
                            {t}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Duration <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', background: '#000', border: '1px solid #111', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, duration: 'Full Day' })}
                      style={{
                        flex: 1, padding: '8px', border: 'none', background: formData.duration === 'Full Day' ? '#18181b' : 'transparent',
                        color: formData.duration === 'Full Day' ? 'white' : '#3f3f46', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700
                      }}
                    >
                      Full
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, duration: 'Half Day', endDate: formData.startDate })}
                      style={{
                        flex: 1, padding: '8px', border: 'none', background: formData.duration === 'Half Day' ? '#18181b' : 'transparent',
                        color: formData.duration === 'Half Day' ? 'white' : '#3f3f46', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700
                      }}
                    >
                      Half
                    </button>
                  </div>
                </div>
              </div>

              {formData.duration === 'Half Day' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Half Day Option <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', background: '#000', border: '1px solid #111', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, halfDayOption: 'First Half' })}
                      style={{
                        flex: 1, padding: '10px', border: 'none', background: formData.halfDayOption === 'First Half' ? '#18181b' : 'transparent',
                        color: formData.halfDayOption === 'First Half' ? 'white' : '#71717a', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                      }}
                    >
                      1st Half (Morning)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, halfDayOption: 'Second Half' })}
                      style={{
                        flex: 1, padding: '10px', border: 'none', background: formData.halfDayOption === 'Second Half' ? '#18181b' : 'transparent',
                        color: formData.halfDayOption === 'Second Half' ? 'white' : '#71717a', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                      }}
                    >
                      2nd Half (Afternoon)
                    </button>
                  </div>
                </motion.div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: formData.duration === 'Half Day' ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <CustomDatePicker
                  label={formData.duration === 'Half Day' ? 'Date' : 'Start Date'}
                  required
                  value={formData.startDate}
                  onChange={(newDate) => {
                    const shouldUpdateEnd = formData.duration === 'Half Day' || (formData.endDate && new Date(formData.endDate) < new Date(newDate));
                    setFormData({
                      ...formData,
                      startDate: newDate,
                      endDate: shouldUpdateEnd ? newDate : formData.endDate
                    });
                  }}
                  isDateDisabled={isDateRestricted}
                />
                
                {formData.duration !== 'Half Day' && (
                  <CustomDatePicker
                    label="End Date"
                    required
                    value={formData.endDate}
                    onChange={(newDate) => setFormData({ ...formData, endDate: newDate })}
                    isDateDisabled={isDateRestricted}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Reason / Notes <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={2}
                  placeholder="Why are you taking leave?"
                  style={{ width: '100%', background: '#000', color: '#e4e4e7', border: '1px solid #111', fontSize: '0.85rem', resize: 'none', padding: '12px', borderRadius: '12px', outline: 'none', lineHeight: '1.5' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: 'white', color: 'black', border: 'none',
                  padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '800', width: '100%',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Submit Request'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
