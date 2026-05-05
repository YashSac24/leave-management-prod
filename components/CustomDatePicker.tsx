'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  isDateDisabled?: (date: Date) => boolean;
}

const CustomDatePicker = ({ value, onChange, label, required = false, disabled = false, isDateDisabled }: CustomDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [openUpwards, setOpenUpwards] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const calHeight = 350;
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldUp = spaceBelow < calHeight && rect.top > calHeight;
      
      setOpenUpwards(shouldUp);
      
      let left = rect.left;
      if (left + 280 > window.innerWidth) {
        left = window.innerWidth - 300;
      }

      setCoords({
        top: shouldUp ? rect.top : rect.bottom,
        left: Math.max(10, left)
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portal = document.getElementById('portal-datepicker');
        if (portal && portal.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      const close = () => { setIsOpen(false); setViewMode('days'); };
      window.addEventListener('scroll', close, true);
      window.addEventListener('resize', close);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', close, true);
        window.removeEventListener('resize', close);
      };
    }
  }, [isOpen]);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const displayDate = value ? new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, ' / ') : 'Select Date';

  const selectDate = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (isDateDisabled && isDateDisabled(selected)) return;
    onChange(formatDate(selected));
    setIsOpen(false);
  };

  const days = [];
  for (let i = 0; i < offset; i++) {
    days.push(<div key={`empty-${i}`} style={{ padding: '8px' }}></div>);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    const isSelected = value === formatDate(dateObj);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    const isDisabled = isDateDisabled ? isDateDisabled(dateObj) : false;
    
    days.push(
      <button key={d} type="button" onClick={() => !isDisabled && selectDate(d)}
        style={{
          padding: '8px', background: isSelected ? '#3b82f6' : 'transparent', border: 'none',
          color: isSelected ? 'white' : isDisabled ? '#ef4444' : isToday ? '#3b82f6' : '#e4e4e7',
          borderRadius: '8px', fontSize: '0.75rem', fontWeight: isSelected || isToday || isDisabled ? 800 : 500,
          cursor: isDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex',
          alignItems: 'center', justifyContent: 'center', outline: 'none',
          opacity: isDisabled ? 0.6 : 1
        }}>
        {d}
      </button>
    );
  }

  const years = [];
  const currY = new Date().getFullYear();
  for (let y = currY - 10; y <= currY + 20; y++) years.push(y);

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      {label && (
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      <div onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%', background: '#050505', color: value ? '#e4e4e7' : 'var(--text-muted)', border: '1px solid #1a1a1a',
          padding: '11px 14px', borderRadius: '12px', fontSize: '0.85rem', cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: value ? '700' : '500',
          opacity: disabled ? 0.5 : 1
        }}>
        <span>{displayDate}</span>
        <CalendarIcon size={14} style={{ color: '#3f3f46' }} />
      </div>

      {mounted && isOpen && createPortal(
        <div id="portal-datepicker" style={{ position: 'relative', zIndex: 10000 }}>
          <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: openUpwards ? 5 : -5 }}
                animate={{ opacity: 1, scale: 1, y: openUpwards ? -10 : 10 }}
                exit={{ opacity: 0, scale: 0.95, y: openUpwards ? 5 : -5 }}
                style={{
                  position: 'fixed', top: coords.top, left: coords.left, minWidth: '280px',
                  background: '#09090b', border: '1px solid #1a1a1a', borderRadius: '16px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: '1rem', overflow: 'hidden',
                  pointerEvents: 'auto'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <button type="button" onClick={handlePrevMonth} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={18} /></button>
                  <div style={{ display: 'flex', gap: '4px', fontSize: '0.85rem', fontWeight: 800 }}>
                    <button type="button" onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')} style={{ background: 'none', border: 'none', color: viewMode === 'months' ? '#3b82f6' : 'white', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}>{monthNames[viewDate.getMonth()]}</button>
                    <button type="button" onClick={() => setViewMode(viewMode === 'years' ? 'days' : 'years')} style={{ background: 'none', border: 'none', color: viewMode === 'years' ? '#3b82f6' : '#71717a', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}>{viewDate.getFullYear()}</button>
                  </div>
                  <button type="button" onClick={handleNextMonth} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}><ChevronRight size={18} /></button>
                </div>

                <div style={{ minHeight: '180px' }}>
                  <AnimatePresence mode="wait">
                    {viewMode === 'months' ? (
                      <motion.div key="months" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {monthNames.map((m, idx) => (
                          <button key={m} type="button" onClick={() => { setViewDate(new Date(viewDate.getFullYear(), idx, 1)); setViewMode('days'); }}
                            style={{ padding: '10px 4px', background: viewDate.getMonth() === idx ? '#3b82f6' : 'transparent', border: 'none', color: viewDate.getMonth() === idx ? 'white' : '#a1a1aa', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>{m.substring(0, 3)}</button>
                        ))}
                      </motion.div>
                    ) : viewMode === 'years' ? (
                      <motion.div key="years" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                        {years.map(y => (
                          <button key={y} type="button" onClick={() => { setViewDate(new Date(y, viewDate.getMonth(), 1)); setViewMode('days'); }}
                            style={{ padding: '8px 4px', background: viewDate.getFullYear() === y ? '#3b82f6' : 'transparent', border: 'none', color: viewDate.getFullYear() === y ? 'white' : '#a1a1aa', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>{y}</button>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div key="days" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '8px' }}>
                          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (<div key={d} style={{ fontSize: '0.65rem', color: '#3f3f46', fontWeight: 800, padding: '4px' }}>{d}</div>))}
                          {days}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div style={{ borderTop: '1px solid #111', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                  <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Clear</button>
                  <button type="button" onClick={() => { const today = new Date(); onChange(formatDate(today)); setViewDate(today); setIsOpen(false); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Today</button>
                </div>
              </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomDatePicker;
