'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import NotificationManager from './NotificationManager';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isLoginPage = pathname === '/login';

  // Handle Responsive Check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
    
    // Proactive Session Guard: Check if token is still valid on navigation
    // Bypass redirect for boneyard-js crawler to allow skeleton generation
    const isBoneyard = typeof navigator !== 'undefined' && navigator.userAgent?.includes('Boneyard-Crawl');

    if (!isLoginPage && !isBoneyard) {
      fetch('/api/auth/me')
        .then(res => {
          if (!res.ok) {
            window.location.href = '/login';
          }
        })
        .catch(() => {
          // If network error, might be offline, but 401 is our main focus
        });
    }
  }, [pathname, isLoginPage]);

  if (isLoginPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="main-container">
      <Suspense fallback={null}>
        <NotificationManager />
      </Suspense>
      {/* Mobile Header Bar */}
      <div className="mobile-only" style={{ 
        height: '60px', width: '100%', background: '#050505', borderBottom: '1px solid #1a1a1a', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        padding: '0 1.25rem', position: 'sticky', top: 0, zIndex: 60 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
          <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.3px' }}>Leave Portal</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ background: '#111', border: '1px solid #222', color: 'white', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
        >
          {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Sidebar Wrapper */}
      <AnimatePresence mode="wait">
        {(!isMobile || isSidebarOpen) && (
          <motion.div
            key="sidebar"
            initial={isMobile ? { x: -240 } : undefined}
            animate={{ x: 0 }}
            exit={isMobile ? { x: -240 } : undefined}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ 
              zIndex: 100,
              position: isMobile ? 'fixed' : 'relative',
              top: 0, left: 0, height: '100%',
              backgroundColor: '#000'
            }}
          >
            <Suspense fallback={null}>
              <Sidebar />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div 
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 90 }}
          />
        )}
      </AnimatePresence>

      <main className="content-area" style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto' }}>
        {children}
      </main>
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}
