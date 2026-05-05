'use client';

import React, { useState } from 'react';
import { Users, Calendar, Search, ChevronDown, SlidersHorizontal, ClipboardList, History, Clock } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function MasterAdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const modules = [
    {
      title: 'User Management',
      desc: 'Control employee permissions, roles, and manage active system accounts.',
      icon: Users,
      path: '/admin/users',
      iconBg: '#3b82f615',
      iconColor: '#3b82f6',
      borderColor: '#3b82f640'
    },
    {
      title: 'Holiday Management',
      desc: 'Define and supervise organizational holidays matching regional compliance.',
      icon: Calendar,
      path: '/admin/holidays',
      iconBg: '#10b98115',
      iconColor: '#10b981',
      borderColor: '#10b98140'
    },
    {
      title: 'Leave Management',
      desc: 'Review leave history matrices and monitor organization-wide timelines.',
      icon: ClipboardList,
      path: '/admin/leaves',
      iconBg: '#7c3aed15',
      iconColor: '#7c3aed',
      borderColor: '#7c3aed40'
    },
    {
      title: 'Manual Leave Entry',
      desc: 'Inject manual backdated leaves and handle arbitrary balance corrections.',
      icon: History,
      path: '/admin/manual-leave',
      iconBg: '#ec489915',
      iconColor: '#ec4899',
      borderColor: '#ec489940'
    },
    {
      title: 'System Automation',
      desc: 'Execute annual credit batches, grant loyalty leaves, and trigger maintenance tasks.',
      icon: SlidersHorizontal,
      path: '/admin/system',
      iconBg: '#f59e0b15',
      iconColor: '#f59e0b',
      borderColor: '#f59e0b40'
    },
    {
      title: 'Earned Leave Ledger',
      desc: 'Manually adjust earned leave balances, fractional working days, and track last log times.',
      icon: Clock,
      path: '/admin/earned-leave',
      iconBg: '#6366f115',
      iconColor: '#6366f1',
      borderColor: '#6366f140'
    }
  ];

  const filteredModules = modules.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: '#000', color: 'white' }}>
      {/* Top Header Section */}
      <div style={{ 
        padding: isMobile ? '1rem' : '1.5rem 2rem', 
        borderBottom: '1px solid #111', 
        background: '#000' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          <div style={{ 
            background: '#8b5cf6', 
            padding: '6px', 
            borderRadius: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <SlidersHorizontal size={18} color="white" strokeWidth={3} />
          </div>
          <h1 className="outfit" style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 700, letterSpacing: '-0.2px' }}>
            Management
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search 
              size={13} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
            />
            <input 
              type="text" 
              placeholder="Search management modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', 
                background: '#050505', 
                border: '1px solid #1a1a1a', 
                borderRadius: '10px', 
                padding: '10px 12px 10px 38px', 
                color: 'white', 
                fontSize: '0.8rem',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#333'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#1a1a1a'}
            />
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div style={{ padding: isMobile ? '1.5rem 1rem' : '2.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: isMobile ? '1.25rem' : '1.75rem',
          width: '100%'
        }}>
          <AnimatePresence>
            {filteredModules.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.04, ease: 'easeOut' }}
                  style={{ display: 'flex', height: '100%' }}
                >
                  <Link href={item.path} style={{ textDecoration: 'none', width: '100%', display: 'flex' }}>
                    <div style={{ 
                      background: 'linear-gradient(145deg, #0a0a0a 0%, #050505 100%)', 
                      border: '1px solid #1a1a1a', 
                      borderRadius: '16px', 
                      padding: '1.75rem', 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '1.25rem',
                      width: '100%',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = item.borderColor;
                      e.currentTarget.style.boxShadow = `0 10px 40px -10px ${item.iconBg.replace('15', '40')}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = '#1a1a1a';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    >
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        background: item.iconBg, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Icon size={22} color={item.iconColor} strokeWidth={2.5} />
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className="outfit" style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: 700, 
                          color: '#f4f4f5'
                        }}>
                          {item.title}
                        </span>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          color: 'var(--text-muted)', 
                          lineHeight: 1.5 
                        }}>
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
