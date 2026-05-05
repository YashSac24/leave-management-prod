'use client';

import React, { useState, useEffect } from 'react';

interface SystemClockProps {
  timezone?: string;
}

const SystemClock = ({ timezone = 'asia' }: SystemClockProps) => {
  const [time, setTime] = useState(new Date());

  const tzMap: Record<string, string> = {
    'asia': 'Asia/Kolkata',
    'utc': 'UTC',
    'est': 'America/New_York'
  };

  const ianaTZ = tzMap[(timezone || 'asia').toLowerCase()] || 'Asia/Kolkata';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', {
    timeZone: ianaTZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const tzLabel = timezone === 'asia' ? 'IST' : timezone.toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <p style={{ 
        fontSize: '0.6rem', 
        color: '#a1a1aa', 
        fontWeight: 800, 
        textTransform: 'uppercase', 
        letterSpacing: '1px',
        marginBottom: '2px'
      }}>
        System Time ({tzLabel})
      </p>
      <div style={{ 
        fontSize: '1.25rem', 
        fontWeight: 900, 
        color: 'white',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.5px',
        background: 'linear-gradient(90deg, #fff 0%, #a1a1aa 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        {timeStr}
      </div>
    </div>
  );
};

export default SystemClock;
