'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type ProgressBarVariant =
  | 'primary'
  | 'world-abc'
  | 'world-num'
  | 'world-fidel'
  | 'rainbow';

export interface ProgressBarProps {
  /** Current active or completed stage (e.g., 3 in 5 stages) */
  currentStage: number;
  /** Total number of stages in the level (e.g., 5) */
  totalStages: number;
  /** Color theme variant */
  variant?: ProgressBarVariant;
  /** Whether to show stage indicator dots along the bar (default: true) */
  showStageDots?: boolean;
  /** Height size of the progress bar */
  height?: 'sm' | 'md' | 'lg';
  /** Optional icon at the end of the bar (e.g. '🏆' or '⭐') */
  endIcon?: string;
  /** Additional CSS class names */
  className?: string;
}

const variantStyles: Record<
  ProgressBarVariant,
  {
    fillGradient: string;
    shadowColor: string;
    dotActive: string;
    dotCompleted: string;
  }
> = {
  primary: {
    fillGradient: 'bg-gradient-to-r from-blue-400 via-sky-400 to-blue-500',
    shadowColor: 'shadow-blue-300/50',
    dotActive: 'bg-blue-500 ring-4 ring-blue-200 text-white',
    dotCompleted: 'bg-blue-600 text-white',
  },
  'world-abc': {
    fillGradient: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500',
    shadowColor: 'shadow-emerald-300/50',
    dotActive: 'bg-emerald-500 ring-4 ring-emerald-200 text-white',
    dotCompleted: 'bg-emerald-600 text-white',
  },
  'world-num': {
    fillGradient: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500',
    shadowColor: 'shadow-amber-300/50',
    dotActive: 'bg-amber-500 ring-4 ring-amber-200 text-white',
    dotCompleted: 'bg-amber-600 text-white',
  },
  'world-fidel': {
    fillGradient: 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-500',
    shadowColor: 'shadow-purple-300/50',
    dotActive: 'bg-purple-500 ring-4 ring-purple-200 text-white',
    dotCompleted: 'bg-purple-600 text-white',
  },
  rainbow: {
    fillGradient:
      'bg-gradient-to-r from-pink-500 via-yellow-400 via-green-400 via-blue-500 to-purple-500',
    shadowColor: 'shadow-pink-300/50',
    dotActive: 'bg-yellow-400 ring-4 ring-yellow-200 text-slate-800',
    dotCompleted: 'bg-emerald-500 text-white',
  },
};

const heightStyles = {
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-8',
};

const dotSizeStyles = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
};

export default function ProgressBar({
  currentStage,
  totalStages,
  variant = 'primary',
  showStageDots = true,
  height = 'md',
  endIcon = '⭐',
  className = '',
}: ProgressBarProps) {
  const safeTotal = Math.max(1, totalStages);
  const clampedStage = Math.max(0, Math.min(safeTotal, currentStage));
  const progressPercent = Math.min(100, Math.round((clampedStage / safeTotal) * 100));

  const config = variantStyles[variant];
  const barHeight = heightStyles[height];
  const dotSize = dotSizeStyles[height];

  return (
    <div className={`relative w-full flex items-center gap-3 select-none ${className}`}>
      {/* Outer Track Container */}
      <div className="relative flex-1 flex items-center">
        {/* Background Track with 3D inset shadow */}
        <div
          className={`w-full ${barHeight} bg-slate-200 rounded-full shadow-inner border-2 border-slate-300/80 overflow-hidden relative`}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Animated Fill Bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 18,
            }}
            className={`h-full ${config.fillGradient} relative rounded-full shadow-md ${config.shadowColor}`}
          >
            {/* Top Gloss Shine */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/35 rounded-t-full pointer-events-none" />

            {/* Subtle bubbly shimmer animation */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: 'linear',
              }}
              className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
            />
          </motion.div>
        </div>

        {/* Stage Checkpoint Dots */}
        {showStageDots && safeTotal > 1 && (
          <div className="absolute inset-x-3 flex items-center justify-between pointer-events-none">
            {Array.from({ length: safeTotal }, (_, i) => {
              const stageNum = i + 1;
              const isCompleted = stageNum <= clampedStage;
              const isCurrent = stageNum === clampedStage;

              return (
                <motion.div
                  key={stageNum}
                  initial={{ scale: 0.8 }}
                  animate={
                    isCurrent
                      ? { scale: [1, 1.25, 1] }
                      : isCompleted
                      ? { scale: 1.05 }
                      : { scale: 0.85 }
                  }
                  transition={
                    isCurrent
                      ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
                      : { duration: 0.3 }
                  }
                  className={`rounded-full flex items-center justify-center font-extrabold shadow-sm transition-all duration-300 ${dotSize} ${
                    isCompleted
                      ? config.dotCompleted
                      : 'bg-white/90 border-2 border-slate-300 text-slate-400'
                  } ${isCurrent ? config.dotActive : ''}`}
                >
                  {isCompleted ? '✓' : stageNum}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Goal Trophy / Star Badge at the end */}
      {endIcon && (
        <motion.div
          animate={
            progressPercent === 100
              ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }
              : { scale: 1 }
          }
          transition={{
            repeat: progressPercent === 100 ? Infinity : 0,
            duration: 1.2,
          }}
          className="flex-shrink-0 text-2xl drop-shadow-sm"
          role="img"
          aria-label="Level finish goal"
        >
          {endIcon}
        </motion.div>
      )}
    </div>
  );
}
