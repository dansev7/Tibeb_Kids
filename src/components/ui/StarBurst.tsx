'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

export interface StarBurstProps {
  /** Number of earned stars (0 to maxStars) */
  stars: number;
  /** Maximum number of stars to display (default: 3) */
  maxStars?: number;
  /** Size variant of the stars */
  size?: 'sm' | 'md' | 'lg';
  /** Optional callback fired when animation finishes */
  onComplete?: () => void;
  /** Additional CSS class names */
  className?: string;
}

const sizeConfig = {
  sm: {
    container: 'gap-3 p-2',
    star: 'w-12 h-12',
    centerStar: 'w-14 h-14',
    particleSize: 'w-2 h-2',
  },
  md: {
    container: 'gap-5 p-4',
    star: 'w-18 h-18',
    centerStar: 'w-22 h-22',
    particleSize: 'w-3 h-3',
  },
  lg: {
    container: 'gap-6 p-6',
    star: 'w-24 h-24',
    centerStar: 'w-28 h-28',
    particleSize: 'w-3.5 h-3.5',
  },
};

const starVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -70,
    opacity: 0,
  },
  visible: (i: number) => ({
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 15,
      delay: i * 0.35 + 0.1,
    },
  }),

};

const burstParticles = [
  { dx: -28, dy: -28, delay: 0.15 },
  { dx: 28, dy: -28, delay: 0.18 },
  { dx: -34, dy: 10, delay: 0.22 },
  { dx: 34, dy: 10, delay: 0.2 },
  { dx: 0, dy: -38, delay: 0.12 },
  { dx: -18, dy: 30, delay: 0.25 },
  { dx: 18, dy: 30, delay: 0.24 },
];

export default function StarBurst({
  stars,
  maxStars = 3,
  size = 'md',
  onComplete,
  className = '',
}: StarBurstProps) {
  const currentConfig = sizeConfig[size];
  const starIndices = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <div
      role="group"
      aria-label={`${stars} out of ${maxStars} stars earned`}
      className={`relative flex items-center justify-center select-none ${currentConfig.container} ${className}`}
    >
      {starIndices.map((starNumber, index) => {
        const isEarned = starNumber <= stars;
        // In a 3-star display, center star is slightly raised for trophy effect
        const isCenter = maxStars === 3 && starNumber === 2;
        const starSizeClass = isCenter ? currentConfig.centerStar : currentConfig.star;

        return (
          <div
            key={starNumber}
            className={`relative flex items-center justify-center ${
              isCenter ? '-translate-y-2' : ''
            }`}
          >
            {isEarned ? (
              <>
                {/* Radiant Glow Behind Earned Star */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 0.9, 0.4],
                    scale: [0.5, 1.6, 1.2],
                  }}
                  transition={{
                    delay: index * 0.35 + 0.25,
                    duration: 0.8,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 -m-3 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 rounded-full blur-xl pointer-events-none"
                />

                {/* Pop Sparkles around earned star */}
                {burstParticles.map((pt, pIdx) => (
                  <motion.div
                    key={pIdx}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{
                      x: pt.dx,
                      y: pt.dy,
                      scale: [0, 1.3, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      delay: index * 0.35 + pt.delay,
                      duration: 0.65,
                      ease: 'easeOut',
                    }}
                    className={`absolute rounded-full pointer-events-none ${currentConfig.particleSize} ${
                      pIdx % 2 === 0 ? 'bg-yellow-300' : 'bg-amber-400'
                    } shadow-[0_0_8px_rgba(251,191,36,0.8)]`}
                  />
                ))}

                {/* Animated Gold Star */}
                <motion.div
                  custom={index}
                  variants={starVariants}
                  initial="hidden"
                  animate="visible"
                  onAnimationComplete={() => {
                    if (index === Math.min(stars, maxStars) - 1 && onComplete) {
                      onComplete();
                    }
                  }}
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  className={`relative ${starSizeClass} drop-shadow-[0_8px_16px_rgba(217,119,6,0.5)] cursor-pointer`}
                >
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full filter"
                  >
                    <defs>
                      <linearGradient
                        id={`star-grad-${starNumber}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#FFF566" />
                        <stop offset="30%" stopColor="#FFD700" />
                        <stop offset="85%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#D97706" />
                      </linearGradient>
                      <linearGradient
                        id={`star-shine-${starNumber}`}
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                      </linearGradient>
                      <filter id={`glow-${starNumber}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#B45309" floodOpacity="0.4" />
                      </filter>
                    </defs>

                    {/* Main Star Body */}
                    <path
                      d="M50 4.5
                         L63.5 32.8
                         L94.5 37.1
                         L72 58.7
                         L77.4 89.5
                         L50 74.8
                         L22.6 89.5
                         L28 58.7
                         L5.5 37.1
                         L36.5 32.8
                         Z"
                      fill={`url(#star-grad-${starNumber})`}
                      stroke="#CA8A04"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      filter={`url(#glow-${starNumber})`}
                    />

                    {/* Cute 3D Highlight Curve */}
                    <path
                      d="M50 10
                         L60 33
                         L85 36
                         L66 54
                         L50 48
                         Z"
                      fill={`url(#star-shine-${starNumber})`}
                      opacity="0.65"
                    />

                    {/* Star Sparkle Dot */}
                    <circle cx="48" cy="28" r="3" fill="#FFFFFF" opacity="0.9" />
                  </svg>
                </motion.div>
              </>
            ) : (
              /* Empty / Placeholder Star */
              <motion.div
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ opacity: 0.5, scale: 1 }}
                className={`relative ${starSizeClass} opacity-40`}
              >
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  <path
                    d="M50 4.5
                       L63.5 32.8
                       L94.5 37.1
                       L72 58.7
                       L77.4 89.5
                       L50 74.8
                       L22.6 89.5
                       L28 58.7
                       L5.5 37.1
                       L36.5 32.8
                       Z"
                    fill="#E2E8F0"
                    stroke="#94A3B8"
                    strokeWidth="3.5"
                    strokeDasharray="6 4"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}
