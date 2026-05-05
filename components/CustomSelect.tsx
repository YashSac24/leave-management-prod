'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
  icon?: any;
  color?: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const CustomSelect = ({ options, value, onChange, label, placeholder = 'Select option' }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
      {label && (
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </label>
      )}
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', background: '#050505', border: '1px solid #1a1a1a', borderRadius: '12px',
          padding: '11px 14px', color: value ? 'white' : 'var(--text-muted)', fontSize: '0.85rem', 
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          transition: 'border-color 0.2s', borderColor: isOpen ? '#3b82f660' : '#1a1a1a'
        }}
        onMouseEnter={e => !isOpen && (e.currentTarget.style.borderColor = '#333')}
        onMouseLeave={e => !isOpen && (e.currentTarget.style.borderColor = '#1a1a1a')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedOption?.icon && <selectedOption.icon size={14} color={selectedOption.color || '#3b82f6'} />}
          <span style={{ fontWeight: 600 }}>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={14} color="#3f3f46" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
              background: '#09090b', border: '1px solid #1a1a1a', borderRadius: '14px',
              padding: '6px', marginTop: '4px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
          >
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '10px 12px', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: value === option.value ? '#3b82f615' : 'transparent',
                  color: value === option.value ? '#3b82f6' : '#a1a1aa',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  if (value !== option.value) {
                    e.currentTarget.style.background = '#111';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={e => {
                  if (value !== option.value) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#a1a1aa';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {option.icon && <option.icon size={14} color={value === option.value ? '#3b82f6' : option.color || 'var(--text-muted)'} />}
                  <span style={{ fontWeight: 600 }}>{option.label}</span>
                </div>
                {value === option.value && <Check size={14} color="#3b82f6" strokeWidth={3} />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
