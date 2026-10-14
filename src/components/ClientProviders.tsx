'use client';

import { useEffect } from 'react';
import SessionTimer from '@/components/ui/SessionTimer';
import { syncOfflineQueue } from '@/lib/offlineQueue';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register PWA Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          // Sync any pending offline actions upon register
          syncOfflineQueue();
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    }
  }, []);

  return (
    <>
      {children}
      <SessionTimer />
    </>
  );
}
