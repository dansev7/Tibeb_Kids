'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playAudioOrSpeech, playChime, playBoop, playPop, speakText } from '@/utils/sound';
import { getThemeConfig } from '@/utils/theme';
import { ConfettiBurst } from './ConfettiBurst';
import ItemVisualBadge from '@/components/ui/ItemVisualBadge';

export interface MatchPairsProps {
  pairs: Array<{ left: GameItem; right: GameItem }>;
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

export function MatchPairs({ pairs, onComplete, themeColor }: MatchPairsProps) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wigglingLeft, setWigglingLeft] = useState<string | null>(null);
  const [wigglingRight, setWigglingRight] = useState<string | null>(null);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, number>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const completedRef = useRef(false);

  const theme = getThemeConfig(themeColor);
  const isAmharic = pairs.some(p => p.left.kind === 'fidel' || p.right.kind === 'fidel');

  // Left items stay in given order; right items are shuffled for the matching challenge
  const leftItems = useMemo(() => pairs.map((p) => p.left), [pairs]);
  const rightItems = useMemo(() => {
    return [...pairs.map((p) => p.right)].sort(() => 0.5 - Math.random());
  }, [pairs]);

  const hasRightVisuals = useMemo(
    () => rightItems.some((item) => Boolean(item.picturePath || (item.pictureWord && item.pictureWord !== item.symbol))),
    [rightItems]
  );

  // Audio instruction on mount
  useEffect(() => {
    playAudioOrSpeech(undefined, isAmharic ? 'ተዛማጆቹን አገናኝ!' : 'Match the pairs!');
  }, [isAmharic]);

  // Check if all pairs are matched
  useEffect(() => {
    if (pairs.length > 0 && matchedIds.length === pairs.length && !completedRef.current) {
      completedRef.current = true;
      setShowConfetti(true);
      playChime();

      // Compile stage results
      const results: StageResult[] = pairs.map((pair) => {
        const attempts = attemptsMap[pair.left.id] || 0;
        return {
          itemId: pair.left.id,
          correct: true,
          usedHint: false,
          firstTry: attempts === 0,
        };
      });

      const timer = setTimeout(() => {
        onComplete(results);
      }, 1600);

      return () => clearTimeout(timer);
    }
  }, [matchedIds.length, pairs, attemptsMap, onComplete]);

  // Handle matching attempt when both left and right are selected
  const evaluateMatch = (leftId: string, rightId: string) => {
    // Find the pair that corresponds to leftId
    const pair = pairs.find((p) => p.left.id === leftId);

    if (pair && pair.right.id === rightId) {
      // Correct match!
      playChime();
      if (isAmharic) {
        setTimeout(() => speakText('ጎበዝ! ተዛምዷል!'), 200);
      }
      setMatchedIds((prev) => [...prev, leftId]);
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // Wrong match: soft boop, gentle wiggle on both cards
      playBoop();
      if (isAmharic) {
        setTimeout(() => speakText('እንደገና ሞክር!'), 250);
      }
      setWigglingLeft(leftId);
      setWigglingRight(rightId);

      // Track attempt
      setAttemptsMap((prev) => ({
        ...prev,
        [leftId]: (prev[leftId] || 0) + 1,
      }));

      setTimeout(() => {
        setWigglingLeft(null);
        setWigglingRight(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 500);
    }
  };

  const handleLeftClick = (item: GameItem) => {
    if (matchedIds.includes(item.id)) return;
    playPop();
    const speech = item.kind === 'fidel' ? item.symbol : item.displayName;
    playAudioOrSpeech(item.audioPath, speech);

    if (selectedRight) {
      setSelectedLeft(item.id);
      evaluateMatch(item.id, selectedRight);
    } else {
      setSelectedLeft(item.id === selectedLeft ? null : item.id);
    }
  };

  const handleRightClick = (item: GameItem) => {
    // Find which pair this right item belongs to
    const correspondingPair = pairs.find((p) => p.right.id === item.id);
    if (!correspondingPair) return;

    if (matchedIds.includes(correspondingPair.left.id)) return;
    playPop();
    const rightSpeech = item.kind === 'fidel'
      ? (item.pictureWordAmharic || item.pictureWord?.replace(/\([^)]*\)/g, '').trim() || item.symbol)
      : (item.pictureWord || item.displayName);
    playAudioOrSpeech(
      item.pictureWordAudioPath || item.audioPath,
      rightSpeech
    );


    if (selectedLeft) {
      setSelectedRight(item.id);
      evaluateMatch(selectedLeft, item.id);
    } else {
      setSelectedRight(item.id === selectedRight ? null : item.id);
    }
  };

  const isMatchedLeft = (id: string) => matchedIds.includes(id);
  const isMatchedRight = (id: string) => {
    const pair = pairs.find((p) => p.right.id === id);
    return pair ? matchedIds.includes(pair.left.id) : false;
  };

  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-between p-3 sm:p-5 select-none bg-gradient-to-b ${theme.lightBg} overflow-hidden`}
      style={{
        backgroundColor: themeColor && themeColor.startsWith('#') ? `${themeColor}15` : undefined,
      }}
    >
      <ConfettiBurst active={showConfetti} count={50} />

      {/* Top Header */}
      <header className="w-full max-w-xl flex items-center justify-between pt-2 pb-2">
        <div className="flex items-center gap-2">
          {pairs.map((pair, idx) => (
            <motion.div
              key={idx}
              animate={{
                scale: isMatchedLeft(pair.left.id) ? 1.25 : 1,
              }}
              className={`h-4 w-4 rounded-full transition-colors ${
                isMatchedLeft(pair.left.id) ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Audio speaker button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            playPop();
            playAudioOrSpeech(undefined, isAmharic ? 'ተዛማጆቹን አገናኝ!' : 'Match the pairs!');
          }}
          aria-label="Repeat instruction"
          className="min-w-[64px] min-h-[64px] w-16 h-16 rounded-full bg-white shadow-lg border-4 border-amber-300 flex items-center justify-center text-3xl active:bg-amber-50 cursor-pointer"
        >
          🔊
        </motion.button>
      </header>

      {/* Title / Instruction banner */}
      <div className="w-full max-w-xl flex items-center justify-center my-2">
        <div
          className="bg-white/90 backdrop-blur-sm px-6 py-2 rounded-full border-2 shadow-md flex items-center gap-3"
          style={{ borderColor: theme.primary }}
        >
          <span className="text-2xl">🔗</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-700">
            {isAmharic ? 'ተዛማጆቹን አገናኝ' : 'Match the pairs!'}
          </span>
        </div>
      </div>

      {/* Matching Columns: Compact Left Column for Single Letters & Spacious Right Column for Words */}
      <main className="w-full max-w-2xl flex-1 flex items-center justify-center py-2 sm:py-4">
        <div className="w-full flex gap-3 sm:gap-6 items-stretch justify-center">
          {/* Left Column (Items to match, e.g. uppercase symbols with minimized padding) */}
          <div className={`flex flex-col gap-3 sm:gap-4 ${hasRightVisuals ? 'w-20 sm:w-28 shrink-0' : 'flex-1'}`}>
            {leftItems.map((item) => {
              const isMatched = isMatchedLeft(item.id);
              const isSelected = selectedLeft === item.id;
              const isWiggling = wigglingLeft === item.id;

              return (
                <motion.button
                  key={item.id}
                  disabled={isMatched}
                  animate={{
                    x: isWiggling ? [-8, 8, -6, 6, -3, 3, 0] : 0,
                    scale: isSelected ? 1.05 : isMatched ? 0.96 : 1,
                    opacity: isMatched ? 0.6 : 1,
                  }}
                  whileHover={!isMatched ? { scale: 1.03 } : undefined}
                  whileTap={!isMatched ? { scale: 0.95 } : undefined}
                  onClick={() => handleLeftClick(item)}
                  aria-label={`Left card ${item.symbol}`}
                  className={`relative min-h-[88px] sm:min-h-[110px] rounded-3xl ${
                    hasRightVisuals ? 'p-1.5 sm:p-2' : 'p-3'
                  } flex items-center justify-center border-4 shadow-lg transition-colors cursor-pointer w-full ${
                    isMatched
                      ? 'border-emerald-500 bg-emerald-50/80 cursor-default'
                      : isSelected
                      ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-300 shadow-amber-200'
                      : 'border-white bg-white hover:border-slate-200 shadow-md'
                  }`}
                  style={{
                    minWidth: hasRightVisuals ? '56px' : '64px',
                  }}
                >
                  <span className="text-4xl sm:text-6xl font-black text-slate-800 tracking-tight select-none">
                    {item.symbol}
                  </span>

                  {/* Matched checkmark */}
                  {isMatched && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold border-2 border-white shadow"
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Right Column (Targets, e.g. lowercase symbols or picture cards with ample room for full text) */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-4">
            {rightItems.map((item) => {
              const isMatched = isMatchedRight(item.id);
              const isSelected = selectedRight === item.id;
              const isWiggling = wigglingRight === item.id;
              const hasVisual = Boolean(item.picturePath || (item.pictureWord && item.pictureWord !== item.symbol));

              return (
                <motion.button
                  key={item.id}
                  disabled={isMatched}
                  animate={{
                    x: isWiggling ? [-8, 8, -6, 6, -3, 3, 0] : 0,
                    scale: isSelected ? 1.05 : isMatched ? 0.96 : 1,
                    opacity: isMatched ? 0.6 : 1,
                  }}
                  whileHover={!isMatched ? { scale: 1.03 } : undefined}
                  whileTap={!isMatched ? { scale: 0.95 } : undefined}
                  onClick={() => handleRightClick(item)}
                  aria-label={`Right card ${item.displayName || item.pictureWord}`}
                  className={`relative min-h-[88px] sm:min-h-[110px] rounded-3xl border-4 shadow-lg transition-colors cursor-pointer flex items-center w-full ${
                    hasVisual ? 'justify-start px-2.5 sm:px-4' : 'justify-center p-3'
                  } ${
                    isMatched
                      ? 'border-emerald-500 bg-emerald-50/80 cursor-default'
                      : isSelected
                      ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-300 shadow-amber-200'
                      : 'border-white bg-white hover:border-slate-200 shadow-md'
                  }`}
                  style={{
                    minWidth: '64px',
                  }}
                >
                  {/* If item has picture or pictureWord, show visual badge with word; else show symbol */}
                  {hasVisual ? (
                    <div className="flex items-center gap-2 sm:gap-3.5 w-full min-w-0">
                      <ItemVisualBadge
                        item={item}
                        className="w-12 h-12 sm:w-16 sm:h-16 shrink-0"
                        emojiSize="text-3xl sm:text-4xl"
                      />
                      <span className="text-lg sm:text-2xl font-bold text-slate-700 capitalize whitespace-nowrap">
                        {item.pictureWord || item.symbol}
                      </span>
                    </div>
                  ) : (
                    <span className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-800 tracking-tight">
                      {item.symbol}
                    </span>
                  )}

                  {/* Matched checkmark */}
                  {isMatched && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold border-2 border-white shadow"
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Gentle Bottom Helper */}
      <footer className="w-full max-w-xl h-16 flex items-center justify-center">
        <span className="text-slate-400 font-medium text-sm flex items-center gap-1.5">
          <span>👆</span>
          <span>
            {isAmharic
              ? 'ግራውን ነክተህ ከቀኙ ጋር አዛምድ'
              : 'Tap one on the left, then tap its match on the right!'}
          </span>
        </span>
      </footer>
    </div>
  );
}

export default MatchPairs;
