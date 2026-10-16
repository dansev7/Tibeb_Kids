'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playFeedbackTone, playAudioOrSpeech } from '@/utils/sound';
import SpeakerButton from '@/components/ui/SpeakerButton';
import { getItemEmoji } from '@/utils/itemVisuals';

interface SpotTheDifferenceProps {
  targetItem: GameItem;
  confusables: GameItem[];
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

export default function SpotTheDifference({
  targetItem,
  confusables,
  onComplete,
  themeColor = '#9C27B0',
}: SpotTheDifferenceProps) {
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [firstTry, setFirstTry] = useState(true);

  const playPrompt = useCallback(() => {
    if (!targetItem) return;
    const prompt = targetItem.kind === 'fidel'
      ? `${targetItem.symbol} ፊደልን ለይተህ ፈልግ!`
      : `Look closely! Find the ${targetItem.displayName || targetItem.symbol}!`;
    playAudioOrSpeech(
      targetItem.audioPath,
      prompt
    );
  }, [targetItem]);

  useEffect(() => {
    playPrompt();
  }, [playPrompt]);

  const cards = React.useMemo(() => {
    const list = [targetItem, ...confusables];
    return list.sort(() => Math.random() - 0.5);
  }, [targetItem, confusables]);

  const handleSelect = (item: GameItem) => {
    if (item.id === targetItem.id) {
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
      }, 1000);
    } else {
      setFirstTry(false);
      playFeedbackTone('wrong');
      setWrongId(item.id);
      setTimeout(() => setWrongId(null), 500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 max-w-xl mx-auto select-none">
      {/* Target Preview */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <SpeakerButton
            audioPath={targetItem.audioPath}
            fallbackSpeech={`Find ${targetItem.displayName || targetItem.symbol}`}
            size="md"
          />
          <span className="text-2xl font-extrabold text-purple-900">
            {targetItem.kind === 'fidel' ? 'ተመሳሳይ ፊደላትን ለይ:' : 'Tricky Twins! Find:'}
          </span>
        </div>

        {/* Big target cue card */}
        <div className="flex items-center gap-4 bg-purple-100 border-4 border-purple-300 rounded-3xl px-8 py-3 shadow-md">
          <span className="text-6xl font-black text-purple-700">
            {targetItem.symbol}
          </span>
          {targetItem.pictureWord && (
            <span className="text-xl font-bold text-purple-900 flex items-center gap-2">
              <span className="text-2xl" role="img" aria-hidden="true">{getItemEmoji(targetItem)}</span>
              <span>{targetItem.pictureWord}</span>
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
