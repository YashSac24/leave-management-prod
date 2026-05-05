import React from 'react';
import styles from './StatusCard.module.css';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  label: string;
  count: number | string;
  icon: LucideIcon;
  color: string;
}

const StatusCard = ({ label, count, icon: Icon, color }: StatusCardProps) => {
  return (
    <div className={`glass-panel ${styles.card}`}>
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <h3 className={styles.count}>{count}</h3>
      </div>
      <div className={styles.iconWrapper} style={{ backgroundColor: `${color}15`, color: color }}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default StatusCard;
