'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface LoadingScreenProps {
  /** Tailwind gradient/solid classes for the backdrop. */
  bgClass?: string;
  /** Emoji that spins while loading (kid-friendly, defaults to a star). */
  icon?: string;
}

/**
 * Consistent full-screen loading state used by every page while data
 * is being fetched.
 */
export default function LoadingScreen({ bgClass = 'bg-sky-100', icon = '⭐' }: LoadingScreenProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${bgClass}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="text-6xl"
        aria-label="Loading"
        role="status"
      >
        {icon}
      </motion.div>
    </div>
  );
}
