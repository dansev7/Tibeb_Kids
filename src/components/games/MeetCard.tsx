'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameItem } from '@/types';
import { playAudioOrSpeech, playPop } from '@/utils/sound';
import { getThemeConfig } from '@/utils/theme';
import ItemVisualBadge from '@/components/ui/ItemVisualBadge';

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
      className={`h-full w-full flex flex-col items-center justify-between p-2 sm:p-4 select-none bg-gradient-to-b ${theme.lightBg} overflow-hidden`}
      style={{
        backgroundColor: themeColor && themeColor.startsWith('#') ? `${themeColor}15` : undefined,
      }}
    >
      {/* Top Header / Visual Progress dots for non-readers */}
      <header className="w-full max-w-lg flex items-center justify-between pt-1 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {items.map((_, idx) => (
            <motion.div
              key={idx}
              initial={false}
              animate={{
                scale: idx === currentIndex ? 1.3 : 1,
                opacity: idx <= currentIndex ? 1 : 0.4,
              }}
              className={`h-3.5 w-3.5 rounded-full transition-colors ${
                idx === currentIndex
                  ? 'bg-amber-400 ring-3 ring-amber-200'
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
          className="relative min-w-[56px] min-h-[56px] w-14 h-14 rounded-full bg-white shadow-lg border-3 border-amber-300 flex items-center justify-center text-2xl active:bg-amber-50 cursor-pointer"
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
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
            </span>
          )}
        </motion.button>
      </header>

      {/* Main Flashcard with scale up bounce animation */}
      <main className="w-full max-w-md flex-1 min-h-0 flex items-center justify-center py-1 overflow-hidden">
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
            className="w-full h-full max-h-[56vh] bg-white rounded-3xl shadow-xl border-4 p-4 sm:p-6 flex flex-col items-center justify-between cursor-pointer transition-shadow hover:shadow-cyan-200/50 overflow-hidden"
            style={{
              borderColor: theme.primary,
            }}
          >
            {/* Symbol - Very large and centered */}
            <div className="flex-1 flex items-center justify-center w-full py-1">
              <motion.span
                animate={isPlayingAudio ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-7xl sm:text-8xl font-black tracking-tight select-none drop-shadow-md text-slate-800 leading-none"
                style={{ color: theme.primary }}
              >
                {currentItem.symbol}
              </motion.span>
            </div>

            {/* Picture & Word Area */}
            <div className="w-full flex flex-col items-center justify-center pt-2 border-t-2 border-slate-100 mt-1 shrink-0">
              <div className="mb-1.5">
                <ItemVisualBadge
                  item={currentItem}
                  className={currentItem.kind === 'number' ? "w-28 h-28 sm:w-36 sm:h-36" : "w-24 h-24 sm:w-28 sm:h-28"}
                  emojiSize="text-6xl sm:text-7xl"
                />
              </div>

              {/* Picture Word - Large, friendly font */}
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-700 tracking-wide text-center">
                {currentItem.kind === 'fidel' ? (
                  <span className="text-3xl sm:text-4xl text-purple-700 font-black">
                    {currentItem.pictureWordAmharic || currentItem.pictureWord?.replace(/\([^)]*\)/g, '').trim()}
                  </span>
                ) : (
                  <span className="capitalize">{currentItem.pictureWord}</span>
                )}
              </div>

              {/* Tap hint for 5yo child */}
              <div className="mt-1 flex items-center gap-1 text-slate-400 text-xs font-semibold">
                <span className="text-base">👆</span>
                <span>{currentItem.kind === 'fidel' ? 'ንካ እና አዳምጥ' : 'Tap to hear'}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation: Large Next Arrow Button */}
      <footer className="w-full max-w-md h-20 flex items-center justify-center pb-2 shrink-0">
        <AnimatePresence>
          {hasViewedOrTapped && (
            <motion.button
              initial={{ scale: 0, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleNext}
              aria-label="Next item"
              className="min-w-[68px] min-h-[68px] w-18 h-18 rounded-full shadow-xl flex items-center justify-center text-white text-3xl font-black cursor-pointer border-3 border-white active:brightness-95 transition-transform"
              style={{
                backgroundColor: theme.primary,
                boxShadow: `0 10px 24px -4px ${theme.primary}88`,
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
