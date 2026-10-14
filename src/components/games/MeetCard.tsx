'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameItem } from '@/types';
import { playAudioOrSpeech, playPop } from '@/utils/sound';
import { getThemeConfig } from '@/utils/theme';

export interface MeetCardProps {
  items: GameItem[];
  onComplete: () => void;
  themeColor?: string;
}

export function MeetCard({ items, onComplete, themeColor }: MeetCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [hasViewedOrTapped, setHasViewedOrTapped] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const theme = getThemeConfig(themeColor);
  const currentItem = items[currentIndex];

  // Play audio for the current item (both symbol and picture word)
  const playItemSound = useCallback(() => {
    if (!currentItem) return;

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    setIsPlayingAudio(true);
    const isFidel = currentItem.kind === 'fidel';
    const amharicWord = currentItem.pictureWordAmharic || currentItem.pictureWord?.replace(/\([^)]*\)/g, '').trim();
    const speechFallback = isFidel
      ? `${currentItem.symbol}. ${amharicWord}`
      : `${currentItem.displayName}. ${currentItem.pictureWord}`;

    activeAudioRef.current = playAudioOrSpeech(
      currentItem.audioPath,
      speechFallback,
      () => {
        setIsPlayingAudio(false);
      }
    );


    // If audio is not natively playing (or completes instantly), reset indicator
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 2200);
  }, [currentItem]);

  // Auto-play audio when item changes
  useEffect(() => {
    if (!currentItem) {
      if (items.length > 0) {
        onComplete();
      }
      return;
    }

    setImgError(false);
    setHasViewedOrTapped(false);

    // Small delay so card entry animation begins first
    const autoPlayTimer = setTimeout(() => {
      playItemSound();
    }, 450);

    // Auto-reveal Next button after child has viewed the card for a short moment
    const viewTimer = setTimeout(() => {
      setHasViewedOrTapped(true);
    }, 1200);

    return () => {
      clearTimeout(autoPlayTimer);
      clearTimeout(viewTimer);
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, [currentIndex, currentItem, items.length, onComplete, playItemSound]);

  const handleCardTap = () => {
    setHasViewedOrTapped(true);
    playPop();
    playItemSound();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    playPop();

    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  if (!currentItem) {
    return null;
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-6 select-none bg-gradient-to-b ${theme.lightBg}`}
      style={{
        backgroundColor: themeColor && themeColor.startsWith('#') ? `${themeColor}15` : undefined,
      }}
    >
      {/* Top Header / Visual Progress dots for non-readers */}
      <header className="w-full max-w-lg flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-2">
          {items.map((_, idx) => (
            <motion.div
              key={idx}
              initial={false}
              animate={{
                scale: idx === currentIndex ? 1.3 : 1,
                opacity: idx <= currentIndex ? 1 : 0.4,
              }}
              className={`h-4 w-4 rounded-full transition-colors ${
                idx === currentIndex
                  ? 'bg-amber-400 ring-4 ring-amber-200'
                  : idx < currentIndex
                  ? 'bg-emerald-500'
                  : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Audio speaker button (re-plays sound anytime) */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={(e) => {
            e.stopPropagation();
            handleCardTap();
          }}
          aria-label="Play sound"
          className="relative min-w-[64px] min-h-[64px] w-16 h-16 rounded-full bg-white shadow-lg border-4 border-amber-300 flex items-center justify-center text-3xl active:bg-amber-50 cursor-pointer"
        >
          <motion.span
            animate={
              isPlayingAudio
                ? { scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] }
                : { scale: 1 }
            }
            transition={{ repeat: isPlayingAudio ? Infinity : 0, duration: 0.6 }}
          >
            🔊
          </motion.span>
          {isPlayingAudio && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
            </span>
          )}
        </motion.button>
      </header>

      {/* Main Flashcard with scale up bounce animation */}
      <main className="w-full max-w-md flex-1 flex items-center justify-center py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id || currentIndex}
            initial={{ scale: 0.4, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0, rotate: 4 }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 20,
              bounce: 0.5,
            }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCardTap}
            className="w-full bg-white rounded-3xl shadow-2xl border-4 p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-shadow hover:shadow-cyan-200/50"
            style={{
              borderColor: theme.primary,
              minHeight: '420px',
            }}
          >
            {/* Symbol - Very large and centered */}
            <div className="flex-1 flex items-center justify-center w-full py-4">
              <motion.span
                animate={isPlayingAudio ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-8xl sm:text-9xl font-black tracking-tight select-none drop-shadow-md text-slate-800"
                style={{ color: theme.primary }}
              >
                {currentItem.symbol}
              </motion.span>
            </div>

            {/* Picture & Word Area */}
            <div className="w-full flex flex-col items-center justify-center pt-4 border-t-2 border-slate-100 mt-2">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-amber-50/80 flex items-center justify-center overflow-hidden border-2 border-amber-200 shadow-inner mb-3">
                {currentItem.picturePath && !imgError ? (
                  <img
                    src={currentItem.picturePath}
                    alt={currentItem.pictureWord}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-6xl sm:text-7xl select-none" role="img" aria-label={currentItem.pictureWord}>
                    {/* Visual fallback icon representation */}
                    🎨
                  </span>
                )}
              </div>

              {/* Picture Word - Large, friendly font */}
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-700 tracking-wide text-center">
                {currentItem.kind === 'fidel' ? (
                  <span className="text-4xl sm:text-5xl text-purple-700 font-black">
                    {currentItem.pictureWordAmharic || currentItem.pictureWord?.replace(/\([^)]*\)/g, '').trim()}
                  </span>
                ) : (
                  <span className="capitalize">{currentItem.pictureWord}</span>
                )}
              </div>

              {/* Tap hint for 5yo child */}
              <div className="mt-3 flex items-center gap-1.5 text-slate-400 text-sm font-semibold">
                <span className="text-lg">👆</span>
                <span>{currentItem.kind === 'fidel' ? 'ንካ እና አዳምጥ' : 'Tap to hear'}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation: Large Next Arrow Button */}
      <footer className="w-full max-w-md h-24 flex items-center justify-center pb-4">
        <AnimatePresence>
          {hasViewedOrTapped && (
            <motion.button
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleNext}
              aria-label="Next item"
              className="min-w-[80px] min-h-[80px] w-20 h-20 rounded-full shadow-2xl flex items-center justify-center text-white text-4xl font-black cursor-pointer border-4 border-white active:brightness-95 transition-transform"
              style={{
                backgroundColor: theme.primary,
                boxShadow: `0 12px 28px -6px ${theme.primary}88`,
              }}
            >
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              >
                ➔
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}

export default MeetCard;
