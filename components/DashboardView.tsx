'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Clock, CheckCircle, Heart, Award, BadgeCheck, PieChart } from 'lucide-react';
import SystemClock from './SystemClock';

interface Leave {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  duration: string;
}

interface DashboardViewProps {
  leaves: Leave[];
  userData?: any;
  onRefresh?: () => void;
}

const DashboardView = ({ leaves = [], userData }: DashboardViewProps) => {
  const currentYear = new Date().getFullYear();

  const currentYearNum = new Date().getFullYear();

  const deductibleTypes = ['Casual', 'Sick', 'Loyalty', 'Earned'];

  // Total deductible leaves used this year
  const totalUsed = leaves
    .filter(l => l.status === 'Approved' && deductibleTypes.includes(l.leaveType) && new Date(l.startDate).getFullYear() === currentYearNum)
    .reduce((acc, l) => {
      if (l.duration === 'Half Day') return acc + 0.5;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return acc + days;
    }, 0);

  const totalLOP = leaves
    .filter(l => l.status === 'Approved' && l.leaveType === 'LOP' && new Date(l.startDate).getFullYear() === currentYearNum)
    .reduce((acc, l) => {
      if (l.duration === 'Half Day') return acc + 0.5;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return acc + days;
    }, 0);

  const totalRemaining = (userData?.casualLeaveBalance || 0) +
    (userData?.sickLeaveBalance || 0) +
    (userData?.loyaltyLeaveBalance || 0) +
    (userData?.earnedLeaveBalance || 0);


  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };


  const stats = [
    {
      label: 'Casual Leaves',
      value: `${userData?.casualLeaveBalance?.toFixed(1) || '0.0'}`,
      icon: Briefcase,
      color: '#3b82f6',
      sub: 'Available Balance'
    },
    {
      label: 'Sick Leaves',
      value: `${userData?.sickLeaveBalance?.toFixed(1) || '0.0'}`,
      icon: Heart,
      color: '#ef4444',
      sub: 'Available Balance'
    },
    {
      label: 'Loyalty Leaves',
      value: `${userData?.loyaltyLeaveBalance?.toFixed(1) || '0.0'}`,
      icon: Award,
      color: '#8b5cf6',
      sub: 'Available Balance'
    },
    {
      label: 'Earned Leaves',
      value: `${userData?.earnedLeaveBalance?.toFixed(1) || '0.0'}`,
      icon: BadgeCheck,
      color: '#ec4899',
      sub: 'Available Balance'
    },
    {
      label: 'Total LOP',
      value: `${totalLOP.toFixed(1)}`,
      icon: CheckCircle,
      color: '#10b981',
      sub: 'Loss of Pay Count'
    },
    {
      label: 'Total Used',
      value: `${totalUsed.toFixed(1)}`,
      icon: Clock,
      color: '#f59e0b',
      sub: `${currentYearNum} Usage`
    },
    {
      label: 'Total Remaining',
      value: `${totalRemaining.toFixed(1)}`,
      icon: PieChart,
      color: '#06b6d4',
      sub: 'Overall Balance'
    },
  ];

  return (
    <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Profile & Date Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid #1a1a1a'
      }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '4px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time leave analytics and performance</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end' }}>
          <SystemClock timezone={userData?.timezone} />
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.6rem', color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Joining Date</p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#3b82f6' }}>{formatDate(userData?.joinedAt)}</p>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            style={{
              background: '#09090b', border: '1px solid #1a1a1a', padding: '1.5rem',
              borderRadius: '20px', display: 'flex', gap: '1rem', alignItems: 'center'
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: `${stat.color}15`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: stat.color
            }}>
              <stat.icon size={22} />
            </div>
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
                {stat.label}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>{stat.value}</h3>
              </div>
              <p style={{ fontSize: '0.65rem', color: '#a1a1aa', fontWeight: 500 }}>{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DashboardView;
