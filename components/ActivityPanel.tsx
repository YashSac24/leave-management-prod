'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, ShieldCheck, XCircle, AlertCircle } from 'lucide-react';

interface Leave {
  _id: string;
  leaveType: string;
  type?: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
  duration?: string;
  halfDayOption?: string;
}

interface ActivityPanelProps {
  leaves: Leave[];
  onDeleteLeave: (leave: Leave) => void;
  onClose?: () => void;
}

const ActivityPanel = ({ leaves, onDeleteLeave, onClose }: ActivityPanelProps) => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const getAbbreviation = (type: string = '') => {
    if (!type) return '-';
    if (type.includes('Sick')) return 'SL';
    if (type.includes('Casual')) return 'CL';
    if (type.includes('LOP') || type.includes('Loss of Pay')) return 'LOP';
    return type.substring(0, 2).toUpperCase();
  };

  const getFullTypeDescription = (type: string = '') => {
    if (!type) return 'Leave Request';
    if (type.includes('Sick')) return 'Sick Leave Request';
    if (type.includes('Casual')) return 'Casual Leave Request';
    if (type.includes('LOP') || type.includes('Loss of Pay')) return 'Loss of Pay Case';
    if (type.includes('Earned')) return 'Earned Leave Request';
    if (type.includes('Loyalty')) return 'Loyalty Leave Request';
    return `${type} Request`;
  };

  const getTypeColor = (type: string = '') => {
    if (type.includes('Sick')) return '#ef4444';       // Red
    if (type.includes('Casual')) return '#3b82f6';     // Blue
    if (type.includes('LOP') || type.includes('Loss of Pay')) return '#f59e0b'; // Amber
    if (type.includes('Earned')) return '#ec4899';     // Pink
    if (type.includes('Loyalty')) return '#8b5cf6';    // Purple
    return '#14b8a6'; // Teal default
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <ShieldCheck size={14} color="#16a34a" />;
      case 'Rejected': return <XCircle size={14} color="#dc2626" />;
      default: return <AlertCircle size={14} color="#2563eb" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{
      width: '100%',
      background: '#000',
      borderLeft: '1px solid #111',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1.25rem',
    }}>
      <style jsx>{`
        .activity-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .activity-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .activity-scroll::-webkit-scrollbar-thumb {
          background: #1a1a1a;
          border-radius: 10px;
        }
        .activity-scroll::-webkit-scrollbar-thumb:hover {
          background: #27272a;
        }
        .activity-card:hover .delete-btn {
          opacity: 0.8 !important;
        }
        .activity-card:hover .delete-btn:hover {
          opacity: 1 !important;
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--text-muted)" />
          <h2 className="outfit" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Leave History
          </h2>
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            style={{
              background: '#111', border: '1px solid #222', color: 'var(--text-muted)',
              padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
          >
            <XCircle size={16} />
          </button>
        )}
      </div>

      <div className="activity-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingRight: '4px' }}>
        {leaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No recent activity to show
          </div>
        ) : (
          leaves.slice(0, 10).map((leave) => {
            const effectiveType = leave.leaveType || leave.type || 'Casual';
            const accentColor = getTypeColor(effectiveType);
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={leave._id}
                className="activity-card"
                style={{
                  background: `linear-gradient(180deg, ${accentColor}05 0%, #050505 100%)`,
                  border: '1px solid #111',
                  borderTop: `2px solid ${accentColor}80`,
                  borderRadius: '16px',
                  padding: '1.25rem',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  boxShadow: `0 4px 20px -10px ${accentColor}00`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${accentColor}40`;
                  e.currentTarget.style.borderTopColor = accentColor;
                  e.currentTarget.style.boxShadow = `0 10px 30px -15px ${accentColor}30`;
                  e.currentTarget.style.background = `linear-gradient(180deg, ${accentColor}0a 0%, #080808 100%)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#111';
                  e.currentTarget.style.borderTopColor = `${accentColor}80`;
                  e.currentTarget.style.boxShadow = `0 4px 20px -10px ${accentColor}00`;
                  e.currentTarget.style.background = `linear-gradient(180deg, ${accentColor}05 0%, #050505 100%)`;
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{getAbbreviation(effectiveType)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: leave.status === 'Approved' ? '#16a34a' : leave.status === 'Rejected' ? '#dc2626' : '#2563eb', textTransform: 'uppercase' }}>
                      {leave.status}
                    </span>
                    {getStatusIcon(leave.status)}
                  </div>
                </div>

                <div style={{ fontSize: '0.65rem', color: accentColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  {getFullTypeDescription(effectiveType)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px', fontWeight: '500' }}>
                  <Calendar size={12} />
                  <span>{formatDate(leave.startDate)}{leave.startDate !== leave.endDate ? ` - ${formatDate(leave.endDate)}` : ''}</span>
                </div>

                {leave.duration === 'Half Day' && (
                  <div style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} />
                    {leave.halfDayOption || 'First Half'}
                  </div>
                )}

                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  margin: 0,
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {leave.reason}
                </p>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLeave(leave);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    fontSize: '0.65rem',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontWeight: '700',
                    opacity: 0.6,
                    transition: 'opacity 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  className="delete-btn"
                >
                  Delete
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div style={{
        marginTop: 'auto',
        padding: '1.25rem',
        background: 'linear-gradient(145deg, #0a0a0a 0%, #050505 100%)',
        borderRadius: '20px',
        border: '1px solid #1a1a1a',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'linear-gradient(180deg, #3b82f6 0%, #ec4899 100%)' }}></div>
        <p style={{ fontSize: '0.75rem', color: '#f4f4f5', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pro Tip</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>
          Click on any date in the calendar to quickly request a leave.
        </p>
      </div>
    </div>
  );
};

export default ActivityPanel;
