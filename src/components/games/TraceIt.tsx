'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playFeedbackTone, playAudioOrSpeech } from '@/utils/sound';
import SpeakerButton from '@/components/ui/SpeakerButton';
import BigButton from '@/components/ui/BigButton';

interface TraceItProps {
  items: GameItem[];
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

interface Checkpoint {
  x: number;
  y: number;
  hit: boolean;
}

export default function TraceIt({
  items,
  onComplete,
  themeColor = '#4CAF50',
}: TraceItProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<StageResult[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [completedStrokes, setCompletedStrokes] = useState(false);
  const [coveragePercent, setCoveragePercent] = useState(0);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [showDoneNotice, setShowDoneNotice] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const checkpointsRef = useRef<Checkpoint[]>([]);
  const completedRef = useRef(false);

  const currentItem = items[currentIndex];
  const isFidel = currentItem?.kind === 'fidel';

  const playPrompt = useCallback(() => {
    if (!currentItem) return;
    const prompt = isFidel
      ? `${currentItem.symbol} ፊደልን ጻፍ!`
      : `Trace the ${currentItem.displayName || currentItem.symbol}!`;
    playAudioOrSpeech(currentItem.audioPath, prompt);
  }, [currentItem, isFidel]);

  // Extract character shape checkpoints from an offscreen canvas
  const initCharacterCheckpoints = useCallback((symbol: string) => {
    if (typeof window === 'undefined') return;

    const offscreen = document.createElement('canvas');
    offscreen.width = 400;
    offscreen.height = 400;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    // Draw the glyph in center of 400x400 space
    ctx.clearRect(0, 0, 400, 400);
    ctx.font = 'bold 230px "Noto Sans Ethiopic", "Segoe UI", system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(symbol, 200, 200);

    const imgData = ctx.getImageData(0, 0, 400, 400).data;
    const points: Checkpoint[] = [];
    const step = 9; // Sample every 9 pixels for clean coverage grid

    let topScore = Infinity;
    let initialStart: { x: number; y: number } | null = null;

    for (let y = 30; y < 370; y += step) {
      for (let x = 30; x < 370; x += step) {
        const alpha = imgData[(y * 400 + x) * 4 + 3];
        if (alpha > 70) {
          points.push({ x, y, hit: false });

          // Writing standardly starts near the top-left of the glyph
          const startWeight = y * 1.5 + x;
          if (startWeight < topScore) {
            topScore = startWeight;
            initialStart = { x, y };
          }
        }
      }
    }

    checkpointsRef.current = points;
    setStartPoint(initialStart || { x: 200, y: 100 });
    setCoveragePercent(0);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset hit status on all checkpoints
    checkpointsRef.current.forEach(cp => {
      cp.hit = false;
    });
    setCoveragePercent(0);
    setShowDoneNotice(false);
  }, []);

  // Initialize checkpoints & reset canvas on item change
  useEffect(() => {
    completedRef.current = false;
    setCompletedStrokes(false);
    clearCanvas();
    if (currentItem) {
      initCharacterCheckpoints(currentItem.symbol);
      playPrompt();
    }
  }, [currentIndex, currentItem, initCharacterCheckpoints, playPrompt, clearCanvas]);

  const handleSuccess = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompletedStrokes(true);
    playFeedbackTone('correct');

    const result: StageResult = {
      itemId: currentItem.id,
      correct: true,
      usedHint: false,
      firstTry: true,
    };

    const nextResults = [...results, result];
    setResults(nextResults);

    setTimeout(() => {
      if (currentIndex + 1 < items.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(nextResults);
      }
    }, 1400);
  }, [currentIndex, currentItem, items.length, onComplete, results]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (completedStrokes) return;
    e.preventDefault();
    setIsDrawing(true);
    setShowDoneNotice(false);
    const coords = getCanvasCoords(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    // Check hit on initial touch point
    checkHitsAt(coords.x, coords.y);
  };

  // Hit test against character checkpoints with a child-friendly touch radius
  const checkHitsAt = (x: number, y: number) => {
    const hitRadiusSq = 36 * 36; // 36px radius
    let newlyHit = false;

    const checkpoints = checkpointsRef.current;
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      if (!cp.hit) {
        const dx = cp.x - x;
        const dy = cp.y - y;
        if (dx * dx + dy * dy <= hitRadiusSq) {
          cp.hit = true;
          newlyHit = true;
        }
      }
    }

    if (newlyHit && checkpoints.length > 0) {
      const hits = checkpoints.filter(c => c.hit).length;
      const ratio = hits / checkpoints.length;
      const pct = Math.min(100, Math.round(ratio * 100));
      setCoveragePercent(pct);

      // Child needs to cover at least 60% of the character strokes to complete
      if (ratio >= 0.60 && !completedRef.current) {
        handleSuccess();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || completedStrokes) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = themeColor || '#4CAF50';
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    checkHitsAt(coords.x, coords.y);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  // When child taps Done button: require at least 40% traced; otherwise encourage more tracing
  const handleDoneClick = () => {
    if (completedStrokes) return;
    if (coveragePercent >= 40) {
      handleSuccess();
    } else {
      setShowDoneNotice(true);
      playFeedbackTone('wrong');
      const reminder = isFidel
        ? 'ፊደሉን ይበልጥ ጻፍ!'
        : 'Keep tracing along the letter!';
      playAudioOrSpeech(undefined, reminder);
      setTimeout(() => setShowDoneNotice(false), 2200);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 max-w-xl mx-auto select-none touch-none">
      {/* Top Prompt & Speaker Bar */}
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-3">
          <SpeakerButton
            audioPath={currentItem.audioPath}
            fallbackSpeech={isFidel ? `${currentItem.symbol} ፊደልን ጻፍ!` : `Trace the ${currentItem.displayName || currentItem.symbol}`}
            size="md"
          />
          <span className="text-2xl font-extrabold text-gray-700">
            {isFidel ? `${currentItem.symbol} ፊደልን ጻፍ! ✍️` : `Trace the letter! ✍️`}
          </span>
        </div>
        <div className="text-xl font-bold text-gray-400">
          {currentIndex + 1} / {items.length}
        </div>
      </div>

      {/* Tracing Progress Meter */}
      <div className="w-full max-w-[340px] md:max-w-[400px] mb-2">
        <div className="flex items-center justify-between text-xs font-black text-gray-500 mb-1">
          <span>{isFidel ? 'የተጻፈ' : 'Traced'}</span>
          <span className="text-sm font-black" style={{ color: themeColor }}>
            {coveragePercent}% {coveragePercent >= 60 ? '⭐' : ''}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${Math.min(100, Math.max(0, (coveragePercent / 60) * 100))}%`,
              backgroundColor: coveragePercent >= 60 ? '#10B981' : themeColor,
            }}
          />
        </div>
      </div>

      {/* Tracing Canvas Area */}
      <div className="relative w-full aspect-square max-w-[340px] md:max-w-[400px] bg-white rounded-3xl shadow-xl border-4 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
        {/* Background Guide Letter */}
        <div
          className={`absolute inset-0 flex items-center justify-center text-[190px] md:text-[230px] font-extrabold select-none pointer-events-none transition-all duration-500 ${
            completedStrokes ? 'scale-105 drop-shadow-md' : 'text-gray-200'
          }`}
          style={{
            color: completedStrokes ? themeColor : undefined,
          }}
        >
          {currentItem.symbol}
        </div>

        {/* Dynamic Green Start Indicator 🟢 (located at natural stroke start of the glyph) */}
        {!completedStrokes && startPoint && coveragePercent < 15 && (
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="absolute w-8 h-8 rounded-full bg-emerald-500 border-3 border-white shadow-lg pointer-events-none z-10 flex items-center justify-center text-white text-xs font-bold"
            style={{
              left: `${(startPoint.x / 400) * 100}%`,
              top: `${(startPoint.y / 400) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            🟢
          </motion.div>
        )}

        {/* Interactive Tracing Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-20"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Gentle Notice if tapped Done too early */}
        <AnimatePresence>
          {showDoneNotice && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute bottom-4 bg-amber-400 text-amber-950 font-black px-4 py-2 rounded-2xl shadow-lg z-30 text-center text-sm"
            >
              {isFidel ? '👆 ፊደሉን ይበልጥ ጻፍ!' : '👆 Keep tracing along the shape!'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion Celebration Overlay */}
        <AnimatePresence>
          {completedStrokes && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0 }}
              className="absolute inset-0 bg-emerald-500/25 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 pointer-events-none"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.25, 1] }}
                transition={{ duration: 0.8 }}
                className="text-8xl drop-shadow-lg"
              >
                ⭐
              </motion.div>
              <span className="text-3xl font-extrabold text-emerald-800 mt-2 drop-shadow-sm">
                {isFidel ? 'ጎበዝ! ድንቅ ነው!' : 'Great job!'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons: Clear & Done */}
      <div className="flex items-center justify-between w-full mt-4">
        <button
          onClick={clearCanvas}
          className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-bold text-lg shadow-sm transition-colors cursor-pointer"
        >
          {isFidel ? '🔄 አጥፋ' : '🔄 Clear'}
        </button>

        <BigButton
          onClick={handleDoneClick}
          variant="success"
          size="md"
        >
          {isFidel ? 'ጨረስኩ ✨' : 'Done ✨'}
        </BigButton>
      </div>
    </div>
  );
}
