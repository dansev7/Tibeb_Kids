'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playFeedbackTone, playAudioOrSpeech } from '@/utils/sound';
import SpeakerButton from '@/components/ui/SpeakerButton';
import { getItemEmoji } from '@/utils/itemVisuals';

interface SpotTheDifferenceProps {
  targetItem?: GameItem;
  items?: GameItem[];
  confusables: GameItem[];
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

export default function SpotTheDifference({
  targetItem,
  items,
  confusables,
  onComplete,
  themeColor = '#9C27B0',
}: SpotTheDifferenceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [firstTry, setFirstTry] = useState(true);
  const [results, setResults] = useState<StageResult[]>([]);

  const activeItems = items && items.length > 0 ? items : targetItem ? [targetItem] : [];
  const currentTarget = activeItems[currentIndex] || targetItem;

  const playPrompt = useCallback(() => {
    if (!currentTarget) return;
    const prompt = currentTarget.kind === 'fidel'
      ? `${currentTarget.symbol} ፊደልን ለይተህ ፈልግ!`
      : currentTarget.kind === 'number'
      ? `Look closely! Find the number ${currentTarget.displayName || currentTarget.symbol}!`
      : `Look closely! Find the ${currentTarget.displayName || currentTarget.symbol}!`;
    playAudioOrSpeech(
      currentTarget.audioPath,
      prompt
    );
  }, [currentTarget]);

  useEffect(() => {
    playPrompt();
    setFirstTry(true);
  }, [currentIndex, playPrompt]);

  const cards = React.useMemo(() => {
    if (!currentTarget) return [];
    const pool = [...activeItems, ...confusables].filter((it) => it.id !== currentTarget.id);
    const confusableIds = currentTarget.confusableWith || [];

    // Prioritize direct confusables
    const confusableMatches = pool.filter((it) => confusableIds.includes(it.id));
    const otherMatches = pool.filter((it) => !confusableIds.includes(it.id));

    const selectedDistractors = [...confusableMatches, ...otherMatches].slice(0, 3);
    const list = [currentTarget, ...selectedDistractors];
    return list.sort(() => Math.random() - 0.5);
  }, [currentTarget, activeItems, confusables]);

  const handleSelect = (item: GameItem) => {
    if (!currentTarget) return;
    if (item.id === currentTarget.id) {
      playFeedbackTone('correct');

      const result: StageResult = {
        itemId: currentTarget.id,
        correct: true,
        usedHint: !firstTry,
        firstTry,
      };

      const updatedResults = [...results, result];
      setResults(updatedResults);

      setTimeout(() => {
        if (currentIndex + 1 < activeItems.length) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          onComplete(updatedResults);
        }
      }, 1000);
    } else {
      setFirstTry(false);
      playFeedbackTone('wrong');
      setWrongId(item.id);
      setTimeout(() => setWrongId(null), 500);
    }
  };

  if (!currentTarget) return null;

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 max-w-xl mx-auto select-none">
      {/* Top Header & Progress */}
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <SpeakerButton
            audioPath={currentTarget.audioPath}
            fallbackSpeech={`Find ${currentTarget.displayName || currentTarget.symbol}`}
            size="md"
          />
          <span className="text-xl sm:text-2xl font-extrabold text-purple-900">
            {currentTarget.kind === 'fidel' ? 'ተመሳሳይ ፊደላትን ለይ:' : 'Tricky Twins! Find:'}
          </span>
        </div>
        {activeItems.length > 1 && (
          <span className="text-lg font-bold text-gray-400">
            {currentIndex + 1} / {activeItems.length}
          </span>
        )}
      </div>

      {/* Target Preview Cue Card */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-4 bg-purple-100 border-4 border-purple-300 rounded-3xl px-8 py-3 shadow-md">
          <span className="text-6xl font-black text-purple-700">
            {currentTarget.symbol}
          </span>
          {currentTarget.pictureWord && (
            <span className="text-xl font-bold text-purple-900 flex items-center gap-2">
              <span className="text-2xl" role="img" aria-hidden="true">{getItemEmoji(currentTarget)}</span>
              <span>{currentTarget.pictureWord}</span>
            </span>
          )}
        </div>
      </div>

      {/* Confusable Look-alike Cards */}
      <div className="grid grid-cols-2 gap-4 w-full my-6">
        {cards.map((item) => {
          const isWiggle = wrongId === item.id;
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(item)}
              className={`
                h-32 md:h-40 rounded-3xl font-black text-6xl shadow-xl border-4
                bg-white border-purple-200 text-purple-800 hover:bg-purple-50 transition-colors
                ${isWiggle ? 'wiggle bg-red-100 border-red-300' : ''}
              `}
            >
              {item.symbol}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
