'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { getWorldVisuals, isAmharicWorld, mascotEmoji } from '@/lib/worldTheme';

interface LevelInfo {
  id: string;
  order: number;
  phase?: number;
  phaseOrder?: number;
  title: string;
  type: string;
  stars: number;
  unlocked: boolean;
  completed: boolean;
}

interface WorldData {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  themeColor: string;
  mascot: string;
  levels: LevelInfo[];
}

function WorldContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [world, setWorld] = useState<WorldData | null>(null);
  const [loading, setLoading] = useState(true);

  const isAmharic = isAmharicWorld(slug);
  const [activePhase, setActivePhase] = useState<1 | 2>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('abc_garden_phase');
      if (saved === '2') return 2;
    }
    return 1;
  });

  const handleSelectPhase = (p: 1 | 2) => {
    setActivePhase(p);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('abc_garden_phase', String(p));
    }
  };

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/worlds/${slug}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setWorld(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <LoadingScreen bgClass="bg-sky-100" />;
  }

  if (!world) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-100">
        <p className="text-2xl text-gray-400 font-bold">World not found</p>
      </div>
    );
  }

  // Find the next playable level (first unlocked but not completed, or first unlocked)
  const displayedLevels = slug === 'abc-garden'
    ? world.levels.filter(l => (l.phase ?? (l.order > 17 ? 2 : 1)) === activePhase)
    : world.levels;

  const nextPlayableIndex = displayedLevels.findIndex(l => l.unlocked && !l.completed);
  const nextPlayableId = nextPlayableIndex >= 0 ? displayedLevels[nextPlayableIndex].id : null;

  const totalEarnedStars = world.levels.reduce((acc, l) => acc + (l.stars || 0), 0);
  const visuals = getWorldVisuals(slug);
  const theme = visuals.theme;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${visuals.pageGradient} relative pb-20`}>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => router.push('/')}
            className="w-14 h-14 rounded-2xl bg-white shadow-md border-2 border-gray-200 flex items-center justify-center text-2xl cursor-pointer hover:bg-gray-50 transition-colors"
            aria-label={isAmharic ? 'ወደ ዋና ገጽ ተመለስ' : 'Back to home map'}
          >
            🏠
          </motion.button>

          <div className="text-center flex-1 mx-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 drop-shadow-sm flex items-center justify-center gap-2">
              <span>{world.emoji}</span>
              <span>{world.title}</span>
            </h1>
            <div className="text-xs sm:text-sm font-bold text-gray-600 mt-0.5">
              {isAmharic
                ? `⭐ ${totalEarnedStars} ኮከቦች ተሰብስበዋል`
                : `⭐ ${totalEarnedStars} stars earned`}
            </div>
          </div>

          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-4xl sm:text-5xl"
          >
            {mascotEmoji(world.mascot)}
          </motion.div>
        </div>
      </header>

      {/* Levels Rows and Columns Grid */}
      <main className="max-w-4xl mx-auto px-4 pt-6">
        {/* Phase Selector for ABC Garden */}
        {slug === 'abc-garden' && (
          <div className="max-w-md mx-auto mb-6">
            <div className="p-1.5 bg-white/75 backdrop-blur-md rounded-2xl shadow-md border border-white/80 flex items-center gap-2">
              <button
                onClick={() => handleSelectPhase(1)}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  activePhase === 1
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                    : 'text-gray-600 hover:text-emerald-700 hover:bg-white/50'
                }`}
              >
                <span>🌱</span>
                <span>Phase 1: Letters</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activePhase === 1 ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  17 Lvls
                </span>
              </button>

              <button
                onClick={() => handleSelectPhase(2)}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  activePhase === 2
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                    : 'text-gray-600 hover:text-emerald-700 hover:bg-white/50'
                }`}
              >
                <span>🚀</span>
                <span>Phase 2: Phonics</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activePhase === 2 ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  15 Lvls
                </span>
              </button>
            </div>
            <p className="text-center text-xs font-bold text-emerald-800/80 mt-2">
              {activePhase === 1
                ? '🌱 Master uppercase & lowercase letters and alphabetical order'
                : '🚀 First sounds, rhyming families, 3-letter words & sight words!'}
            </p>
          </div>
        )}
        {/* Responsive Grid: 3 cols on mobile, 4 on tablet, 5 on desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-y-8 gap-x-4 sm:gap-x-6">
          {displayedLevels.map((level, index) => {
            const isNext = level.id === nextPlayableId;
            const isLocked = !level.unlocked;
            const displayOrder = level.phaseOrder ?? (level.phase === 2 || level.order > 17 ? level.order - 17 : level.order);

            return (
              <motion.div
                key={level.id}
                initial={{ scale: 0.8, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
                className="flex flex-col items-center justify-start"
              >
                {/* Level Node: Circular Stepping Stone */}
                {isLocked ? (
                  /* Locked Level Circle */
                  <div
                    className={`
                      w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 shadow-md
                      flex flex-col items-center justify-center select-none opacity-60
                      ${theme.lockedBtn}
                    `}
                  >
                    <span className="text-2xl sm:text-3xl opacity-75">🔒</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                      {displayOrder}
                    </span>
                  </div>
                ) : (
                  /* Playable / Completed Level Circle */
                  <Link href={`/play/${level.id}`} className="block focus:outline-none">
                    <motion.div
                      whileHover={{ scale: 1.08, y: -4 }}
                      whileTap={{ scale: 0.94 }}
                      className={`
                        relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 shadow-xl
                        flex flex-col items-center justify-center cursor-pointer transition-all
                        ${isNext
                          ? `${theme.activeBtn} ${theme.glowRing} animate-bounce-gentle`
                          : level.completed
                          ? theme.completedBtn
                          : 'bg-white border-slate-300 text-slate-800'
                        }
                      `}
                    >
                      {/* Floating Play Badge on Next Playable Level */}
                      {isNext && (
                        <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-yellow-400 text-yellow-950 font-black text-[10px] sm:text-xs shadow-md border border-yellow-200 animate-pulse whitespace-nowrap">
                          {isAmharic ? '▶ ጀምር' : '▶ Play'}
                        </div>
                      )}

                      {/* Level Number */}
                      <span className="text-2xl sm:text-3xl md:text-4xl font-black drop-shadow-sm leading-none">
                        {displayOrder}
                      </span>

                      {/* Earned Stars (1-3) */}
                      {level.completed && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1, 2, 3].map(s => (
                            <span
                              key={s}
                              className={`text-xs sm:text-sm ${
                                s <= level.stars ? 'text-yellow-300 drop-shadow' : 'text-black/25'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </Link>
                )}

                {/* Level Title Pill below circle */}
                <div className="mt-2 text-center w-full max-w-[110px] sm:max-w-[130px]">
                  <span
                    className={`
                      inline-block px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-extrabold truncate max-w-full
                      ${isLocked
                        ? 'text-slate-400 bg-slate-100/60'
                        : isNext
                        ? 'text-slate-800 bg-white shadow-sm border border-slate-200 font-black'
                        : 'text-slate-700 bg-white/70'
                      }
                    `}
                    title={level.title}
                  >
                    {level.title}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function WorldPage() {
  return (
    <Suspense fallback={<LoadingScreen bgClass="bg-sky-100" />}>
      <WorldContent />
    </Suspense>
  );
}
