'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playAudioOrSpeech } from '@/utils/sound';
import ParentGate from '@/components/ui/ParentGate';
import { fetchSettings } from '@/lib/settings';

const STORAGE_KEY = 'little_learner_session';

interface PersistentSession {
  /** Local calendar day (YYYY-MM-DD) the session belongs to. Resets next day. */
  day: string;
  /** Epoch ms when the current open-app segment started. */
  segStartMs: number;
  /** Total ms from finished segments — only time with the app open counts. */
  accumMs: number;
  /** ISO timestamp of the first segment today, recorded as the row's start. */
  firstStartISO: string;
  /** Row id in the session table (null until the start POST succeeds). */
  sessionId: number | null;
  /** Extra minutes granted by a parent through the unlock gate. */
  extraMin: number;
  /** True once today's limit was reached. */
  ended: boolean;
}

function today(): string {
  // Local calendar day (not UTC), so the limit resets when the child wakes up
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function freshSession(): PersistentSession {
  const now = Date.now();
  return {
    day: today(),
    segStartMs: now,
    accumMs: 0,
    firstStartISO: new Date(now).toISOString(),
    sessionId: null,
    extraMin: 0,
    ended: false,
  };
}

function loadSession(): PersistentSession {
  const fallback = freshSession();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistentSession>;
      if (parsed?.day === today() && typeof parsed.segStartMs === 'number') {
        return {
          day: parsed.day,
          segStartMs: parsed.segStartMs,
          accumMs: typeof parsed.accumMs === 'number' && parsed.accumMs >= 0 ? parsed.accumMs : 0,
          firstStartISO: typeof parsed.firstStartISO === 'string' ? parsed.firstStartISO : fallback.firstStartISO,
          sessionId: typeof parsed.sessionId === 'number' ? parsed.sessionId : null,
          extraMin: typeof parsed.extraMin === 'number' ? parsed.extraMin : 0,
          ended: Boolean(parsed.ended),
        };
      }
    }
  } catch {}
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
  } catch {}
  return fallback;
}

function saveSession(s: PersistentSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/** Minutes the child actually spent with the app open today. */
function elapsedMinutes(s: PersistentSession): number {
  const open = s.ended ? 0 : Math.max(0, Date.now() - s.segStartMs);
  return (s.accumMs + open) / 60000;
}

/** Move the running segment into the accumulator so reloads don't reset it. */
function foldSegment(s: PersistentSession): PersistentSession {
  if (s.ended) return s;
  const now = Date.now();
  const next = { ...s, accumMs: s.accumMs + Math.max(0, now - s.segStartMs), segStartMs: now };
  saveSession(next);
  return next;
}

/** Close today's session: checkpoint the row (keepalive survives tab close). */
function endSessionNow(s: PersistentSession): PersistentSession {
  if (s.ended) return s;
  const folded = foldSegment(s);
  const next = { ...folded, ended: true };
  if (next.sessionId !== null) {
    const payload = {
      sessionId: next.sessionId,
      endedAt: new Date().toISOString(),
      minutes: Math.round(elapsedMinutes(next) * 10) / 10,
    };
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      try {
        const { queueOfflineProgress } = require('@/lib/offlineQueue');
        queueOfflineProgress('/api/session', payload);
      } catch {}
    });
  }
  saveSession(next);
  return next;
}

