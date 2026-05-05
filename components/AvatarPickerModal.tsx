'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, Check, Sparkles, User, Image as ImageIcon, Smile, Ghost, Box, Circle, Hexagon } from 'lucide-react';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  userName: string;
}

const STYLES = [
  { id: 'initials', label: 'Initials', icon: User },
  { id: 'shapes', label: 'Abstract', icon: Box },
  { id: 'identicon', label: 'Geometry', icon: Hexagon },
  { id: 'rings', label: 'Rings', icon: Circle },
  { id: 'adventurer', label: 'Characters', icon: Sparkles },
  { id: 'pixel-art', label: 'Pixel Art', icon: Ghost },
  { id: 'fun-emoji', label: 'Emoticons', icon: Smile },
  { id: 'notionists', label: 'Illustrations', icon: ImageIcon },
];

export default function AvatarPickerModal({ isOpen, onClose, onSelect, userName }: AvatarPickerModalProps) {
  const [activeStyle, setActiveStyle] = useState('initials');
  const [seed, setSeed] = useState(userName || 'seed');
  const [submitting, setSubmitting] = useState(false);

  const getUrl = (style: string, currentSeed: string) => {
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(currentSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  };

  const handleRefresh = () => {
    setSeed(Math.random().toString(36).substring(7));
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    await onSelect(getUrl(activeStyle, seed));
    setSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            style={{
              width: '100%', maxWidth: '480px', background: '#09090b', border: '1px solid #1a1a1a', 
              borderRadius: '24px', position: 'relative', overflow: 'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.8)'
            }}
          >
            {/* Header */}
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Change Profile Picture</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Select an open-source illustration</p>
              </div>
              <button onClick={onClose} style={{ background: '#111', border: '1px solid #1a1a1a', color: 'var(--text-muted)', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
              {/* Preview Area */}
              <div style={{ position: 'relative' }}>
                <div style={{ width: '140px', height: '140px', borderRadius: '40px', background: '#111', border: '2px solid #3b82f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={getUrl(activeStyle, seed)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <button 
                  onClick={handleRefresh}
                  style={{ position: 'absolute', bottom: '-10px', right: '-10px', background: 'white', color: 'black', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}
                >
                  <RefreshCcw size={18} strokeWidth={3} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '8px', background: '#050505', border: '1px solid #111', borderRadius: '16px' }}>
                {STYLES.map(style => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.id}
                      onClick={() => { setActiveStyle(style.id); setSeed(userName); }}
                      style={{
                        padding: '10px', border: 'none', background: activeStyle === style.id ? '#111' : 'transparent',
                        color: activeStyle === style.id ? '#3b82f6' : '#3f3f46', borderRadius: '12px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                      }}
                    >
                      <Icon size={16} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>{style.label.substring(0, 5)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1.25rem', borderTop: '1px solid #111', display: 'flex', gap: '12px' }}>
              <button 
                onClick={onClose} 
                style={{ flex: 1, background: 'transparent', color: '#71717a', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                disabled={submitting}
                style={{ flex: 1, background: 'white', color: 'black', border: 'none', padding: '12px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {submitting ? 'Saving...' : 'Set as Profile'}
                {!submitting && <Check size={16} strokeWidth={3} />}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
