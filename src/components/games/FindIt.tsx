'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playAudioOrSpeech, playChime, playBoop, playPop, speakText } from '@/utils/sound';
import { getThemeConfig } from '@/utils/theme';
import { ConfettiBurst } from './ConfettiBurst';

export interface FindItProps {
  items: GameItem[];
  distractors: GameItem[];
  showHints?: boolean; // true for "we do" phase, false for quiz
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

export function FindIt({
  items,
  distractors,
  showHints = true,
  onComplete,
  themeColor,
}: FindItProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<StageResult[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [wigglingId, setWigglingId] = useState<string | null>(null);
  const [isCorrectSuccess, setIsCorrectSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isRevealingCorrect, setIsRevealingCorrect] = useState(false);
  const [selectedCorrectId, setSelectedCorrectId] = useState<string | null>(null);

  const theme = getThemeConfig(themeColor);
  const currentItem = items[currentIndex];
  const isTransitioningRef = useRef(false);

  // Prepare 3-4 options (1 target + 2-3 distractors) shuffled
  const currentOptions = useMemo(() => {
    if (!currentItem) return [];

    // Filter distractors to exclude current item
    const pool = distractors.filter((d) => d.id !== currentItem.id);

    // If pool is small, supplement from items
    if (pool.length < 2) {
      items.forEach((it) => {
        if (it.id !== currentItem.id && !pool.some((p) => p.id === it.id)) {
          pool.push(it);
        }
      });
    }

    // Pick 2-3 distractors
    const chosenDistractors = [...pool].sort(() => 0.5 - Math.random()).slice(0, 3);
    const combined = [currentItem, ...chosenDistractors];

    // Shuffle options
    return combined.sort(() => 0.5 - Math.random());
  }, [currentIndex, currentItem, distractors, items]);

  // Audio prompt playing
  const playPromptSound = useCallback(() => {
    if (!currentItem) return;
    const promptText = currentItem.kind === 'fidel'
      ? `${currentItem.symbol} ፊደልን ፈልግ!`
      : `Find the ${currentItem.displayName}!`;
    playAudioOrSpeech(currentItem.audioPath, promptText);
  }, [currentItem]);


  // Play audio when entering new question
  useEffect(() => {
    if (!currentItem) {
      if (items.length > 0 && results.length >= items.length) {
        onComplete(results);
      }
      return;
    }

    setWrongAttempts(0);
    setWigglingId(null);
    setIsCorrectSuccess(false);
    setShowConfetti(false);
    setIsRevealingCorrect(false);
    setSelectedCorrectId(null);
    isTransitioningRef.current = false;

    const timer = setTimeout(() => {
      playPromptSound();
    }, 350);

    return () => clearTimeout(timer);
  }, [currentIndex, currentItem, items.length, onComplete, playPromptSound, results]);

  // Move to next item or finish stage
  const advanceToNext = useCallback(
    (stageResult: StageResult) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      const updatedResults = [...results, stageResult];
      setResults(updatedResults);

      setTimeout(() => {
        if (currentIndex < items.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          onComplete(updatedResults);
        }
      }, 1200);
    },
    [currentIndex, items.length, onComplete, results]
  );

  // Handle clicking an option card
  const handleCardClick = (option: GameItem) => {
    if (isTransitioningRef.current || isCorrectSuccess || isRevealingCorrect) return;

    if (option.id === currentItem.id) {
      // Correct!
      setSelectedCorrectId(option.id);
      setIsCorrectSuccess(true);
      setShowConfetti(true);
      playChime();

      if (currentItem.kind === 'fidel') {
        const amharicCheers = ['ጎበዝ!', 'ድንቅ ነው!', 'ትክክል!', 'በጣም ጥሩ!'];
        const cheer = amharicCheers[Math.floor(Math.random() * amharicCheers.length)];
        setTimeout(() => speakText(cheer), 300);
      }

      const stageResult: StageResult = {
        itemId: currentItem.id,
        correct: true,
        usedHint: showHints || wrongAttempts > 0,
        firstTry: wrongAttempts === 0,
      };

      advanceToNext(stageResult);
    } else {
      // Gentle wrong feedback: soft boop, soft wiggle, no failure screen
      playBoop();
      setWigglingId(option.id);
      const newAttempts = wrongAttempts + 1;
      setWrongAttempts(newAttempts);

      if (currentItem.kind === 'fidel') {
        setTimeout(() => speakText('እንደገና ሞክር!'), 300);
      }

      // Stop wiggle animation after 400ms
      setTimeout(() => {
        setWigglingId(null);
      }, 450);

      // After 2 wrong attempts on same item, show the correct answer highlighted, then move on
      if (newAttempts >= 2) {
        setIsRevealingCorrect(true);
        setSelectedCorrectId(currentItem.id);

        // Highlight correct answer and speak it
        setTimeout(() => {
          playAudioOrSpeech(
            currentItem.audioPath,
            currentItem.kind === 'fidel'
              ? `ይኸው ${currentItem.symbol} ፊደል!`
              : `Here it is! ${currentItem.displayName}`
          );
        }, 300);

        const stageResult: StageResult = {
          itemId: currentItem.id,
          correct: false,
          usedHint: true,
          firstTry: false,
        };

        // Advance after child observes the correct card
        setTimeout(() => {
          advanceToNext(stageResult);
        }, 1800);
      }
    }
  };

  if (!currentItem) {
    return null;
  }

  // Determine if hint glow should be shown on the correct card
  // First attempt glow/pulse if showHints is true, OR if 2 wrong attempts triggered reveal
  const shouldHintGlow = (itemId: string) => {
    if (itemId !== currentItem.id) return false;
    if (isRevealingCorrect) return true;
    if (showHints && wrongAttempts === 0 && !isCorrectSuccess) return true;
    return false;
  };

  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-between p-3 sm:p-5 select-none bg-gradient-to-b ${theme.lightBg} overflow-hidden`}
      style={{
        backgroundColor: themeColor && themeColor.startsWith('#') ? `${themeColor}15` : undefined,
      }}
    >
      <ConfettiBurst active={showConfetti} count={40} />

      {/* Top Header: Visual progress dots + Sound prompt button */}
      <header className="w-full max-w-lg flex items-center justify-between pt-2 pb-2">
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

        {/* Audio speaker button to repeat prompt */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            playPop();
            playPromptSound();
          }}
          aria-label="Repeat instruction"
          className="min-w-[64px] min-h-[64px] w-16 h-16 rounded-full bg-white shadow-lg border-4 border-amber-300 flex items-center justify-center text-3xl active:bg-amber-50 cursor-pointer"
        >
          🔊
        </motion.button>
      </header>

      {/* Question Prompt Bar */}
      <section className="w-full max-w-lg my-2 flex flex-col items-center justify-center">
        <motion.div
          key={currentItem.id}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          onClick={() => {
            playPop();
            playPromptSound();
          }}
          className="bg-white/90 backdrop-blur-sm rounded-3xl border-4 px-6 py-4 shadow-xl flex items-center justify-center gap-4 cursor-pointer active:scale-98 transition-transform"
          style={{ borderColor: theme.primary }}
        >
          {currentItem.kind === 'fidel' ? (
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="text-5xl sm:text-6xl font-black px-5 py-1 rounded-2xl bg-purple-100 text-purple-700 border-2 border-purple-300 shadow-sm"
              >
                {currentItem.symbol}
              </motion.span>
              <span className="text-2xl sm:text-3xl font-black text-slate-800">
                ፊደልን ፈልግ
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-700">
                Find the
              </span>
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="text-5xl sm:text-6xl font-black px-4 py-1 rounded-2xl bg-amber-100 text-amber-600 border-2 border-amber-300 shadow-sm"
              >
                {currentItem.symbol}
              </motion.span>
            </div>
          )}
        </motion.div>
      </section>

      {/* 3-4 Large Answer Cards */}
      <main className="w-full max-w-xl flex-1 flex items-center justify-center py-4">
        <div
          className={`w-full grid gap-4 sm:gap-6 ${
            currentOptions.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          <AnimatePresence mode="popLayout">
            {currentOptions.map((option) => {
              const isWiggling = wigglingId === option.id;
              const isSelectedCorrect = selectedCorrectId === option.id;
              const hintGlowing = shouldHintGlow(option.id);

              return (
                <motion.button
                  key={option.id}
                  layout
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{
                    scale: isSelectedCorrect ? 1.08 : 1,
                    opacity: 1,
                    x: isWiggling ? [-10, 10, -8, 8, -4, 4, 0] : 0,
                  }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{
                    scale: { type: 'spring', stiffness: 350, damping: 15 },
                    opacity: { duration: 0.2 },
                    x: isWiggling ? { duration: 0.45, ease: 'easeInOut' } : { duration: 0 },
                  }}

                  whileHover={!isTransitioningRef.current ? { scale: 1.04 } : undefined}
                  whileTap={!isTransitioningRef.current ? { scale: 0.94 } : undefined}
                  onClick={() => handleCardClick(option)}
                  aria-label={`Option ${option.symbol}`}
                  className={`relative min-h-[140px] sm:min-h-[180px] rounded-3xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all border-4 bg-white shadow-xl ${
                    isSelectedCorrect
                      ? 'border-emerald-500 bg-emerald-50 shadow-emerald-200/80 ring-8 ring-emerald-300/60'
                      : hintGlowing
                      ? 'border-amber-400 bg-amber-50/70 shadow-amber-200 ring-4 ring-amber-300 animate-pulse'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={{
                    minWidth: '64px',
                  }}
                >
                  {/* Symbol in Answer Card */}
                  <span
                    className={`text-6xl sm:text-7xl md:text-8xl font-black tracking-tight select-none ${
                      isSelectedCorrect
                        ? 'text-emerald-600'
                        : hintGlowing
                        ? 'text-amber-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {option.symbol}
                  </span>

                  {/* Gentle checkmark celebration badge for correct selection */}
                  {isSelectedCorrect && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-bold border-2 border-white shadow-md"
                    >
                      ✓
                    </motion.div>
                  )}

                  {/* Gentle glow ripple hint indicator */}
                  {hintGlowing && !isSelectedCorrect && (
                    <motion.span
                      animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="absolute -top-2 -right-2 text-2xl"
                    >
                      ✨
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {/* Gentle Bottom Helper */}
      <footer className="w-full max-w-lg h-16 flex items-center justify-center">
        <span className="text-slate-400 font-medium text-sm flex items-center gap-1.5">
          <span>👆</span>
          <span>
            {currentItem.kind === 'fidel' ? 'ትክክለኛውን ፊደል ምረጥ' : 'Tap the matching card'}
          </span>
        </span>
      </footer>
    </div>
  );
}

export default FindIt;
