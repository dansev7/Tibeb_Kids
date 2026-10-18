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

    // Register PWA Service Worker (production only — its cache-first rule
    // for /_next/static/ serves stale chunks during `next dev`)
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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
      <Suspense fallback={null}>
        <SessionTimerArea />
      </Suspense>
      <PwaInstallPrompt />
    </>
  );
}
