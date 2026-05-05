'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Lock, Loader2, Check, Bell, Key, RefreshCcw, Eye, EyeOff } from 'lucide-react';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Skeleton } from 'boneyard-js/react';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());



export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [saving, setSaving] = useState(false);
  const { data: profileData, mutate: mutateLocal } = useSWR('/api/user/profile', fetcher);
  const userData = profileData?.user;

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });


  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    timezone: 'asia',
    publicProfile: true,
    showLeaveBalance: false,
    notifyLeaveDecisions: true,
    notifyWeeklyDigest: true,
    notifyNewHolidays: false,
    browserNotifications: true,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        name: userData.name || '',
        timezone: userData.timezone || 'asia',
        publicProfile: userData.publicProfile ?? true,
        showLeaveBalance: userData.showLeaveBalance ?? false,
        notifyLeaveDecisions: userData.notifyLeaveDecisions ?? true,
        notifyWeeklyDigest: userData.notifyWeeklyDigest ?? true,
        notifyNewHolidays: userData.notifyNewHolidays ?? false,
        browserNotifications: userData.browserNotifications ?? true
      }));
    }
  }, [userData]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    
    // Request permission if enabling browser notifications
    if (name === 'browserNotifications' && checked) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
          Notification.requestPermission().then(permission => {
            if (permission !== 'granted') {
              showNotify('Permission denied for browser notifications', 'error');
            }
          });
        }
      }
    }

    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleToggle = (name: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const showNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') toast.success(msg, { theme: 'dark', position: 'bottom-right' });
    else toast.error(msg, { theme: 'dark', position: 'bottom-right' });
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      return showNotify('Name cannot be empty', 'error');
    }
    setSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, timezone: formData.timezone })
      });
      const data = await res.json();
      if (data.success) {
        showNotify('Profile updated successfully!');
        mutateLocal(); 
        mutate('/api/user/profile');
        mutate('/api/team');
      } else showNotify(data.error || 'Update failed', 'error');

    } catch (err) {
      showNotify('Server error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicProfile: formData.publicProfile,
          showLeaveBalance: formData.showLeaveBalance,
          notifyLeaveDecisions: formData.notifyLeaveDecisions,
          notifyWeeklyDigest: formData.notifyWeeklyDigest,
          notifyNewHolidays: formData.notifyNewHolidays,
          browserNotifications: formData.browserNotifications
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotify('Privacy settings updated!');
        mutateLocal();
        mutate('/api/user/profile');
        mutate('/api/team');
      } else showNotify(data.error || 'Update failed', 'error');
    } catch (err) {
      showNotify('Server error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!formData.currentPassword || !formData.newPassword) {
      return showNotify('Please fill in password fields', 'error');
    }
    if (formData.newPassword !== formData.confirmPassword) {
      return showNotify('New passwords do not match', 'error');
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/user/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotify('Password securely updated!');
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        showNotify(data.error || 'Password update failed', 'error');
      }
    } catch (err) {
      showNotify('Server error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'Profile', icon: User },
    { id: 'Security', icon: Shield },
    { id: 'Privacy', icon: Lock }
  ];

  return (
    <Skeleton name="settings" loading={!profileData}>
      <div style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column', background: '#000', padding: isMobile ? '1.25rem' : '1.5rem', overflowY: 'auto', boxSizing: 'border-box' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="outfit" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'white' }}>Settings</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Manage your personal space and security preferences</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: isMobile ? '1.5rem' : '3rem', maxWidth: '1200px' }}>
        
        {/* Navigation Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                  background: isActive ? '#111' : 'transparent',
                  border: isActive ? '1px solid #1a1a1a' : '1px solid transparent',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  borderRadius: '12px', fontSize: '0.9rem', fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                }}
              >
                <Icon size={18} color={isActive ? '#3b82f6' : 'var(--text-dim)'} />
                {tab.id}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ paddingBottom: '3rem' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* Profile Tab */}
              {activeTab === 'Profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid #111', paddingBottom: '2rem' }}>
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={userData?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.name || 'User'}&backgroundColor=00897b,00acc1,039be5,1e88e5,3949ab,5e35b1,8e24aa,d81b60,e53935,f4511e,fb8c00,ffb300,fdd835,c0ca33,7cb342,43a047`} 
                        alt="Avatar"
                        style={{ width: '80px', height: '80px', borderRadius: '24px', border: '1px solid #27272a', objectFit: 'cover' }} 
                      />
                    </div>
                    <div>
                      <button 
                        onClick={() => setIsAvatarPickerOpen(true)}
                        style={{ background: '#111', color: 'white', border: '1px solid #27272a', padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        Change Avatar
                      </button>
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '8px' }}>Using dynamic Open Source Initials API</p>
                    </div>
                  </div>

                  <AvatarPickerModal 
                    isOpen={isAvatarPickerOpen}
                    onClose={() => setIsAvatarPickerOpen(false)}
                    userName={userData?.name}
                    onSelect={async (url) => {
                      try {
                        const res = await fetch('/api/user/settings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ avatar: url })
                        });
                        const data = await res.json();
                        if (data.success) {
                          showNotify('Avatar updated successfully!');
                          mutateLocal();
                          mutate('/api/user/profile');
                          mutate('/api/team');
                        }
                      } catch (err) {
                        showNotify('Failed to update avatar', 'error');
                      }

                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                    <Field label="Full Name">
                      <input type="text" name="name" value={formData.name} onChange={handleChange} style={inp} />
                    </Field>
                    <Field label="Email Address">
                      <input type="email" value={userData?.email} disabled style={{...inp, opacity: 0.5, cursor: 'not-allowed'}} />
                    </Field>
                    <Field label="Role">
                      <input type="text" value={userData?.role} disabled style={{...inp, opacity: 0.5, cursor: 'not-allowed'}} />
                    </Field>
                    <Field label="Timezone">
                      <select name="timezone" value={formData.timezone} onChange={handleChange} style={inp}>
                        <option value="asia">Asia/Kolkata (IST)</option>
                        <option value="utc">UTC</option>
                        <option value="est">Eastern Time (EST)</option>
                      </select>
                    </Field>
                  </div>

                  <div style={{ borderTop: '1px solid #111', paddingTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <SaveButton saving={saving} onClick={handleSaveProfile} />
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'Security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  <div style={{ background: '#080808', border: '1px solid #111', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Key size={18} color="#ec4899" />
                      <h3 style={{ fontSize: '1rem', color: 'white', fontWeight: 700, margin: 0 }}>Change Password</h3>
                    </div>
                    <Field label="Current Password">
                      <div style={{ position: 'relative' }}>
                        <input type={showPassword.current ? "text" : "password"} name="currentPassword" value={formData.currentPassword} onChange={handleChange} placeholder="••••••••" style={inp} />
                        <button type="button" onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))} style={eyeBtn}>
                          {showPassword.current ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </div>
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                      <Field label="New Password">
                        <div style={{ position: 'relative' }}>
                          <input type={showPassword.new ? "text" : "password"} name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="••••••••" style={inp} />
                          <button type="button" onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))} style={eyeBtn}>
                            {showPassword.new ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                        </div>
                      </Field>
                      <Field label="Confirm Password">
                        <div style={{ position: 'relative' }}>
                          <input type={showPassword.confirm ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" style={inp} />
                          <button type="button" onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))} style={eyeBtn}>
                            {showPassword.confirm ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                        </div>
                      </Field>
                    </div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontStyle: 'italic', margin: '0 0 1rem' }}>
                      <span style={{ color: '#ef4444', marginRight: '4px' }}>*</span> If you don't know your current password, please contact your <strong style={{ color: '#3b82f6' }}>HR Department</strong> to manually reset it.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <SaveButton saving={saving} onClick={handleUpdatePassword} text="Update Password" />
                    </div>
                  </div>

                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'Privacy' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  

                  <div style={{ background: '#080808', border: '1px solid #111', borderRadius: '16px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                      <Bell size={18} color="#8b5cf6" />
                      <h3 style={{ fontSize: '1rem', color: 'white', fontWeight: 700, margin: 0 }}>Notification Preferences</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e4e4e7', fontSize: '0.85rem' }}>
                        <input type="checkbox" name="notifyLeaveDecisions" checked={formData.notifyLeaveDecisions} onChange={handleChange} style={chk} /> Email me when a leave is approved or rejected
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e4e4e7', fontSize: '0.85rem' }}>
                        <input type="checkbox" name="notifyWeeklyDigest" checked={formData.notifyWeeklyDigest} onChange={handleChange} style={chk} /> Send weekly digest of team absences
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e4e4e7', fontSize: '0.85rem' }}>
                        <input type="checkbox" name="notifyNewHolidays" checked={formData.notifyNewHolidays} onChange={handleChange} style={chk} /> Notify me of new company holidays
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e4e4e7', fontSize: '0.85rem' }}>
                        <input type="checkbox" name="browserNotifications" checked={formData.browserNotifications} onChange={handleChange} style={chk} /> Show browser notifications for chat messages
                      </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                      <SaveButton saving={saving} onClick={handleSavePrivacy} />
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
    </Skeleton>
  );
}

const Field = ({ label, children }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
    {children}
  </div>
);

const SaveButton = ({ saving, onClick, text = "Save Changes" }: any) => (
  <motion.button 
    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
    onClick={onClick} disabled={saving}
    style={{ background: 'white', color: 'black', border: 'none', padding: '10px 24px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: saving ? 0.7 : 1 }}
  >
    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
    {saving ? 'Saving...' : text}
  </motion.button>
);

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: '40px', height: '22px', borderRadius: '11px', 
        background: checked ? '#3b82f6' : '#1a1a1a', 
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%', background: 'white',
        position: 'absolute', top: '2px', left: checked ? '20px' : '2px',
        transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px',
  padding: '10px 14px', color: 'white', fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s'
};

const chk: React.CSSProperties = {
  width: '16px', height: '16px', accentColor: '#3b82f6'
};

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
  background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};
