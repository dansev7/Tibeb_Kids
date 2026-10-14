'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playFeedbackTone, playAudioOrSpeech } from '@/utils/sound';
import SpeakerButton from '@/components/ui/SpeakerButton';

interface WhatsNextProps {
  sequence: GameItem[]; // 3-4 consecutive items, where one is missing
  missingIndex?: number; // index of missing item (default 2)
  distractors: GameItem[];
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

export default function WhatsNext({
  sequence,
  missingIndex = 2,
  distractors,
  onComplete,
  themeColor = '#4CAF50',
}: WhatsNextProps) {
  const [solved, setSolved] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [firstTry, setFirstTry] = useState(true);

  const targetItem = sequence[missingIndex];

  const playPrompt = useCallback(() => {
    playAudioOrSpeech('', 'What comes next? Tap the missing piece!');
  }, []);

  useEffect(() => {
    playPrompt();
  }, [playPrompt]);

  const choices = React.useMemo(() => {
    if (!targetItem) return [];
    const pool = [targetItem, ...distractors.slice(0, 3)];
    return pool.sort(() => Math.random() - 0.5);
  }, [targetItem, distractors]);

  const handleSelect = (item: GameItem) => {
    if (item.id === targetItem.id) {
      setSolved(true);
      playFeedbackTone('correct');

      setTimeout(() => {
        onComplete([
          {
            itemId: targetItem.id,
            correct: true,
            usedHint: !firstTry,
            firstTry,
          },
        ]);
      }, 1200);
    } else {
      setFirstTry(false);
      playFeedbackTone('wrong');
      setWrongId(item.id);
      setTimeout(() => setWrongId(null), 500);
    }
  };

  if (!targetItem) return null;

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 max-w-xl mx-auto select-none">
      {/* Header */}
      <div className="flex items-center gap-3 w-full mb-4">
        <SpeakerButton
          audioPath=""
          fallbackSpeech="What comes next? Find the missing piece!"
          size="md"
        />
        <span className="text-2xl font-extrabold text-gray-700">
          What comes next?
        </span>
      </div>

      {/* Sequence Display */}
      <div className="flex items-center justify-center gap-3 md:gap-4 my-8 w-full">
        {sequence.map((item, idx) => {
          const isMissing = idx === missingIndex;
          return (
            <div
              key={idx}
              className={`
                w-20 h-28 md:w-24 md:h-32 rounded-3xl flex items-center justify-center font-black text-4xl md:text-5xl shadow-lg border-4
                ${
                  isMissing
                    ? solved
                      ? 'bg-emerald-500 border-emerald-600 text-white scale-105 transition-transform'
                      : 'bg-white border-dashed border-amber-400 text-amber-500 glow-hint'
                    : 'bg-white border-gray-200 text-gray-800'
                }
              `}
            >
              {isMissing ? (solved ? targetItem.symbol : '?') : item.symbol}
            </div>
          );
        })}
      </div>

      {/* Choices Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-4">
        {choices.map((item) => {
          const isWiggle = wrongId === item.id;
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(item)}
              className={`
                h-24 md:h-28 rounded-3xl font-extrabold text-4xl shadow-xl border-4
                bg-white border-sky-300 text-sky-800 hover:bg-sky-50 transition-colors
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
