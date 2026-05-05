'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Loader2, AlertCircle, Eye, EyeOff, CheckCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ── Modern SaaS-style Glassmorphic Illustration ── */
const LeaveIllustration = () => (
  <svg viewBox="0 0 540 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', maxWidth: '480px', flexShrink: 1 }}>
    <defs>
      <linearGradient id="glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.08" />
        <stop offset="100%" stopColor="white" stopOpacity="0.02" />
      </linearGradient>
      <filter id="blur-effect">
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </defs>

    {/* ── Background connections ── */}
    <path d="M100 200 Q270 50 440 200" stroke="rgba(255,255,255,0.04)" strokeWidth="2" strokeDasharray="6 6" fill="none" />
    <path d="M100 200 Q270 350 440 200" stroke="rgba(255,255,255,0.04)" strokeWidth="2" strokeDasharray="6 6" fill="none" />

    {/* ── Main Dashboard Card (Glassmorphic) ── */}
    <g transform="translate(130, 80)">
      {/* Shadow */}
      <rect x="0" y="10" width="280" height="240" rx="24" fill="black" fillOpacity="0.2" filter="url(#blur-effect)" />
      {/* Card body */}
      <rect x="0" y="0" width="280" height="240" rx="24" fill="url(#glass-grad)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />

      {/* Header */}
      <rect x="20" y="20" width="120" height="12" rx="6" fill="rgba(255,255,255,0.1)" />
      <rect x="230" y="20" width="30" height="12" rx="6" fill="rgba(255,255,255,0.05)" />

      {/* Calendar Grid peek */}
      <g transform="translate(20, 50)">
        <text x="0" y="10" fill="white" fontSize="14" fontWeight="800" fontFamily="Inter, sans-serif">MAY 2026</text>
        <g transform="translate(0, 25)">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <text key={i} x={i * 34 + 11} y="10" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontWeight="700">{d}</text>
          ))}
          {/* Calendar dots */}
          {[0, 1, 2, 3].map(r => (
            [0, 1, 2, 3, 4, 5, 6].map(c => {
              const isActive = (r === 1 && c > 2) || (r === 2 && c < 2);
              return (
                <rect key={`${r}-${c}`} x={c * 34} y={r * 24 + 20} width="22" height="16" rx="4"
                  fill={isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)'}
                  stroke={isActive ? 'rgba(255,255,255,0.15)' : 'none'} />
              );
            })
          ))}
        </g>
      </g>

      {/* Footer action */}
      <rect x="20" y="205" width="240" height="16" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
      <circle cx="36" cy="213" r="3" fill="rgba(255,255,255,0.4)" />
      <rect x="46" y="210" width="60" height="6" rx="3" fill="rgba(255,255,255,0.1)" />
    </g>

    {/* ── Floating Status Pills ── */}

    {/* Success Pill */}
    <g transform="translate(360, 110)">
      <rect x="0" y="0" width="130" height="48" rx="16" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx="24" cy="24" r="10" fill="rgba(255,255,255,0.1)" />
      <path d="M20 24 L23 27 L28 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="44" y="16" width="60" height="7" rx="3.5" fill="rgba(255,255,255,0.8)" />
      <rect x="44" y="27" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.3)" />
    </g>

    {/* User Pill */}
    <g transform="translate(50, 150)">
      <rect x="0" y="0" width="110" height="40" rx="20" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx="20" cy="20" r="12" fill="rgba(255,255,255,0.08)" />
      <circle cx="20" cy="18" r="4" fill="rgba(255,255,255,0.4)" />
      <path d="M14 26 Q20 22 26 26" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
      <rect x="40" y="14" width="50" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
      <rect x="40" y="24" width="30" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
    </g>

    {/* Leave Balance Card */}
    <g transform="translate(370, 240)">
      <rect x="0" y="0" width="120" height="90" rx="20" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      <text x="60" y="45" textAnchor="middle" fill="white" fontSize="28" fontWeight="900" fontFamily="Inter, sans-serif">12</text>
      <text x="60" y="65" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="700" letterSpacing="1px" fontFamily="Inter, sans-serif">DAYS LEFT</text>
      {/* Progress ring background */}
      <circle cx="60" cy="45" r="32" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" />
      <path d="M60 13 A 32 32 0 0 1 88 30" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>

    {/* Decorative nodes */}
    <circle cx="80" cy="80" r="4" fill="rgba(255,255,255,0.1)" />
    <circle cx="480" cy="340" r="4" fill="rgba(255,255,255,0.1)" />
    <circle cx="500" cy="100" r="6" stroke="rgba(255,255,255,0.1)" fill="none" />
  </svg>
);

