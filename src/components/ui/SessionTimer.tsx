'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playAudioOrSpeech } from '@/utils/sound';
import ParentGate from '@/components/ui/ParentGate';

export default function SessionTimer() {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [sessionLimitMin, setSessionLimitMin] = useState(15);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showParentUnlock, setShowParentUnlock] = useState(false);

  useEffect(() => {
    // Load parent-configured session limit
    fetch('/api/parent/settings')
      .then(res => res.json())
      .then(data => {
        if (data?.sessionLimitMin) {
          setSessionLimitMin(data.sessionLimitMin);
        }
      })
      .catch(() => {});

    // Tick every minute
    const interval = setInterval(() => {
      setElapsedMinutes(prev => {
        const next = prev + 1;
        if (next >= sessionLimitMin && !isTimeUp) {
          setIsTimeUp(true);
          playAudioOrSpeech(
            '/audio/prompts/goodbye_tomorrow.mp3',
            'Great job today! See you tomorrow!'
          );
        }
        return next;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [sessionLimitMin, isTimeUp]);

  const handleUnlockMoreTime = () => {
    setShowParentUnlock(false);
    setIsTimeUp(false);
    setElapsedMinutes(0); // Reset timer for extra session
  };

  return (
    <>
      <AnimatePresence>
        {isTimeUp && (
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
              <div className="text-7xl mb-4 animate-bounce">
                🌟 🦁 🐦
              </div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">
                Great Job Today!
              </h2>
              <p className="text-xl text-gray-600 mb-6 font-semibold">
                Time to rest your eyes! See you tomorrow! 👋
              </p>

              {/* Grown-up extend button */}
              <button
                onClick={() => setShowParentUnlock(true)}
                className="text-xs text-gray-400 hover:text-gray-600 mt-4 transition-colors"
              >
                Grown-ups: Add 10 more minutes
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
