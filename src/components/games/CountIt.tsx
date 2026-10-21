'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playFeedbackTone, playAudioOrSpeech } from '@/utils/sound';
import SpeakerButton from '@/components/ui/SpeakerButton';

interface CountItProps {
  items: GameItem[]; // Target numbers
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

const objectEmojis = ['🥭', '🐄', '🍎', '⚽', '🐑', '🌟', '🥕', '🐥'];

export default function CountIt({
  items,
  onComplete,
  themeColor = '#FF9800',
}: CountItProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countedIndices, setCountedIndices] = useState<number[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [results, setResults] = useState<StageResult[]>([]);
  const [attemptsOnItem, setAttemptsOnItem] = useState(0);

  const currentItem = items[currentIndex];
  const rawCount = parseInt(currentItem?.symbol || '1', 10);
  const targetCount = isNaN(rawCount) ? 1 : Math.max(0, rawCount);
  const emoji = objectEmojis[currentIndex % objectEmojis.length];

  const playPrompt = useCallback(() => {
    if (!currentItem) return;
    const prompt = targetCount === 0
      ? `How many in the basket? Zero! Tap the number zero!`
      : `How many? Count and tap the number!`;
    playAudioOrSpeech(
      currentItem.audioPath,
      prompt
    );
  }, [currentItem, targetCount]);

  useEffect(() => {
    playPrompt();
    setCountedIndices([]);
    setAttemptsOnItem(0);
  }, [currentIndex, playPrompt]);

  // Generate 4 choice numbers including correct one (guaranteed non-infinite)
  const choices = React.useMemo(() => {
    const set = new Set<number>([targetCount]);
    const candidates = [
      targetCount - 1,
      targetCount + 1,
      targetCount + 2,
      targetCount - 2,
      targetCount + 3,
      targetCount + 4,
      0, 1, 2, 3, 4, 5
    ].filter((n) => n >= 0 && n !== targetCount);

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    for (const num of shuffled) {
      set.add(num);
      if (set.size === 4) break;
    }

    let fallback = 0;
    while (set.size < 4) {
      set.add(fallback++);
    }

    return Array.from(set).sort(() => Math.random() - 0.5);
  }, [targetCount]);

  const handleTapObject = (idx: number) => {
    if (!countedIndices.includes(idx)) {
      const next = [...countedIndices, idx];
      setCountedIndices(next);
      playFeedbackTone('pop');
      playAudioOrSpeech('', `${next.length}`);
    }
  };

  const handleSelectNumber = (chosenNum: number) => {
    const isCorrect = chosenNum === targetCount;

    if (isCorrect) {
      playFeedbackTone('correct');

      const result: StageResult = {
        itemId: currentItem.id,
        correct: true,
        usedHint: attemptsOnItem > 0,
        firstTry: attemptsOnItem === 0,
      };

      const nextResults = [...results, result];
      setResults(nextResults);

      setTimeout(() => {
        if (currentIndex + 1 < items.length) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onComplete(nextResults);
        }
      }, 1000);
    } else {
      playFeedbackTone('wrong');
      setWrongId(String(chosenNum));
      setAttemptsOnItem(prev => prev + 1);
      setTimeout(() => setWrongId(null), 500);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 max-w-xl mx-auto select-none">
      {/* Top instruction */}
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center gap-3">
          <SpeakerButton
            audioPath=""
            fallbackSpeech={
              targetCount === 0
                ? "How many in the basket? Zero! Tap the number zero!"
                : "Count the objects and tap the number!"
            }
            size="md"
          />
          <span className="text-2xl font-extrabold text-amber-800">
            How many?
          </span>
        </div>
        <span className="text-xl font-bold text-gray-400">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* Objects pasture/area */}
      <div className="w-full min-h-[220px] bg-amber-50 rounded-3xl p-6 border-4 border-amber-200 shadow-inner flex flex-wrap items-center justify-center gap-4">
        {targetCount === 0 ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-4 text-center select-none"
          >
            <span className="text-7xl md:text-8xl mb-2 drop-shadow-sm">🧺</span>
            <span className="text-2xl md:text-3xl font-black text-amber-800">
              Empty Basket!
            </span>
            <span className="text-base font-bold text-amber-600 mt-1">
              Zero (0) items inside
            </span>
          </motion.div>
        ) : (
          Array.from({ length: targetCount }).map((_, idx) => {
            const isCounted = countedIndices.includes(idx);
            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.8 }}
                onClick={() => handleTapObject(idx)}
                className={`relative text-5xl md:text-6xl p-3 rounded-2xl transition-all ${
                  isCounted
                    ? 'bg-amber-200/80 scale-105 shadow-md'
                    : 'bg-white shadow hover:scale-105'
                }`}
              >
                {emoji}
                {isCounted && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">
                    ✓
                  </span>
                )}
              </motion.button>
            );
          })
        )}
      </div>

      {/* Number Answer Choices */}
      <div className="grid grid-cols-4 gap-3 w-full mt-6">
        {choices.map((num) => {
          const isWiggle = wrongId === String(num);
          return (
            <motion.button
              key={num}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectNumber(num)}
              className={`
                h-20 md:h-24 rounded-2xl font-black text-4xl md:text-5xl shadow-lg border-4
                bg-white border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors
                ${isWiggle ? 'wiggle bg-red-100 border-red-300' : ''}
              `}
            >
              {num}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
