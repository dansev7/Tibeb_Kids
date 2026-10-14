'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface LevelInfo {
  id: string;
  order: number;
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

const mascotEmojis: Record<string, string> = {
  bird: '🐦',
  cow: '🐄',
  lion: '🦁',
};

const worldGradients: Record<string, string> = {
  'abc-garden': 'from-emerald-200 via-green-100 to-sky-100',
  'number-farm': 'from-amber-200 via-orange-100 to-sky-100',
  'fidel-village': 'from-purple-200 via-violet-100 to-sky-100',
};

const worldThemeStyles: Record<string, {
  activeBtn: string;
  completedBtn: string;
  lockedBtn: string;
  glowRing: string;
  pillBorder: string;
}> = {
  'abc-garden': {
    activeBtn: 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-400/50',
    completedBtn: 'bg-emerald-600 border-emerald-700 text-white shadow-emerald-300/40',
    lockedBtn: 'bg-slate-200 border-slate-300 text-slate-400',
    glowRing: 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-green-100',
    pillBorder: 'border-emerald-300',
  },
  'number-farm': {
    activeBtn: 'bg-amber-500 border-amber-600 text-white shadow-amber-400/50',
    completedBtn: 'bg-amber-600 border-amber-700 text-white shadow-amber-300/40',
    lockedBtn: 'bg-slate-200 border-slate-300 text-slate-400',
    glowRing: 'ring-4 ring-amber-400 ring-offset-4 ring-offset-amber-100',
    pillBorder: 'border-amber-300',
  },
  'fidel-village': {
    activeBtn: 'bg-purple-500 border-purple-600 text-white shadow-purple-400/50',
    completedBtn: 'bg-purple-600 border-purple-700 text-white shadow-purple-300/40',
    lockedBtn: 'bg-slate-200 border-slate-300 text-slate-400',
    glowRing: 'ring-4 ring-purple-400 ring-offset-4 ring-offset-purple-100',
    pillBorder: 'border-purple-300',
  },
};

function WorldContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [world, setWorld] = useState<WorldData | null>(null);
  const [loading, setLoading] = useState(true);

  const isAmharicWorld = slug === 'fidel-village';

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/worlds/${slug}`)
      .then(res => res.json())
      .then(data => {
        setWorld(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl"
        >
          ⭐
        </motion.div>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-100">
        <p className="text-2xl text-gray-400 font-bold">World not found</p>
      </div>
    );
  }

  // Find the next playable level (first unlocked but not completed, or first unlocked)
  const nextPlayableIndex = world.levels.findIndex(l => l.unlocked && !l.completed);
  const nextPlayableId = nextPlayableIndex >= 0 ? world.levels[nextPlayableIndex].id : null;

  const totalEarnedStars = world.levels.reduce((acc, l) => acc + (l.stars || 0), 0);
  const theme = worldThemeStyles[slug] || worldThemeStyles['abc-garden'];

  return (
    <div className={`min-h-screen bg-gradient-to-b ${worldGradients[slug] || 'from-sky-200 to-sky-100'} relative pb-20`}>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => router.push('/')}
            className="w-14 h-14 rounded-2xl bg-white shadow-md border-2 border-gray-200 flex items-center justify-center text-2xl cursor-pointer hover:bg-gray-50 transition-colors"
            aria-label={isAmharicWorld ? 'ወደ ዋና ገጽ ተመለስ' : 'Back to home map'}
          >
            🏠
          </motion.button>

          <div className="text-center flex-1 mx-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 drop-shadow-sm flex items-center justify-center gap-2">
              <span>{world.emoji}</span>
              <span>{world.title}</span>
            </h1>
            <div className="text-xs sm:text-sm font-bold text-gray-600 mt-0.5">
              {isAmharicWorld
                ? `⭐ ${totalEarnedStars} ኮከቦች ተሰብስበዋል`
                : `⭐ ${totalEarnedStars} stars earned`}
            </div>
          </div>

          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="text-4xl sm:text-5xl"
          >
            {mascotEmojis[world.mascot] || '⭐'}
          </motion.div>
        </div>
      </header>

      {/* Levels Rows and Columns Grid */}
      <main className="max-w-4xl mx-auto px-4 pt-8">
        {/* Responsive Grid: 3 cols on mobile, 4 on tablet, 5 on desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-y-8 gap-x-4 sm:gap-x-6">
          {world.levels.map((level, index) => {
            const isNext = level.id === nextPlayableId;
            const isLocked = !level.unlocked;

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
                      {level.order}
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
                          {isAmharicWorld ? '▶ ጀምር' : '▶ Play'}
                        </div>
                      )}

                      {/* Level Number */}
                      <span className="text-2xl sm:text-3xl md:text-4xl font-black drop-shadow-sm leading-none">
                        {level.order}
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-sky-100">
          <div className="text-6xl animate-spin">⭐</div>
        </div>
      }
    >
      <WorldContent />
    </Suspense>
  );
}
