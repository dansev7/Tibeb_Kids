'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' && (window.navigator as any).standalone === true)
    ) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).__pwaInstallPrompt = e;
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      (window as any).__pwaInstallPrompt = null;
    };

    const handleManualShow = () => {
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('show-pwa-install', handleManualShow);

    // Global helper for manual trigger from Parent Settings or header
    (window as any).triggerPwaInstall = async () => {
      const promptEvent = (window as any).__pwaInstallPrompt || deferredPrompt;
      if (promptEvent) {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsVisible(false);
        }
        setDeferredPrompt(null);
        (window as any).__pwaInstallPrompt = null;
        return true;
      }
      return false;
    };

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('show-pwa-install', handleManualShow);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
    (window as any).__pwaInstallPrompt = null;
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || isInstalled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 border border-white/20 select-none"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-2xl animate-bounce">📲</span>
          <div>
            <div className="font-extrabold text-xs sm:text-sm leading-tight">
              Install Little Learner App
            </div>
            <div className="text-[11px] text-white/80 leading-tight">
              Play offline anytime without Wi-Fi!
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-900 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-white/70 hover:text-white text-xs cursor-pointer"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
