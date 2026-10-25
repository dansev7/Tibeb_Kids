'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playFeedbackTone, playAudioOrSpeech } from '@/utils/sound';
import SpeakerButton from '@/components/ui/SpeakerButton';
import { ConfettiBurst } from '@/components/games/ConfettiBurst';

interface WhatsNextProps {
  items?: GameItem[]; // Target numbers to practice sequences for
  sequence?: GameItem[]; // Optional single sequence (legacy mode)
  missingIndex?: number; // Optional missing index (legacy mode)
  distractors?: GameItem[];
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

interface PuzzleRound {
  targetItem: GameItem;
  targetNum: number;
  cards: Array<{ value: number; isMissing: boolean }>;
  missingIdx: number;
  promptText: string;
  choices: number[];
}

export default function WhatsNext({
  items,
  sequence,
  missingIndex,
  distractors,
  onComplete,
  themeColor = '#FF9800',
}: WhatsNextProps) {
  // Build rounds from items or fallback to single sequence
  const rounds = useMemo<PuzzleRound[]>(() => {
    // 1. Legacy mode: explicit sequence passed
    if (sequence && sequence.length >= 2) {
      const targetIdx = missingIndex ?? (sequence.length - 1);
      const target = sequence[targetIdx] || sequence[0];
      const targetVal = parseInt(target.symbol, 10);
      const safeTarget = isNaN(targetVal) ? 1 : targetVal;

      const cards = sequence.map((it, idx) => {
        const val = parseInt(it.symbol, 10);
        return {
          value: isNaN(val) ? idx + 1 : val,
          isMissing: idx === targetIdx,
        };
      });

      const choiceSet = new Set<number>([safeTarget]);
      const candidates = [safeTarget + 1, safeTarget - 1, safeTarget + 2, safeTarget - 2, safeTarget + 3];
      for (const c of candidates) {
        if (choiceSet.size >= 4) break;
        if (c >= 0 && c <= 20) choiceSet.add(c);
      }
      let fill = 0;
      while (choiceSet.size < 4 && fill <= 20) {
        choiceSet.add(fill);
        fill++;
      }

      return [
        {
          targetItem: target,
          targetNum: safeTarget,
          cards,
          missingIdx: targetIdx,
          promptText: 'What comes next? Tap the missing number!',
          choices: Array.from(choiceSet).sort(() => Math.random() - 0.5),
        },
      ];
    }

    // 2. Standard multi-round mode from level items
    const sourceItems = (items && items.length > 0 ? items : []).slice(0, 5);
    if (sourceItems.length === 0) return [];

    return sourceItems.map((item, roundIdx) => {
      const parsed = parseInt(item.symbol, 10);
      const num = isNaN(parsed) ? roundIdx + 1 : Math.max(0, parsed);

      let cardsValues: number[];
      let missingIdx: number;
      let prompt: string;

      if (num === 0) {
        // [ ? ] ➔ 1 ➔ 2
        cardsValues = [0, 1, 2];
        missingIdx = 0;
        prompt = 'What comes first? Tap the number zero!';
      } else if (num === 1) {
        // 0 ➔ [ ? ] ➔ 2
        cardsValues = [0, 1, 2];
        missingIdx = 1;
        prompt = 'What is the missing number? 0, blank, 2!';
      } else if (roundIdx % 2 === 0 || num < 2) {
        // Missing at end: [num-2] ➔ [num-1] ➔ [ ? ]
        const a = Math.max(0, num - 2);
        const b = Math.max(1, num - 1);
        cardsValues = [a, b, num];
        missingIdx = 2;
        prompt = `What comes next? ${a}, ${b}... ?`;
      } else {
        // Missing in middle: [num-1] ➔ [ ? ] ➔ [num+1]
        const a = Math.max(0, num - 1);
        const c = num + 1;
        cardsValues = [a, num, c];
        missingIdx = 1;
        prompt = `What is the missing number? ${a}, blank, ${c}!`;
      }

      const cards = cardsValues.map((val, idx) => ({
        value: val,
        isMissing: idx === missingIdx,
      }));

      // Generate 4 distinct choice numbers
      const choiceSet = new Set<number>([num]);
      const candidates = [
        num + 1,
        num - 1,
        num + 2,
        num - 2,
        num + 3,
        num - 3,
        num + 4,
      ];
      for (const c of candidates) {
        if (choiceSet.size >= 4) break;
        if (c >= 0 && c <= 20 && !choiceSet.has(c)) {
          choiceSet.add(c);
        }
      }
      let fill = 0;
      while (choiceSet.size < 4 && fill <= 20) {
        choiceSet.add(fill);
        fill++;
      }

      return {
        targetItem: item,
        targetNum: num,
        cards,
        missingIdx,
        promptText: prompt,
        choices: Array.from(choiceSet).sort(() => Math.random() - 0.5),
      };
    });
  }, [items, sequence, missingIndex]);

  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const [attemptsOnRound, setAttemptsOnRound] = useState(0);
  const [results, setResults] = useState<StageResult[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const currentRound = rounds[currentRoundIdx];

  const playPrompt = useCallback(() => {
    if (!currentRound) return;
    playAudioOrSpeech('', currentRound.promptText);
  }, [currentRound]);

  useEffect(() => {
    setSolved(false);
    setWrongChoice(null);
    setAttemptsOnRound(0);
    setShowConfetti(false);
    playPrompt();
  }, [currentRoundIdx, playPrompt]);

  const handleSelectChoice = (chosen: number) => {
    if (solved || !currentRound) return;

    if (chosen === currentRound.targetNum) {
      setSolved(true);
      setShowConfetti(true);
      playFeedbackTone('correct');

      // Speak solved sequence aloud to reinforce the counting order
      const sequenceNames = currentRound.cards.map((c) => c.value).join(', ');
      setTimeout(() => {
        playAudioOrSpeech('', `${sequenceNames}! Great job!`);
      }, 300);

      const result: StageResult = {
        itemId: currentRound.targetItem.id,
        correct: true,
        usedHint: attemptsOnRound > 0,
        firstTry: attemptsOnRound === 0,
        gameType: 'whatsNext',
      };

      const nextResults = [...results, result];
      setResults(nextResults);

      setTimeout(() => {
        if (currentRoundIdx + 1 < rounds.length) {
          setCurrentRoundIdx((prev) => prev + 1);
        } else {
          onComplete(nextResults);
        }
      }, 1400);
    } else {
      setAttemptsOnRound((prev) => prev + 1);
      playFeedbackTone('wrong');
      setWrongChoice(chosen);
      setTimeout(() => setWrongChoice(null), 500);
    }
  };

  const handleCardTap = (cardValue: number, isMissing: boolean) => {
    if (isMissing && !solved) {
      playFeedbackTone('pop');
      playAudioOrSpeech('', 'What number goes here?');
    } else {
      playFeedbackTone('pop');
      playAudioOrSpeech('', String(cardValue));
    }
  };

  if (!currentRound) return null;

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 max-w-xl mx-auto select-none">
      <ConfettiBurst active={showConfetti} />

      {/* Header bar */}
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-3">
          <SpeakerButton
            audioPath=""
            fallbackSpeech={currentRound.promptText}
            size="md"
          />
          <span className="text-xl sm:text-2xl font-black text-gray-800">
            What comes next?
          </span>
        </div>

        {/* Round indicator dots */}
        {rounds.length > 1 && (
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-full shadow-xs">
            {rounds.map((_, idx) => (
              <span
                key={idx}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  idx === currentRoundIdx
                    ? 'bg-amber-500 scale-125'
                    : idx < currentRoundIdx
                    ? 'bg-emerald-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sequence Display */}
      <div className="flex flex-col items-center justify-center my-auto w-full">
        <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-5 w-full">
          {currentRound.cards.map((card, idx) => {
            const isMissing = card.isMissing;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <span className="text-2xl sm:text-3xl text-amber-500 font-black animate-pulse select-none">
                    ➔
                  </span>
                )}
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCardTap(card.value, isMissing)}
                  className={`
                    w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 rounded-3xl flex items-center justify-center
                    font-black text-4xl sm:text-5xl md:text-6xl shadow-lg border-4 cursor-pointer select-none
                    transition-all duration-300
                    ${
                      isMissing
                        ? solved
                          ? 'bg-emerald-500 border-emerald-600 text-white scale-105 shadow-emerald-200'
                          : 'bg-amber-50/80 border-dashed border-amber-400 text-amber-600 animate-pulse'
                        : 'bg-white border-amber-200 text-gray-800 hover:border-amber-300'
                    }
                  `}
                >
                  <AnimatePresence mode="wait">
                    {isMissing && !solved ? (
                      <motion.span
                        key="question"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                      >
                        ?
                      </motion.span>
                    ) : (
                      <motion.span
                        key="number"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        {card.value}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </React.Fragment>
            );
          })}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-3 text-center">
          Tap the missing box or pick the right number below!
        </p>
      </div>

      {/* Choices Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-lg mb-2">
        {currentRound.choices.map((choice) => {
          const isWiggle = wrongChoice === choice;
          const isCorrectSolved = solved && choice === currentRound.targetNum;

          return (
            <motion.button
              key={choice}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              disabled={solved}
              onClick={() => handleSelectChoice(choice)}
              className={`
                h-20 sm:h-24 md:h-26 rounded-3xl font-black text-3xl sm:text-4xl md:text-5xl shadow-md border-4
                cursor-pointer select-none transition-colors min-w-[72px] flex items-center justify-center
                ${
                  isCorrectSolved
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200'
                    : isWiggle
                    ? 'wiggle bg-red-100 border-red-400 text-red-600'
                    : 'bg-white border-sky-300 text-sky-800 hover:bg-sky-50 active:bg-sky-100'
                }
                ${solved && !isCorrectSolved ? 'opacity-40 cursor-default' : ''}
              `}
            >
              {choice}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
