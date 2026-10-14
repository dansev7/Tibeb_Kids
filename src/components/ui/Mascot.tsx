'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type MascotType = 'bird' | 'cow' | 'lion';

export interface MascotProps {
  /** The mascot character: 'bird' (ABC World), 'cow' (Numbers World), 'lion' (Fidel World) */
  type: MascotType;
  /** Whether the mascot is in celebrating mode (bigger bounce + spin + sparkles) */
  isCelebrating?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional speech bubble text shown above the mascot */
  speechBubble?: string;
  /** Optional click handler for playful child interaction */
  onClick?: () => void;
  /** Additional CSS class names */
  className?: string;
}

const mascotConfig: Record<
  MascotType,
  {
    emoji: string;
    name: string;
    worldName: string;
    bgGradient: string;
    borderColor: string;
    shadowColor: string;
  }
> = {
  bird: {
    emoji: '🐦',
    name: 'Pip the Parrot',
    worldName: 'ABC World',
    bgGradient: 'from-emerald-300 via-teal-400 to-emerald-500',
    borderColor: 'border-emerald-300',
    shadowColor: 'shadow-emerald-200/80',
  },
  cow: {
    emoji: '🐄',
    name: 'Daisy the Cow',
    worldName: 'Numbers World',
    bgGradient: 'from-amber-300 via-yellow-400 to-orange-400',
    borderColor: 'border-amber-300',
    shadowColor: 'shadow-amber-200/80',
  },
  lion: {
    emoji: '🦁',
    name: 'Leo the Lion',
    worldName: 'Fidel World',
    bgGradient: 'from-purple-300 via-fuchsia-400 to-indigo-500',
    borderColor: 'border-purple-300',
    shadowColor: 'shadow-purple-200/80',
  },
};

const sizeStyles = {
  sm: {
    badge: 'w-16 h-16 text-3xl border-3 shadow-md',
    bubbleText: 'text-sm px-3 py-1.5 max-w-[160px]',
    sparkleSize: 'w-2 h-2',
  },
  md: {
    badge: 'w-24 h-24 text-5xl border-4 shadow-lg',
    bubbleText: 'text-base px-4 py-2 max-w-[220px]',
    sparkleSize: 'w-3 h-3',
  },
  lg: {
    badge: 'w-32 h-32 text-7xl border-4 shadow-xl',
    bubbleText: 'text-lg px-5 py-2.5 max-w-[280px]',
    sparkleSize: 'w-4 h-4',
  },
};

const sparkleOffsets = [
  { x: -35, y: -30, delay: 0 },
  { x: 35, y: -35, delay: 0.2 },
  { x: -40, y: 15, delay: 0.4 },
  { x: 40, y: 15, delay: 0.3 },
  { x: 0, y: -45, delay: 0.1 },
];

export default function Mascot({
  type,
  isCelebrating = false,
  size = 'md',
  speechBubble,
  onClick,
  className = '',
}: MascotProps) {
  const config = mascotConfig[type];
  const currentSize = sizeStyles[size];

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Speech Bubble */}
      <AnimatePresence>
        {speechBubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="relative mb-3 z-20 pointer-events-none"
          >
            <div
              className={`bg-white text-gray-800 font-bold rounded-2xl shadow-lg border-2 border-amber-200 text-center leading-snug ${currentSize.bubbleText}`}
            >
              {speechBubble}
            </div>
            {/* Bubble arrow pointing down */}
            <div className="w-0 h-0 mx-auto border-x-8 border-x-transparent border-t-8 border-t-white drop-shadow-sm -mt-0.5" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Container */}
      <div className="relative flex items-center justify-center">
        {/* Celebration Sparkles */}
        {isCelebrating &&
          sparkleOffsets.map((sp, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.3, 0],
                opacity: [0, 1, 0],
                y: [sp.y, sp.y - 20],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: sp.delay,
                ease: 'easeOut',
              }}
              style={{
                transform: `translate(${sp.x}px, ${sp.y}px)`,
              }}
              className={`absolute rounded-full bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.9)] pointer-events-none ${currentSize.sparkleSize}`}
            />
          ))}

        {/* Mascot Avatar with Idle or Celebrate Animation */}
        <motion.div
          onClick={onClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={
            isCelebrating
              ? {
                  y: [0, -32, 0, -20, 0],
                  rotate: [0, -10, 360, 370, 360],
                  scale: [1, 1.25, 0.95, 1.15, 1],
                }
              : {
                  y: [0, -8, 0],
                  rotate: [-2, 2, -2],
                }
          }
          transition={
            isCelebrating
              ? {
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : {
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
          className={`relative rounded-full flex items-center justify-center cursor-pointer bg-gradient-to-br ${
            config.bgGradient
          } ${config.borderColor} ${config.shadowColor} ${currentSize.badge} ${
            onClick ? 'hover:brightness-105' : ''
          }`}
          role="img"
          aria-label={`${config.name} - Mascot for ${config.worldName}`}
        >
          {/* Subtle glossy overlay */}
          <div className="absolute top-1 left-2 right-2 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />

          {/* Emoji Avatar */}
          <span className="relative z-10 filter drop-shadow-md transform transition-transform">
            {config.emoji}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