/* ── Badge Illustration for Right Panel ── */
const LoginBadge = () => (
  <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* Rotating glow ring */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '50%' }}
    />
    {/* Inner Shield */}
    <div style={{
      width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)', position: 'relative', zIndex: 1
    }}>
      <img src="/logo.png" alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '16px' }} />
    </div>
  </div>
);

const LoginPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Identity verified. Redirecting...');
        setTimeout(() => router.push('/'), 300);
      } else {
        setError(data.error || 'Identity verification failed');
      }
    } catch {
      setError('Connection timeout. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', width: '100%',
      background: '#050505', color: 'white', overflow: 'hidden',
      position: 'relative', fontFamily: "'Inter', sans-serif",
    }}>

      {/* Modern Background Texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)
        `,
        backgroundSize: '32px 32px',
      }} />

      {/* Floating Ambient Glows */}
      <div style={{
        position: 'absolute', top: '20%', left: '10%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* ======== LEFT PANEL ======== */}
      <div className="login-left" style={{
        flex: '0 0 50%', display: 'none', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 48px', position: 'relative', zIndex: 1,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        overflowY: 'auto'
      }}>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          style={{ width: '90%', maxWidth: '560px', marginBottom: '40px', flexShrink: 0 }}>
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '8px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '8px' }}>
            LEAVE MANAGEMENT SYSTEM
          </p>
          <h1 style={{ fontSize: 'clamp(48px, 6vw, 84px)', fontWeight: 900, letterSpacing: '-4px', lineHeight: 0.8, margin: '0 0 32px', color: 'white' }}>
            WELCOME<br />
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>BACK.</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, lineHeight: 1.5, maxWidth: '440px' }}>
            Manage time off, track leave balances,<br />and stay connected with your team.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: '600px' }}>
          <LeaveIllustration />
        </motion.div>
      </div>

      {/* ======== RIGHT PANEL ======== */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px 120px 32px', position: 'relative', zIndex: 2,
          overflowY: 'auto'
        }}>
        <div style={{ width: '90%', maxWidth: '380px', flexShrink: 0 }}>

          <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LoginBadge />
            <h2 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', margin: '20px 0 8px', color: 'white', textAlign: 'center' }}>
              Sign in
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 400, margin: 0, textAlign: 'center' }}>
              Access your workspace and dashboard
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div key="err" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: '#fca5a5', padding: '12px 16px', borderRadius: '14px', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}
              ><AlertCircle size={16} />{error}</motion.div>
            )}
            {success && (
              <motion.div key="ok" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '12px 16px', borderRadius: '14px', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}
              ><CheckCircle size={16} />{success}</motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                <input type="email" placeholder="name@company.com" required value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px 16px 14px 48px', fontSize: '15px', color: 'white', outline: 'none', transition: 'all 0.2s ease' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••••••" required value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px 48px 14px 48px', fontSize: '15px', color: 'white', outline: 'none', transition: 'all 0.2s ease' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}>
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} type="submit" disabled={loading}
              style={{
                width: '100%', height: '54px', marginTop: '10px',
                background: 'white', borderRadius: '14px', border: 'none',
                color: '#000', fontWeight: 800, fontSize: '15px',
                letterSpacing: '0.5px', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                opacity: loading ? 0.6 : 1, transition: 'all 0.2s ease',
                boxShadow: '0 10px 40px rgba(255,255,255,0.1)',
              }}>
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign in'}
            </motion.button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '40px 0 16px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '2px' }}>PORTAL SUPPORT</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: '300px', margin: '0 auto' }}>
            For assistance, contact HR Department.
          </p>
        </div>
      </motion.div>

      <style>{`
        @media (min-width: 1024px) { .login-left { display: flex !important; } }
        input:focus { border-color: rgba(255,255,255,0.3) !important; background: rgba(255,255,255,0.06) !important; }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default LoginPage;
