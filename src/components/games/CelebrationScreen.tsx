'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { playAudioOrSpeech, playFanfare, playPop } from '@/utils/sound';
import { getThemeConfig } from '@/utils/theme';
import { isAmharicWorld, mascotEmoji } from '@/lib/worldTheme';
import { ConfettiBurst } from './ConfettiBurst';

export interface CelebrationScreenProps {
  stars: number; // 1, 2, or 3
  mascot: string;
  worldSlug?: string;
  onNext: () => void;
  themeColor?: string;
}

// Playful child-friendly sticker rewards
const STICKERS = [
  { emoji: '🦄', label: 'Magical Unicorn' },
  { emoji: '🚀', label: 'Space Rocket' },
  { emoji: '🌈', label: 'Bright Rainbow' },
  { emoji: '🦖', label: 'Happy Dino' },
  { emoji: '🍦', label: 'Yummy Treat' },
  { emoji: '👑', label: 'Super Star' },
  { emoji: '🎨', label: 'Master Artist' },
  { emoji: '🦁', label: 'Brave Explorer' },
  { emoji: '🐬', label: 'Friendly Dolphin' },
  { emoji: '🎸', label: 'Rockstar' },
];

const AMHARIC_STICKER_LABELS: Record<string, string> = {
  '🦄': 'ድንቅ ዩኒኮርን',
  '🚀': 'የጠፈር ሮኬት',
  '🌈': 'ቀስተ ደመና',
  '🦖': 'ደስተኛ ዲኖ',
  '🍦': 'ጣፋጭ አይስክሬም',
  '👑': 'ታላቅ ኮከብ',
  '🎨': 'ብልህ ሠዓሊ',
  '🦁': 'ጀግና አንበሳ',
  '🐬': 'ወዳጅ ዶልፊን',
  '🎸': 'ተወዳጅ ጊታር',
};

