'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  width?: string;
}

export default function DropdownMenu({ trigger, children, align = 'right', width = '160px' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuWidth = parseInt(width);
      
      const menuHeight = 180; // Estimated max height
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldUp = spaceBelow < menuHeight && rect.top > menuHeight;
      
      setOpenUpwards(shouldUp);
      setCoords({
        top: shouldUp ? rect.top : rect.bottom,
        left: align === 'right' ? rect.right - menuWidth : rect.left
      });
    }
  }, [isOpen, align, width]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Also check if the click was within the portal menu
        const menuEl = document.getElementById('portal-dropdown-menu');
        if (menuEl && menuEl.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Close on window scroll/resize to prevent floating menu issues
      const handleClose = () => setIsOpen(false);
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('resize', handleClose);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleClose, true);
        window.removeEventListener('resize', handleClose);
      };
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>

      {mounted && isOpen && createPortal(
        <AnimatePresence mode="wait">
          <motion.div
            id="portal-dropdown-menu"
            initial={{ opacity: 0, scale: 0.95, y: openUpwards ? 5 : -5 }}
            animate={{ opacity: 1, scale: 1, y: openUpwards ? -10 : 10 }}
            exit={{ opacity: 0, scale: 0.95, y: openUpwards ? 5 : -5 }}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: width,
              background: '#0c0c0e',
              border: '1px solid #1a1a1a',
              borderRadius: '12px',
              padding: '6px',
              zIndex: 9999,
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              textAlign: 'left',
              pointerEvents: 'auto'
            }}
          >
            <div onClick={() => setIsOpen(false)}>
              {children}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
