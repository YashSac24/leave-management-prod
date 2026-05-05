'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Settings, LogOut, Users, Shield, MessageSquare } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import styles from './Sidebar.module.css';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());


const Sidebar = () => {
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [logoutLoading, setLogoutLoading] = React.useState(false);

  const { data: profileData } = useSWR('/api/user/profile', fetcher);
  const { data: unreadData } = useSWR('/api/chat/unread', fetcher, { refreshInterval: 15000 });
  const user = profileData?.user;

  // Total unread across all conversations
  const totalUnread = unreadData?.unreadMap
    ? Object.values(unreadData.unreadMap as Record<string, number>).reduce((a, b) => a + b, 0)
    : 0;

  // Browser tab title notification when on different tab
  useEffect(() => {
    const isOnChat = pathname === '/chat';
    if (totalUnread > 0 && !isOnChat) {
      document.title = `(${totalUnread}) New Message${totalUnread > 1 ? 's' : ''} — Leave Portal`;
    } else {
      document.title = 'Leave Portal';
    }
  }, [totalUnread, pathname]);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Chat', icon: MessageSquare, path: '/chat' },
    { name: 'Employees', icon: Users, path: '/employees' },
    { name: 'Calendar', icon: Calendar, path: '/calendar' },
  ];

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed');
      setLogoutLoading(false);
    }
  };

  const isAdmin = ['Administrator', 'HR', 'Admin'].includes(user?.role || '');

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topSection}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div className={styles.logo} style={{ cursor: 'pointer' }}>
            <img src="/logo.png" alt="Logo" className={styles.logoImage} />
            <span>Leave Portal</span>
          </div>
        </Link>

        <div className={styles.sectionLabel}>GENERAL</div>
        <nav className={styles.nav}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            const isChat = item.name === 'Chat';
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                style={{ position: 'relative' }}
              >
                <Icon size={18} />
                <span>{item.name}</span>
                {isChat && totalUnread > 0 && (
                  <span style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '999px',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    minWidth: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    lineHeight: 1
                  }}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {isAdmin && (
          <>
            <div className={styles.sectionLabel} style={{ marginTop: '2rem' }}>MANAGEMENT</div>
            <nav className={styles.nav}>
              <Link
                href="/admin"
                className={`${styles.navItem} ${pathname.startsWith('/admin') ? styles.active : ''}`}
              >
                <Shield size={18} />
                <span>Master Admin</span>
              </Link>
            </nav>
          </>
        )}
      </div>

      <div className={styles.footer}>
        <Link href="/settings" className={styles.profileLink} style={{ textDecoration: 'none', display: 'block', marginBottom: '1rem' }}>
          <div className={styles.profile}>
            <div className={styles.avatar}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                (user?.name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{user?.name || 'Loading...'}</div>
              <div className={styles.profileRole} style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.role || 'Loading...'}</div>
            </div>
          </div>
        </Link>

        <Link
          href="/settings"
          className={`${styles.navItem} ${pathname.startsWith('/settings') ? styles.active : ''}`}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          <Settings size={18} />
          <span>Settings</span>
        </Link>
        <button
          onClick={handleLogout}
          className={styles.navItem}
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 'auto', color: '#ef4444' }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>

      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to log in again to access the portal."
        confirmText="Sign Out"
        type="danger"
        loading={logoutLoading}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </aside>
  );
};

export default Sidebar;