export function CelebrationScreen({
  stars,
  mascot,
  worldSlug,
  onNext,
  themeColor,
}: CelebrationScreenProps) {
  // Component is client-only (dynamic ssr:false), so picking a random
  // sticker during state init is safe and avoids an extra render pass.
  const [earnedSticker] = useState<{ emoji: string; label: string }>(
    () => STICKERS[Math.floor(Math.random() * STICKERS.length)],
  );
  const theme = getThemeConfig(themeColor);
  // Language follows the world; falls back to the lion mascot for older callers.
  const isAmharic = worldSlug ? isAmharicWorld(worldSlug) : mascot === 'lion';

  // Clamp stars between 1 and 3
  const starCount = Math.max(1, Math.min(3, Math.round(stars || 1)));

  // Celebration fanfare and spoken cheer
  useEffect(() => {
    playFanfare();
    const cheer = isAmharic ? 'እንኳን ደስ አለህ! ድንቅ ሥራ! በጣም ጎበዝ!' : 'You did it! Amazing job!';
    const cheerTimer = setTimeout(() => {
      playAudioOrSpeech(undefined, cheer);
    }, 600);

    return () => clearTimeout(cheerTimer);
  }, [isAmharic]);

  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-between p-3 sm:p-5 select-none bg-gradient-to-b ${theme.lightBg} relative overflow-hidden`}
      style={{
        backgroundColor: themeColor && themeColor.startsWith('#') ? `${themeColor}15` : undefined,
      }}
    >
      {/* Massive Over-the-Top Confetti Burst */}
      <ConfettiBurst active={true} count={75} />

      {/* Top Floating Cheers */}
      <header className="w-full max-w-md pt-2 flex flex-col items-center shrink-0">
        <motion.div
          initial={{ scale: 0.2, opacity: 0, y: -40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 15 }}
          className="text-center"
        >
          <span className="text-3xl sm:text-4xl font-black text-amber-500 tracking-tight drop-shadow-sm flex items-center justify-center gap-2">
            <span>🎉</span>
            <span>{isAmharic ? 'ጎበዝ! ድንቅ ሥራ!' : 'You did it!'}</span>
            <span>✨</span>
          </span>
        </motion.div>

        {/* Stars Animation: 1 to 3 stars animating in sequentially */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 mt-2">
          {[1, 2, 3].map((starIdx) => {
            const isEarned = starIdx <= starCount;
            return (
              <motion.div
                key={starIdx}
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{
                  scale: isEarned ? 1 : 0.9,
                  rotate: 0,
                  opacity: 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 280,
                  damping: 14,
                  delay: 0.35 + starIdx * 0.25,
                }}
                className="relative"
              >
                {isEarned ? (
                  <motion.div
                    animate={{
                      scale: [1, 1.12, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      delay: starIdx * 0.3,
                      ease: 'easeInOut',
                    }}
                    className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center drop-shadow-lg"
                  >
                    <svg viewBox="0 0 24 24" className="w-full h-full fill-amber-400 stroke-amber-500 stroke-1">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </motion.div>
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center opacity-30">
                    <svg viewBox="0 0 24 24" className="w-full h-full fill-slate-300 stroke-slate-400 stroke-1">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </header>

      {/* Mascot Celebration Dance Stage */}
      <main className="w-full max-w-md flex-1 min-h-0 flex flex-col items-center justify-center py-1 overflow-hidden">
        <motion.div
          initial={{ scale: 0.6, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          className="relative flex flex-col items-center"
        >
          {/* Mascot animated dance */}
          <motion.div
            animate={{
              y: [0, -16, 0],
              rotate: [-4, 5, -4],
              scale: [1, 1.05, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.1,
              ease: 'easeInOut',
            }}
            className="w-36 h-36 sm:w-44 sm:h-44 max-h-[28vh] filter drop-shadow-2xl cursor-pointer"
            onClick={() => {
              playPop();
              playAudioOrSpeech(undefined, 'Hooray! Great job!');
            }}
          >
            {mascot === 'bird' && <BirdMascot />}
            {mascot === 'cow' && <CowMascot />}
            {mascot === 'lion' && <LionMascot />}
            {!['bird', 'cow', 'lion'].includes(mascot) && (
              <div className="w-full h-full flex items-center justify-center text-[90px] sm:text-[110px] leading-none drop-shadow-2xl">
                {mascotEmoji(mascot)}
              </div>
            )}
          </motion.div>

          {/* Dancing shadow underneath */}
          <motion.div
            animate={{
              scale: [1, 0.75, 1],
              opacity: [0.35, 0.2, 0.35],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.1,
              ease: 'easeInOut',
            }}
            className="w-28 h-4 rounded-full bg-slate-900/20 blur-xs mt-1"
          />

          {/* Sticker Earned Badge */}
          {earnedSticker && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: 15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 14 }}
              className="mt-2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl border-3 border-amber-300 shadow-lg flex items-center gap-2.5"
            >
              <span className="text-3xl animate-bounce">{earnedSticker.emoji}</span>
              <div className="flex flex-col text-left">
                <span className="text-[11px] uppercase font-black text-amber-500 tracking-wider">
                  {isAmharic ? 'አዲስ ስቲከር!' : 'New Sticker!'}
                </span>
                <span className="text-base font-extrabold text-slate-800">
                  {isAmharic
                    ? (AMHARIC_STICKER_LABELS[earnedSticker.emoji] || earnedSticker.label)
                    : earnedSticker.label}
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Footer Navigation: Large Next / Map Button */}
      <footer className="w-full max-w-md pb-4 pt-1 flex items-center justify-center shrink-0">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playPop();
            onNext();
          }}
          aria-label={isAmharic ? 'ወደ መንደሩ ተመለስ' : 'Continue to world map'}
          className="min-w-[64px] min-h-[64px] px-9 py-3 rounded-full shadow-xl flex items-center justify-center gap-3 text-white text-2xl font-black cursor-pointer border-4 border-white transition-transform active:brightness-95"
          style={{
            backgroundColor: theme.primary,
            boxShadow: `0 10px 24px -3px ${theme.primary}99`,
          }}
        >
          <motion.span
            animate={{ x: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          >
            ➔
          </motion.span>
        </motion.button>
      </footer>
    </div>
  );
}

// Child-friendly Animated Mascot: Cheerful Blue & Yellow Bird
function BirdMascot() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Party Hat */}
      <polygon points="100,10 80,60 120,60" fill="#F59E0B" stroke="#D97706" strokeWidth="3" />
      <circle cx="100" cy="10" r="8" fill="#EC4899" />
      <circle cx="95" cy="35" r="4" fill="#3B82F6" />
      <circle cx="105" cy="45" r="3.5" fill="#10B981" />

      {/* Bird Body */}
      <circle cx="100" cy="115" r="58" fill="#38BDF8" stroke="#0284C7" strokeWidth="4" />
      {/* Tummy */}
      <ellipse cx="100" cy="128" rx="40" ry="36" fill="#FEF08A" />

      {/* Eyes with cheerful spark */}
      <circle cx="82" cy="105" r="9" fill="#1E293B" />
      <circle cx="80" cy="102" r="3" fill="#FFFFFF" />
      <circle cx="118" cy="105" r="9" fill="#1E293B" />
      <circle cx="116" cy="102" r="3" fill="#FFFFFF" />

      {/* Rosy Cheeks */}
      <circle cx="68" cy="120" r="7" fill="#F472B6" opacity="0.6" />
      <circle cx="132" cy="120" r="7" fill="#F472B6" opacity="0.6" />

      {/* Orange Beak */}
      <polygon points="100,108 88,118 112,118" fill="#F97316" stroke="#EA580C" strokeWidth="2" />

      {/* Flapping Wings */}
      <motion.ellipse
        cx="44"
        cy="115"
        rx="18"
        ry="28"
        fill="#0284C7"
        animate={{ rotate: [-20, 25, -20] }}
        transition={{ repeat: Infinity, duration: 0.4 }}
        style={{ originX: '55px', originY: '115px' }}
      />
      <motion.ellipse
        cx="156"
        cy="115"
        rx="18"
        ry="28"
        fill="#0284C7"
        animate={{ rotate: [20, -25, 20] }}
        transition={{ repeat: Infinity, duration: 0.4 }}
        style={{ originX: '145px', originY: '115px' }}
      />

      {/* Little Feet */}
      <ellipse cx="85" cy="173" rx="10" ry="5" fill="#F97316" />
      <ellipse cx="115" cy="173" rx="10" ry="5" fill="#F97316" />
    </svg>
  );
}

// Child-friendly Animated Mascot: Friendly Cow
function CowMascot() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Little Horns */}
      <path d="M65,55 Q50,30 75,40" fill="#FBBF24" stroke="#D97706" strokeWidth="3" />
      <path d="M135,55 Q150,30 125,40" fill="#FBBF24" stroke="#D97706" strokeWidth="3" />

      {/* Ears */}
      <ellipse cx="45" cy="75" rx="18" ry="10" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
      <ellipse cx="45" cy="75" rx="10" ry="5" fill="#F472B6" />
      <ellipse cx="155" cy="75" rx="18" ry="10" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
      <ellipse cx="155" cy="75" rx="10" ry="5" fill="#F472B6" />

      {/* Cow Body/Head */}
      <circle cx="100" cy="110" r="58" fill="#FFFFFF" stroke="#0F172A" strokeWidth="4" />

      {/* Cow Spots */}
      <path d="M70,75 Q90,65 85,90 Q65,100 70,75 Z" fill="#0F172A" />
      <path d="M125,75 Q145,85 135,105 Q115,95 125,75 Z" fill="#0F172A" />

      {/* Big Cheerful Eyes */}
      <circle cx="80" cy="98" r="8" fill="#0F172A" />
      <circle cx="78" cy="95" r="3" fill="#FFFFFF" />
      <circle cx="120" cy="98" r="8" fill="#0F172A" />
      <circle cx="118" cy="95" r="3" fill="#FFFFFF" />

      {/* Soft Pink Muzzle */}
      <ellipse cx="100" cy="132" rx="42" ry="26" fill="#FBCFE8" stroke="#F472B6" strokeWidth="3" />
      {/* Nostrils */}
      <ellipse cx="90" cy="130" rx="4" ry="6" fill="#BE185D" />
      <ellipse cx="110" cy="130" rx="4" ry="6" fill="#BE185D" />
      {/* Smile */}
      <path d="M92,142 Q100,150 108,142" stroke="#BE185D" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Golden Bell Ribbon */}
      <rect x="80" y="162" width="40" height="10" rx="4" fill="#EF4444" />
      <circle cx="100" cy="174" r="8" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
    </svg>
  );
}

// Child-friendly Animated Mascot: Brave Smiling Lion
function LionMascot() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Fluffy Golden Mane */}
      <circle cx="100" cy="105" r="66" fill="#F59E0B" stroke="#D97706" strokeWidth="4" />
      {/* Mane Petals / Fluff */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 100 + Math.cos(rad) * 64;
        const cy = 105 + Math.sin(rad) * 64;
        return <circle key={i} cx={cx} cy={cy} r="18" fill="#F59E0B" />;
      })}

      {/* Golden Crown */}
      <polygon points="100,22 80,45 88,40 100,32 112,40 120,45" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
      <circle cx="100" cy="22" r="4" fill="#EF4444" />
      <circle cx="80" cy="45" r="3" fill="#3B82F6" />
      <circle cx="120" cy="45" r="3" fill="#10B981" />

      {/* Lion Face */}
      <circle cx="100" cy="108" r="48" fill="#FDE68A" stroke="#D97706" strokeWidth="3" />

      {/* Ears */}
      <circle cx="62" cy="70" r="14" fill="#F59E0B" />
      <circle cx="62" cy="70" r="8" fill="#FDE68A" />
      <circle cx="138" cy="70" r="14" fill="#F59E0B" />
      <circle cx="138" cy="70" r="8" fill="#FDE68A" />

      {/* Eyes */}
      <circle cx="84" cy="102" r="8" fill="#1E293B" />
      <circle cx="82" cy="99" r="3" fill="#FFFFFF" />
      <circle cx="116" cy="102" r="8" fill="#1E293B" />
      <circle cx="114" cy="99" r="3" fill="#FFFFFF" />

      {/* Rosy Cheeks */}
      <circle cx="72" cy="115" r="6" fill="#F472B6" opacity="0.6" />
      <circle cx="128" cy="115" r="6" fill="#F472B6" opacity="0.6" />

      {/* Cute Brown Nose & Smile */}
      <polygon points="100,118 94,112 106,112" fill="#78350F" />
      <path d="M93,124 Q100,132 107,124" stroke="#78350F" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Whiskers */}
      <line x1="68" y1="120" x2="52" y2="118" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
      <line x1="68" y1="124" x2="54" y2="127" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
      <line x1="132" y1="120" x2="148" y2="118" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
      <line x1="132" y1="124" x2="146" y2="127" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default CelebrationScreen;
