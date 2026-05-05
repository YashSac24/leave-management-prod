'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, Cpu, Settings, ShieldAlert, Zap, 
  CheckCircle2, AlertCircle, Loader2, RefreshCw,
  Search, XCircle, Plus, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import ConfirmationModal from '@/components/ConfirmationModal';
import { Skeleton } from 'boneyard-js/react';

export default function SystemToolsPage() {
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isResetAllConfirmOpen, setIsResetAllConfirmOpen] = useState(false);
  const [isSingleResetConfirmOpen, setIsSingleResetConfirmOpen] = useState(false);
  const [isManualAddConfirmOpen, setIsManualAddConfirmOpen] = useState(false);
  const [manualLeaveAmount, setManualLeaveAmount] = useState<number>(2);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users.filter((u: any) => u.status !== 'Inactive'));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const triggerLoyaltyCredit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setIsConfirmOpen(false);

    try {
      const res = await fetch('/api/admin/system/annual-loyalty-credit', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setResult(data);
        fetchUsers(); // Refresh the list to show new balances
      } else {
        setError(data.error || 'Automation failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const resetAllLoyalty = async () => {
    setLoading(true);
    setIsResetAllConfirmOpen(false);
    try {
      // We can use a bulk update API or iterate. 
      // For efficiency, let's assume we can pass a special flag to the user API or similar.
      // But since we don't have a bulk API specifically for this, we can add a new one or use a loop.
      // Better: Add a new API route for bulk reset.
      const res = await fetch('/api/admin/system/reset-all-loyalty', { method: 'POST' });
      if (res.ok) {
        fetchUsers();
        setResult({ success: true, message: 'All loyalty balances have been reset.' });
      }
    } catch (err) {
      console.error('Bulk reset failed');
    } finally {
      setLoading(false);
    }
  };

  const resetUserLoyalty = async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, loyaltyLeaveBalance: 0, lastLoyaltyGrantYear: 0 })
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Failed to reset loyalty');
    } finally {
      setIsSingleResetConfirmOpen(false);
      setTargetUserId(null);
      setLoading(false);
    }
  };

  const manualAddLoyalty = async () => {
    if (!targetUserId) return;
    
    const user = users.find(u => u._id === targetUserId);
    if (!user) return;

    setLoading(true);
    
    try {
      const newBalance = Math.min(manualLeaveAmount, 10);
      const res = await fetch(`/api/admin/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: targetUserId, 
          loyaltyLeaveBalance: newBalance, 
          lastLoyaltyGrantYear: new Date().getFullYear() 
        })
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Failed to manually add loyalty');
    } finally {
      setIsManualAddConfirmOpen(false);
      setTargetUserId(null);
      setManualLeaveAmount(2);
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <Skeleton name="admin-system" loading={usersLoading}>
      <div style={{ height: '100vh', overflowY: 'auto', background: '#000', color: 'white', padding: isMobile ? '1.25rem' : '1.5rem', boxSizing: 'border-box' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/admin">
            <motion.div whileHover={{ x: -3 }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
              <ArrowLeft size={12} /> Admin
            </motion.div>
          </Link>
          <span style={{ color: '#27272a', fontSize: '0.7rem' }}>/</span>
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: '8px' }}>
            <div style={{ background: '#f59e0b', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Cpu size={14} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>System Automation</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>Project-wide maintenance and automated triggers</p>
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        

        {/* Loyalty Credit Card */}
        <div style={{ background: '#050505', border: '1px solid #111', borderRadius: '24px', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#8b5cf6' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <Zap size={16} color="#8b5cf6" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Annual Loyalty Credit</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Automatically calculate and grant loyalty leaves. Employees receive <b>2 days every year</b> starting from their 2nd year (Year 2 = 2d, Year 3 = 4d total, etc.), with a maximum balance cap of <b>10 days</b>.
              </p>
            </div>
            
            <button 
              onClick={() => setIsConfirmOpen(true)}
              disabled={loading}
              style={{ 
                background: loading ? '#222' : 'white', 
                color: 'black', 
                border: 'none', 
                padding: '10px 16px', 
                borderRadius: '12px', 
                fontWeight: 800, 
                fontSize: '0.85rem', 
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {loading ? 'Processing...' : 'Run Credit Batch'}
            </button>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: '1.5rem', padding: '1rem', background: '#10b98110', border: '1px solid #10b98125', borderRadius: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '0.5rem' }}>
                  <CheckCircle2 size={16} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{result.message}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Processed **{result.updatedCount}** employees for the current year.
                </p>
                {result.details?.length > 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {result.details.map((d: any) => (
                      <span key={d.name} style={{ fontSize: '0.65rem', background: '#111', padding: '4px 8px', borderRadius: '4px', color: '#a1a1aa', border: '1px solid #222' }}>
                        {d.name}: <span style={{ color: d.amount === 2 ? '#8b5cf6' : '#a1a1aa', fontWeight: 800 }}>+{d.amount}d</span> → {d.newBalance}d
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: '1.5rem', padding: '1rem', background: '#ef444410', border: '1px solid #ef444425', borderRadius: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                  <ShieldAlert size={16} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Warning Section */}
        <div style={{ display: 'flex', gap: '12px', padding: '1.25rem', background: '#111', borderRadius: '16px', border: '1px solid #222' }}>
          <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', margin: '0 0 4px', textTransform: 'uppercase' }}>Attention</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              These tools perform bulk database operations. It is recommended to perform these actions only on Jan 1st of each year to maintain consistent leave balances.
            </p>
          </div>
        </div>

        {/* Loyalty Audit Table */}
        <div style={{ background: '#050505', border: '1px solid #111', borderRadius: '24px', overflow: 'hidden', maxHeight: isMobile ? 'auto' : 'calc(100vh - 200px)', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3f3f46' }} />
                <input 
                  type="text" 
                  placeholder="Search employee..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ background: '#080808', border: '1px solid #111', color: 'white', padding: '8px 12px 8px 34px', borderRadius: '10px', fontSize: '0.75rem', outline: 'none', width: isMobile ? '100%' : '240px' }}
                />
              </div>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Loyalty Audit Table</h3>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
                  Audit and adjust loyalty leave balances
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsResetAllConfirmOpen(true)}
              disabled={loading}
              style={{ background: '#7f1d1d20', border: '1px solid #7f1d1d40', color: '#f87171', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <XCircle size={14} /> Reset All
            </button>
          </div>

          <div style={{ overflowX: 'auto', flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#080808' }}>
                  <th style={{...th, width: '40px'}}>#</th>
                  <th style={th}>Employee</th>
                  <th style={th}>Joining Date</th>
                  <th style={th}>Tenure</th>
                  <th style={th}>Loyalty Bal</th>
                  <th style={th}>Total Earned LL</th>
                  <th style={th}>Taken LL</th>
                  <th style={th}>Last Credit</th>
                  <th style={{...th, textAlign: 'right'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && !usersLoading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No records found.</td></tr>
                ) : filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((u, index) => {
                  const joinedDate = new Date(u.joinedAt);
                  const currentYear = new Date().getFullYear();
                  const yearsDiff = currentYear - joinedDate.getFullYear();
                  const isEligible = (yearsDiff >= 2) && (u.lastLoyaltyGrantYear !== currentYear);
                  
                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid #0f0f0f', transition: 'background 0.2s' }}>
                      <td style={{...td, width: '40px', fontSize: '0.72rem', color: '#71717a', fontWeight: 600}}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#ec4899', overflow: 'hidden' }}>
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{u.role}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{...td, fontSize: '0.75rem', color: '#a1a1aa' }}>
                        {joinedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{...td, fontSize: '0.75rem', color: '#a1a1aa' }}>
                        {yearsDiff} yrs
                      </td>
                      <td style={{...td, fontWeight: 700, color: u.loyaltyLeaveBalance > 0 ? '#8b5cf6' : 'var(--text-muted)' }}>
                        {u.loyaltyLeaveBalance}d
                      </td>
                      <td style={{...td, fontSize: '0.75rem', color: '#a1a1aa' }}>
                        {Math.min(10, Math.max(0, (yearsDiff - 1) * 2))}d
                      </td>
                      <td style={{...td, fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                        {Math.max(0, Math.min(10, Math.max(0, (yearsDiff - 1) * 2)) - (u.loyaltyLeaveBalance || 0))}d
                      </td>
                      <td style={{...td, fontSize: '0.75rem', color: u.lastLoyaltyGrantYear === currentYear ? '#10b981' : 'var(--text-muted)' }}>
                        {u.lastLoyaltyGrantYear || 'N/A'}
                      </td>
                      <td style={{...td, textAlign: 'right'}}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                          {isEligible ? (
                            <span style={{ fontSize: '0.62rem', background: '#8b5cf615', color: '#8b5cf6', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #8b5cf630' }}>
                              ELIGIBLE
                            </span>
                          ) : u.lastLoyaltyGrantYear === currentYear ? (
                            <span style={{ fontSize: '0.62rem', background: '#10b98115', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, border: '1px solid #10b98130' }}>
                              CREDITED
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.62rem', background: '#111', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                              WAITING
                            </span>
                          )}
                          <button 
                            onClick={() => {
                              setTargetUserId(u._id);
                              setManualLeaveAmount(u.loyaltyLeaveBalance > 0 ? u.loyaltyLeaveBalance : 2);
                              setIsManualAddConfirmOpen(true);
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                            title="Manually Add Loyalty Leave"
                          >
                            <Plus size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              setTargetUserId(u._id);
                              setIsSingleResetConfirmOpen(true);
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#3f3f46', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                            title="Reset Loyalty Data"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {Math.ceil(filteredUsers.length / itemsPerPage) > 1 && (
            <div style={{ padding: '0.8rem 1.5rem', borderTop: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#050505' }}>
              <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 500 }}>
                {filteredUsers.length > 0 ? `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredUsers.length)} of ${filteredUsers.length} users` : '0 users'}
              </span>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ ...pgBtn, opacity: currentPage === 1 ? 0.3 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronRight size={12} style={{ transform: 'rotate(180deg)' }} /> Prev
                </button>
                {Array.from({ length: Math.ceil(filteredUsers.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                  <button 
                    key={p} 
                    onClick={() => setCurrentPage(p)}
                    style={{ 
                      background: p === currentPage ? '#8b5cf6' : '#111', 
                      border: p === currentPage ? '1px solid #8b5cf6' : '1px solid #222', 
                      color: p === currentPage ? 'white' : '#a1a1aa', 
                      padding: '6px 12px', 
                      borderRadius: '8px', 
                      fontSize: '0.7rem', 
                      fontWeight: p === currentPage ? 800 : 700, 
                      cursor: 'pointer',
                      minWidth: '35px'
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredUsers.length / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(filteredUsers.length / itemsPerPage)}
                  style={{ background: '#111', border: '1px solid #222', color: currentPage >= Math.ceil(filteredUsers.length / itemsPerPage) ? '#333' : '#a1a1aa', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: currentPage >= Math.ceil(filteredUsers.length / itemsPerPage) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        title="Trigger Batch Credit"
        message="Are you sure you want to trigger the annual Loyalty Leave credit? This will grant 2 days of leave to all eligible employees (Year 2+), subject to the 10-day total balance cap. This action cannot be undone."
        confirmText="Run Batch Now"
        cancelText="Cancel"
        type="danger"
        loading={loading}
        onConfirm={triggerLoyaltyCredit}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <ConfirmationModal 
        isOpen={isResetAllConfirmOpen}
        title="Reset All Loyalty Data"
        message="CRITICAL ACTION: This will reset the loyalty balance to 0 for EVERY active employee in the database. This cannot be undone. Proceed?"
        confirmText="Yes, Reset All"
        cancelText="Cancel"
        type="danger"
        loading={loading}
        onConfirm={resetAllLoyalty}
        onCancel={() => setIsResetAllConfirmOpen(false)}
      />

      <ConfirmationModal 
        isOpen={isSingleResetConfirmOpen}
        title="Reset Employee Loyalty"
        message="Are you sure you want to reset this user's loyalty balance to 0 and clear their grant history?"
        confirmText="Reset Now"
        cancelText="Cancel"
        type="warning"
        loading={loading}
        onConfirm={resetUserLoyalty}
        onCancel={() => {
          setIsSingleResetConfirmOpen(false);
          setTargetUserId(null);
        }}
      />

      <ConfirmationModal 
        isOpen={isManualAddConfirmOpen}
        title="Set Loyalty Leave Balance"
        message="Enter the total number of loyalty days this user should have. This will overwrite their current balance. The maximum balance cap is 10 days."
        confirmText="Add Leave"
        cancelText="Cancel"
        type="info"
        loading={loading}
        onConfirm={manualAddLoyalty}
        onCancel={() => {
          setIsManualAddConfirmOpen(false);
          setTargetUserId(null);
          setManualLeaveAmount(2);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 600 }}>Leave Days Amount</label>
          <input 
            type="number" 
            min="0"
            max="10"
            value={manualLeaveAmount}
            onChange={(e) => setManualLeaveAmount(Number(e.target.value))}
            style={{ 
              background: '#080808', 
              border: '1px solid #222', 
              color: 'white', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              fontSize: '1rem', 
              outline: 'none', 
              width: '100%',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#10b981'}
            onBlur={(e) => e.target.style.borderColor = '#222'}
          />
        </div>
      </ConfirmationModal>
    </div>
    </Skeleton>
  );
}

const th: React.CSSProperties = {
  padding: '1rem 1.5rem',
  fontSize: '0.62rem',
  color: 'var(--text-muted)',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  textAlign: 'left',
  borderBottom: '1px solid #111'
};

const td: React.CSSProperties = {
  padding: '1rem 1.5rem',
  verticalAlign: 'middle'
};

const pgBtn: React.CSSProperties = {
  background: '#111',
  border: '1px solid #1a1a1a',
  color: '#a1a1aa',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '0.65rem',
  fontWeight: 700,
  transition: 'all',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
};
