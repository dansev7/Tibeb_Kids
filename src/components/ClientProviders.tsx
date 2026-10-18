'use client';

import { Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SessionTimer from '@/components/ui/SessionTimer';
import PwaInstallPrompt from '@/components/ui/PwaInstallPrompt';
import { syncOfflineQueue } from '@/lib/offlineQueue';
import { fetchSettings, applySettings } from '@/lib/settings';
import { initVoiceStudioStorage } from '@/lib/audioStorage';

// usePathname defers to client during prerendering, so keep it in a small
// component behind a Suspense boundary.
function SessionTimerArea() {
  const pathname = usePathname();
  return <SessionTimer hidden={pathname?.startsWith('/parent')} />;
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Warm up parent voice recording blob URLs
    initVoiceStudioStorage();

    // Apply parent settings (volume, voice) on every page, not just settings
    fetchSettings().then(applySettings);

    // PWA Service Worker management
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            registration.update();
            syncOfflineQueue();
          })
          .catch((err) => {
            console.warn('Service worker registration failed:', err);
          });
      } else {
        // In development, unregister any existing service worker and purge caches
        // so Turbopack/Next.js hot reload bundles are never shadowed by stale worker caches
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        if ('caches' in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              caches.delete(key);
            }
          });
        }
      }
    }
  }, []);

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <SessionTimerArea />
      </Suspense>
      <PwaInstallPrompt />
    </>
  );
}
