'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './Calendar.module.css';
import { ChevronLeft, ChevronRight, ChevronDown, Search, Plus, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Leave {
  _id: string;
  leaveType: string;
  duration: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface CalendarProps {
  onDateClick?: (date: Date) => void;
  onDeleteLeave?: (leave: Leave) => void;
  onEditLeave?: (leave: Leave) => void;
  leaves?: Leave[];
  holidays?: any[];
}

const Calendar = ({ onDateClick, onDeleteLeave, onEditLeave, leaves = [], holidays = [] }: CalendarProps) => {

  const [viewDate, setViewDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowMonthPicker(false);
        setShowYearPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const setMonth = (m: number) => {
    setViewDate(new Date(viewDate.getFullYear(), m, 1));
    setShowMonthPicker(false);
  };

  const setYear = (y: number) => {
    setViewDate(new Date(y, viewDate.getMonth(), 1));
    setShowYearPicker(false);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const handleMonthToggle = () => {
    setShowMonthPicker(!showMonthPicker);
    if (!showMonthPicker) setShowYearPicker(false);
  };

  const handleYearToggle = () => {
    setShowYearPicker(!showYearPicker);
    if (!showYearPicker) setShowMonthPicker(false);
  };

  const getLeaveColor = (leave: Leave) => {
    if (leave.leaveType === 'Sick') return '#ef4444';
    if (leave.leaveType === 'Casual') return '#16a34a';
    if (leave.leaveType === 'LOP') return '#f59e0b';
    return '#2563eb';
  };

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = [];
  for (let i = 0; i < offset; i++) {
    days.push(<div key={`empty-${i}`} className={styles.dayEmpty}></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const currentDayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    const dayStr = `${currentDayDate.getFullYear()}-${String(currentDayDate.getMonth() + 1).padStart(2, '0')}-${String(currentDayDate.getDate()).padStart(2, '0')}`;

    const dayHolidays = holidays.filter(h => {
      const date = new Date(h.date);
      const hStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      return hStr === dayStr;
    });

    const isToday = today.toDateString() === currentDayDate.toDateString();
    const isHoliday = dayHolidays.length > 0;
    const isSunday = currentDayDate.getDay() === 0;

    const dayLeaves = leaves.filter(leave => {
      if (isSunday || isHoliday) return false;
      
      const getDS = (dt: Date | string) => {
        const date = new Date(dt);
        // Normalize to YYYY-MM-DD using local time to match dayStr
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      
      const startDS = getDS(leave.startDate);
      const endDS = getDS(leave.endDate);
      const isInRange = dayStr >= startDS && dayStr <= endDS;
      return isInRange;
    });

    days.push(
      <div 
        key={d} 
        className={styles.day} 
        onClick={() => {
          if (isHoliday || isSunday) return;
          onDateClick && onDateClick(currentDayDate);
        }}
        style={{ cursor: (isHoliday || isSunday) ? 'default' : 'pointer' }}
      >
        <span className={isToday ? styles.todayNumber : styles.dayNumber}>{d}</span>
        <div className={styles.eventContainer}>
          {dayHolidays.map((holiday) => (
            <div
              key={holiday._id}
              style={{
                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '9.5px',
                fontWeight: 900,
                textTransform: 'uppercase',
                marginBottom: '4px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {holiday.name}
            </div>
          ))}
          {dayLeaves.map((leave) => (

            <div
              key={leave._id}
              className="event-label"
              onClick={(e) => {
                e.stopPropagation();
                onEditLeave && onEditLeave(leave);
              }}
              style={{
                background: leave.leaveType === 'Sick' 
                  ? 'linear-gradient(90deg, #ef4444 0%, #991b1b 100%)' 
                  : leave.leaveType === 'Casual' 
                    ? 'linear-gradient(90deg, #10b981 0%, #065f46 100%)' 
                    : leave.leaveType === 'LOP' || leave.leaveType.includes('Loss') 
                      ? 'linear-gradient(90deg, #f59e0b 0%, #92400e 100%)' 
                      : 'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)',
                opacity: leave.status === 'Approved' ? 1 : 0.6,
                borderLeft: `3px solid ${leave.status === 'Approved' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)'}`,
                padding: '5px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                margin: '2px 0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                {leave.duration === 'Half Day' && <Clock size={8} style={{ flexShrink: 0 }} />}
                <span style={{ fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {leave.leaveType === 'LOP' || leave.leaveType.includes('Loss of Pay') ? 'LOP' :
                    leave.leaveType === 'Sick' ? 'SL' :
                      leave.leaveType === 'Casual' ? 'CL' :
                        `${leave.leaveType.substring(0, 1).toUpperCase()}L`} {leave.duration === 'Half Day' ? '½' : ''}
                </span>
              </div>
              <X
                size={10}
                style={{ cursor: 'pointer', flexShrink: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLeave && onDeleteLeave(leave);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.calendarFull}>
      <header className={styles.calHeader}>
        <div className={styles.dateInfo}>
          <div className={styles.calBadge} style={{ cursor: 'default' }}>
            {monthNames[today.getMonth()].substring(0, 3).toUpperCase()}
            <span>{today.getDate()}</span>
          </div>
          <div style={{ position: 'relative' }} ref={pickerRef}>
            <h2 className={styles.headerTitle}>
              <span className={styles.clickable} onClick={handleMonthToggle}>{monthNames[viewDate.getMonth()]}</span>
              <span className={styles.clickable} onClick={handleYearToggle}>{viewDate.getFullYear()}</span>
            </h2>
            <p className={styles.subtext}>Monthly overview for {monthNames[viewDate.getMonth()]}</p>

            <AnimatePresence>
              {showMonthPicker && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={styles.pickerPopup}>
                  <div className={styles.pickerGrid}>
                    {monthNames.map((m, idx) => (
                      <div key={m} className={viewDate.getMonth() === idx ? styles.pickerItemActive : styles.pickerItem} onClick={() => setMonth(idx)}>
                        {m.substring(0, 3)}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showYearPicker && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={styles.pickerPopup} style={{ left: '100px' }}>
                  <div className={styles.pickerGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)', maxHeight: '200px', overflowY: 'auto' }}>
                    {Array.from({ length: 21 }, (_, i) => 2020 + i).map((y) => (
                      <div key={y} className={viewDate.getFullYear() === y ? styles.pickerItemActive : styles.pickerItem} onClick={() => setYear(y)}>
                        {y}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className={styles.controls}>
          <button className={styles.navBtn} onClick={() => changeMonth(-1)}>
            <ChevronLeft size={16} />
          </button>
          <button className={styles.navBtn} onClick={() => changeMonth(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <div className={styles.weekdays}>
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>

      <div className={styles.grid}>
        {days}
      </div>
    </div>
  );
};

export default Calendar;
