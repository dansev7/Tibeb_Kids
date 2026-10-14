'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotation: number;
  targetRotation: number;
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'ribbon' | 'star';
}

const COLORS = [
  '#FF477E', // pink
  '#FFD166', // yellow
  '#06D6A0', // emerald
  '#118AB2', // teal/blue
  '#7209B7', // purple
  '#F77F00', // orange
  '#4CC9F0', // sky
];

export function ConfettiBurst({
  active = true,
  count = 35,
  originX = 0,
  originY = 0,
}: {
  active?: boolean;
  count?: number;
  originX?: number;
  originY?: number;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const items: Particle[] = [];
    const shapes: ('circle' | 'square' | 'ribbon' | 'star')[] = [
      'circle',
      'square',
      'ribbon',
      'star',
    ];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const distance = 80 + Math.random() * 260;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance - 50; // Bias slightly upwards

      items.push({
        id: i,
        x: 0,
        y: 0,
        targetX,
        targetY,
        rotation: 0,
        targetRotation: (Math.random() - 0.5) * 720,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 10 + Math.random() * 14,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    setParticles(items);

    const timer = setTimeout(() => {
      setParticles([]);
    }, 2400);

    return () => clearTimeout(timer);
  }, [active, count, originX, originY]);

  if (!active || particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="relative"
        style={{
          transform: `translate(${originX}px, ${originY}px)`,
        }}
      >
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: p.x,
                y: p.y,
                scale: 0.2,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x: p.targetX,
                y: [p.targetY, p.targetY + 120], // Arch up then fall down
                scale: [0.3, 1.2, 0.9],
                opacity: [1, 1, 0],
                rotate: p.targetRotation,
              }}
              transition={{
                duration: 1.8 + Math.random() * 0.4,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                width: p.shape === 'ribbon' ? p.size * 1.8 : p.size,
                height: p.shape === 'ribbon' ? p.size * 0.5 : p.size,
                borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'square' ? '4px' : '2px',
                backgroundColor: p.color,
                boxShadow: `0 0 8px ${p.color}88`,
              }}
            >
              {p.shape === 'star' && (
                <svg
                  viewBox="0 0 24 24"
                  fill={p.color}
                  className="w-full h-full drop-shadow"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
