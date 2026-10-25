'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { getWorldVisuals, isAmharicWorld, mascotEmoji } from '@/lib/worldTheme';

interface WorldInfo {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  themeColor: string;
  mascot: string;
  totalLevels: number;
  completedLevels: number;
  totalStars: number;
}

export default function AdventureMap() {
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [childName, setChildName] = useState('Learner');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/worlds')
      .then(res => res.json())
      .then(data => {
        setWorlds(data.worlds || []);
        setChildName(data.childName || 'Learner');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingScreen bgClass="bg-gradient-to-b from-sky-300 to-sky-100" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-200 to-green-100 relative overflow-hidden">
      {/* Decorative clouds */}
      <motion.div
        animate={{ x: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-8 left-[10%] text-5xl opacity-60"
      >
        ☁️
      </motion.div>
      <motion.div
        animate={{ x: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-16 right-[15%] text-4xl opacity-50"
      >
        ☁️
      </motion.div>
      <motion.div
        animate={{ x: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-4 right-[40%] text-3xl opacity-40"
      >
        ☁️
      </motion.div>

      {/* Sun */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-4 right-4 text-6xl"
      >
        ☀️
      </motion.div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-4 text-center">
        <motion.h1
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg"
        >
          Hi, {childName}! 🌟
        </motion.h1>
        <motion.p
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
          className="text-xl md:text-2xl text-white/90 mt-2 drop-shadow"
        >
          Choose your adventure!
        </motion.p>
      </div>

      {/* World Cards */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 pb-8 max-w-lg mx-auto">
        {worlds.map((world, index) => {
          const visuals = getWorldVisuals(world.slug);
          const amharic = isAmharicWorld(world.slug);
          return (
          <motion.div
            key={world.id}
            initial={{ x: index % 2 === 0 ? -100 : 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4, delay: index * 0.15 }}
            className="w-full"
          >
            <Link href={`/world/${world.slug}`}>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`
                  w-full rounded-3xl p-6 shadow-2xl cursor-pointer
                  bg-gradient-to-br ${visuals.cardGradient}
                  border-4 ${visuals.cardBorder}
                  relative overflow-hidden
                `}
              >
                {/* Background decoration */}
                <div className="absolute -right-4 -bottom-4 text-[80px] opacity-20">
                  {mascotEmoji(world.mascot)}
                </div>

                <div className="relative z-10 flex items-center gap-4">
                  {/* Emoji & Mascot */}
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
                    className="text-5xl md:text-6xl"
                  >
                    {world.emoji}
                  </motion.div>

                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow">
                      {world.title}
                    </h2>
                    {/* Phase 1 & 2 badge */}
                    {world.slug === 'abc-garden' && (
                      <div className="flex items-center gap-1.5 my-1 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs">
                          🌱 Phase 1: 17 Lvls
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-xs">
                          🚀 Phase 2: 15 Lvls
                        </span>
                      </div>
                    )}
                    {/* Stars progress */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg text-yellow-200">
                        {'⭐'.repeat(Math.min(world.totalStars, 5))}
                        {world.totalStars > 5 && ` +${world.totalStars - 5}`}
                      </span>
                      <span className="text-white/80 text-sm font-semibold">
                        {amharic
                          ? `${world.completedLevels}/${world.totalLevels} ደረጃዎች`
                          : `${world.completedLevels}/${world.totalLevels} levels`}
                      </span>
                    </div>
                  </div>

                  {/* Mascot */}
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-4xl md:text-5xl"
                  >
                    {mascotEmoji(world.mascot)}
                  </motion.div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
          );
        })}
      </div>

      {/* Parent area button - hidden at bottom */}
      <div className="relative z-10 flex justify-center pb-8">
        <Link href="/parent">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="text-sm text-sky-600/50 hover:text-sky-600 transition-colors px-4 py-2 rounded-full"
          >
            👤 Parent Area
          </motion.button>
        </Link>
      </div>

      {/* Ground decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-green-400/30 to-transparent" />
    </div>
  );
}
