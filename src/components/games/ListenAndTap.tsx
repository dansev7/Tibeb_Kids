'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playFeedbackTone, playAudioOrSpeech } from '@/utils/sound';

interface ListenAndTapProps {
  items: GameItem[];
  distractors: GameItem[];
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

export default function ListenAndTap({
  items,
  distractors,
  onComplete,
  themeColor = '#4CAF50',
}: ListenAndTapProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [results, setResults] = useState<StageResult[]>([]);
  const [firstTry, setFirstTry] = useState(true);

  const currentItem = items[currentIndex];

  const playPrompt = useCallback(() => {
    if (!currentItem) return;
    const isFidel = currentItem.kind === 'fidel';
    const isNumber = currentItem.kind === 'number';
    const speech = isFidel
      ? `አዳምጥ! ይህንን ድምፅ የሚያሰማው የትኛው ፊደል ነው? ${currentItem.symbol}`
      : isNumber
      ? `Listen! Which number is this? ${currentItem.displayName || currentItem.symbol}`
      : `Listen! Which letter makes this sound? ${currentItem.displayName || currentItem.symbol}`;

    playAudioOrSpeech(
      currentItem.audioPath,
      speech
    );
  }, [currentItem]);

  useEffect(() => {
    playPrompt();
    setFirstTry(true);
  }, [currentIndex, playPrompt]);

  const choices = React.useMemo(() => {
    if (!currentItem) return [];
    const pool = [currentItem, ...distractors.slice(0, 3)];
    return pool.sort(() => Math.random() - 0.5);
  }, [currentItem, distractors]);

  const handleSelect = (item: GameItem) => {
    if (item.id === currentItem.id) {
      playFeedbackTone('correct');

      const result: StageResult = {
        itemId: currentItem.id,
        correct: true,
        usedHint: !firstTry,
        firstTry,
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
      setFirstTry(false);
      playFeedbackTone('wrong');
      setWrongId(item.id);
      setTimeout(() => setWrongId(null), 500);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 max-w-xl mx-auto select-none">
      {/* Top instruction */}
      <div className="flex items-center justify-between w-full mb-4">
        <span className="text-2xl font-extrabold text-gray-700">
          Listen and Tap! 👂
        </span>
        <span className="text-xl font-bold text-gray-400">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* Giant Audio Play Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={playPrompt}
        className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 shadow-2xl flex flex-col items-center justify-center text-6xl md:text-7xl text-white border-4 border-white glow-hint my-4 cursor-pointer"
      >
        <motion.span
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          🔊
        </motion.span>
        <span className="text-sm font-bold mt-2 opacity-90">Tap to hear</span>
      </motion.button>

      {/* Answer Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-6">
        {choices.map((item) => {
          const isWiggle = wrongId === item.id;
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(item)}
              className={`
                h-28 md:h-32 rounded-3xl font-black text-5xl shadow-xl border-4
                bg-white border-blue-200 text-blue-800 hover:bg-blue-50 transition-colors
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
