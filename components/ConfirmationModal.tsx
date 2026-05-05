'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Loader2, LogOut, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmationModal({
  isOpen, title, message, onConfirm, onCancel,
  confirmText = 'Confirm', cancelText = 'Cancel',
  type = 'warning', loading = false, children
}: ConfirmationModalProps) {

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted || !isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'danger': return { color: '#ef4444', icon: <LogOut size={32} />, bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' };
      case 'success': return { color: '#10b981', icon: <CheckCircle2 size={32} />, bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' };
      case 'info': return { color: '#3b82f6', icon: <Info size={32} />, bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' };
      default: return { color: '#f59e0b', icon: <AlertTriangle size={32} />, bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' };
    }
  };

  const theme = getTheme();

  return createPortal(
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!loading ? onCancel : undefined}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            width: '100%', maxWidth: '380px', 
            background: 'rgba(10, 10, 10, 0.85)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '28px', position: 'relative', overflow: 'hidden', 
            boxShadow: '0 40px 80px -15px rgba(0,0,0,0.8)',
            display: 'flex', flexDirection: 'column'
          }}
        >
          <div style={{ padding: '2.5rem 2rem 2rem', textAlign: 'center' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '20px', 
              background: theme.bg, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 1.5rem', color: theme.color, 
              border: `1px solid ${theme.border}` 
            }}>
              {theme.icon}
            </div>
            
            <h3 className="outfit" style={{ margin: '0 0 12px', fontSize: '1.35rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{title}</h3>
            {message && <p style={{ margin: 0, fontSize: '0.95rem', color: '#888', lineHeight: 1.6 }}>{message}</p>}
            {children && <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>{children}</div>}
          </div>

          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '12px' }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{ 
                flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.1)', 
                background: 'transparent', color: '#eee', fontSize: '0.9rem', fontWeight: 600, 
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'transparent'; }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{ 
                flex: 1.5, padding: '14px', borderRadius: '14px', border: '1px solid', 
                borderColor: theme.color === '#ef4444' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.3)', 
                background: theme.color === '#ef4444' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.1)', 
                color: theme.color === '#ef4444' ? '#ef4444' : '#fff', 
                fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', 
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.background = theme.color === '#ef4444' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.background = theme.color === '#ef4444' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>

          {!loading && (
            <button
              onClick={onCancel}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#888'}
              onMouseLeave={e => e.currentTarget.style.color = '#555'}
            >
              <X size={20} />
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
