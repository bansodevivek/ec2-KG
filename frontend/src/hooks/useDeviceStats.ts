// Custom Hook for Device Statistics

import { useState, useEffect } from 'react';
import { DeviceStats } from '../types';
import { INITIAL_DEVICE_STATS } from '../constants';

export const useDeviceStats = () => {
  const [deviceStats, setDeviceStats] = useState<DeviceStats>(INITIAL_DEVICE_STATS);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDeviceStats(prev => ({
        ...prev,
        active: prev.active + Math.floor(Math.random() * 3) - 1,
        faulty: Math.max(0, prev.faulty + Math.floor(Math.random() * 2) - 1)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return deviceStats;
};
