'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ConfettiProps {
  /** Whether the confetti explosion is currently active */
  isActive?: boolean;
  /** Number of confetti particles (default: 45) */
  count?: number;
  /** Duration in milliseconds before auto-removal (default: 2600) */
  duration?: number;
  /** Callback fired after the explosion finishes */
  onComplete?: () => void;
  /** Additional CSS class names */
  className?: string;
}

interface Particle {
  id: number;
  color: string;
  shape: 'rect' | 'circle' | 'strip';
  width: number;
  height: number;
  targetX: number;
  peakY: number;
  targetY: number;
  rotation: number;
  scale: number;
  delay: number;
  duration: number;
}

const CONFETTI_COLORS = [
  '#FF4757', // Coral Red
  '#2ED573', // Fresh Green
  '#1E90FF', // Dodger Blue
  '#FFA502', // Orange Sun
  '#9B59B6', // Amethyst Purple
  '#FF6B81', // Bubblegum Pink
  '#2ED573', // Mint Green
  '#FFD32A', // Sunny Yellow
  '#00D2D3', // Bright Cyan
  '#FF80AB', // Rosy
  '#F368E0', // Neon Pink
  '#10AC84', // Mountain Meadow
];

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    // Generate upward arc with gravity drop
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 260;
    const targetX = Math.cos(angle) * distance;
    const peakY = -120 - Math.random() * 180;
    const targetY = peakY + 200 + Math.random() * 250;

    const shapes: ('rect' | 'circle' | 'strip')[] = ['rect', 'circle', 'strip'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];

    let width = 8;
    let height = 8;
    if (shape === 'rect') {
      width = 8 + Math.floor(Math.random() * 8);
      height = 6 + Math.floor(Math.random() * 6);
    } else if (shape === 'circle') {
      width = height = 7 + Math.floor(Math.random() * 7);
    } else {
      width = 4 + Math.floor(Math.random() * 4);
      height = 14 + Math.floor(Math.random() * 12);
    }

    return {
      id: i,
      color,
      shape,
      width,
      height,
      targetX,
      peakY,
      targetY,
      rotation: (Math.random() - 0.5) * 1080,
      scale: 0.8 + Math.random() * 0.5,
      delay: Math.random() * 0.15,
      duration: 1.8 + Math.random() * 0.8,
    };
  });
}

export default function Confetti({
  isActive = true,
  count = 45,
  duration = 2600,
  onComplete,
  className = '',
}: ConfettiProps) {
  const [visible, setVisible] = useState(isActive);

  // Generate particles fresh when triggered
  const particles = useMemo(() => {
    if (!visible) return [];
    return generateParticles(count);
  }, [visible, count]);

  useEffect(() => {
    if (!isActive) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, duration, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${className}`}
        >
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                x: [0, p.targetX * 0.6, p.targetX],
                y: [0, p.peakY, p.targetY],
                rotate: [0, p.rotation * 0.5, p.rotation],
                scale: [0, p.scale, p.scale * 0.9, 0],
                opacity: [1, 1, 0.9, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                position: 'absolute',
                width: p.width,
                height: p.height,
                backgroundColor: p.color,
                borderRadius: p.shape === 'circle' ? '9999px' : p.shape === 'strip' ? '2px' : '3px',
                boxShadow: `0 0 6px ${p.color}88`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