export default function SessionTimer({ hidden = false }: { hidden?: boolean }) {
  // Lazy init keeps today's session across reloads; renders null on the server
  const [session, setSession] = useState<PersistentSession | null>(() =>
    typeof window === 'undefined' ? null : loadSession(),
  );
  const [sessionLimitMin, setSessionLimitMin] = useState(15);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showParentUnlock, setShowParentUnlock] = useState(false);
  const sessionRef = useRef<PersistentSession | null>(null);
  const saidGoodbyeRef = useRef(false);
  const startPostedRef = useRef(false);

  const updateSession = useCallback((next: PersistentSession) => {
    sessionRef.current = next;
    setSession(next);
    saveSession(next);
  }, []);

  // Register today's session row once and load the parent-configured limit
  useEffect(() => {
    if (!session) return;
    sessionRef.current = session;
    if (session.ended) saidGoodbyeRef.current = true;

    // Don't open a second row for a session that already has one; the ref
    // guard also survives StrictMode's double-mount in dev
    if (!startPostedRef.current && session.sessionId === null && !session.ended) {
      startPostedRef.current = true;
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startedAt: session.firstStartISO }),
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          const cur = sessionRef.current;
          if (data?.sessionId && cur && cur.sessionId === null) {
            updateSession({ ...cur, sessionId: data.sessionId });
          }
        })
        .catch(() => {});
    }

    fetchSettings().then(s => setSessionLimitMin(s.sessionLimitMin));
  }, [session, updateSession]);

  // Checkpoint the session row when the tab/page goes away. The session is
  // NOT marked ended — reloading or revisiting continues counting today.
  useEffect(() => {
    const handlePageHide = () => {
      const cur = sessionRef.current;
      if (!cur || cur.ended || cur.sessionId === null) return;
      const folded = foldSegment(cur);
      sessionRef.current = folded;
      fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: folded.sessionId,
          endedAt: new Date().toISOString(),
          minutes: Math.round(elapsedMinutes(folded) * 10) / 10,
        }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  // Elapsed time is accumulated from real open-app segments, so reloading
  // never resets the counter. Checks run from timers, not the effect body.
  useEffect(() => {
    const check = () => {
      const cur = sessionRef.current;
      if (!cur) return;
      if (cur.ended) {
        // Reloaded after the lock appeared earlier today — show it again
        setIsTimeUp(true);
        return;
      }
      const folded = foldSegment(cur);
      sessionRef.current = folded;
      const limit = sessionLimitMin + folded.extraMin;
      if (elapsedMinutes(folded) >= limit) {
        if (!saidGoodbyeRef.current) {
          saidGoodbyeRef.current = true;
          playAudioOrSpeech(
            '/audio/prompts/goodbye_tomorrow.mp3',
            'Great job today! See you tomorrow!'
          );
        }
        sessionRef.current = endSessionNow(folded);
        setIsTimeUp(true);
      }
    };
    const kickOff = setTimeout(check, 2000);
    const interval = setInterval(check, 30000);
    return () => {
      clearTimeout(kickOff);
      clearInterval(interval);
    };
  }, [sessionLimitMin, isTimeUp]);

  const handleKeepPlaying = () => {
    setIsTimeUp(false);
    saidGoodbyeRef.current = true;
    const base = sessionRef.current ?? freshSession();
    // Grant 60 extra minutes and unmark ended so the child can keep learning freely
    updateSession({ ...base, extraMin: base.extraMin + 60, ended: false, segStartMs: Date.now() });
  };

  const handleUnlockMoreTime = () => {
    setShowParentUnlock(false);
    setIsTimeUp(false);
    saidGoodbyeRef.current = true;
    const base = sessionRef.current ?? freshSession();
    // Reopen the session for the extra minutes and start a fresh segment
    updateSession({ ...base, extraMin: base.extraMin + 30, ended: false, segStartMs: Date.now() });
  };

  return (
    <>
      <AnimatePresence>
        {isTimeUp && !hidden && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-sky-900/80 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-amber-300 relative"
            >
              {/* Close Button (Taking rest is optional) */}
              <button
                onClick={handleKeepPlaying}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-500 font-black flex items-center justify-center text-xl transition-all cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>

              <div className="text-7xl mb-4 animate-bounce">
                🌟 🦁 🐦
              </div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">
                Great Job Today!
              </h2>
              <p className="text-lg text-gray-600 mb-6 font-semibold">
                Time to rest your eyes! Taking a rest is optional — you can keep playing whenever you want! 👋
              </p>

              {/* Child-friendly Keep Playing button */}
              <button
                onClick={handleKeepPlaying}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-95 text-white font-black text-xl shadow-lg shadow-green-200 transition-all cursor-pointer mb-3"
              >
                🚀 Keep Playing!
              </button>

              {/* Grown-up settings option */}
              <button
                onClick={() => setShowParentUnlock(true)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                Grown-ups: Change limits in Settings
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ParentGate
        isOpen={showParentUnlock}
        onSuccess={handleUnlockMoreTime}
        onCancel={() => setShowParentUnlock(false)}
        title="Parent Check"
      />
    </>
  );
}
