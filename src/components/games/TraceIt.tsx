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

export default function TraceIt({
  items,
  onComplete,
  themeColor = '#4CAF50',
}: TraceItProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<StageResult[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [completedStrokes, setCompletedStrokes] = useState(false);
  const [tracedPoints, setTracedPoints] = useState<Array<{ x: number; y: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentItem = items[currentIndex];

  const playPrompt = useCallback(() => {
    if (!currentItem) return;
    const prompt = currentItem.kind === 'fidel'
      ? `${currentItem.symbol} ፊደልን ጻፍ!`
      : `Trace the ${currentItem.displayName || currentItem.symbol}`;
    playAudioOrSpeech(currentItem.audioPath, prompt);
  }, [currentItem]);


  useEffect(() => {
    playPrompt();
    setCompletedStrokes(false);
    setTracedPoints([]);
    clearCanvas();
  }, [currentIndex, playPrompt]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

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
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setTracedPoints(prev => [...prev, coords]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || completedStrokes) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setTracedPoints(prev => {
      const next = [...prev, coords];
      // Generous child tolerance: after 20-30 pointer move points over the letter
      if (next.length > 25 && !completedStrokes) {
        handleSuccess();
      }
      return next;
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = themeColor || '#4CAF50';
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleSuccess = () => {
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
        setCurrentIndex(currentIndex + 1);
      } else {
        onComplete(nextResults);
      }
    }, 1200);
  };

  if (!currentItem) return null;

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 max-w-xl mx-auto select-none touch-none">
      {/* Prompt bar */}
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-3">
          <SpeakerButton
            audioPath={currentItem.audioPath}
            fallbackSpeech={currentItem.kind === 'fidel' ? `${currentItem.symbol} ፊደልን ጻፍ!` : `Trace ${currentItem.displayName || currentItem.symbol}`}
            size="md"
          />
          <span className="text-2xl font-extrabold text-gray-700">
            {currentItem.kind === 'fidel' ? 'ፊደልን ጻፍ! ✍️' : 'Trace the letter! ✍️'}
          </span>

        </div>
        <div className="text-xl font-bold text-gray-400">
          {currentIndex + 1} / {items.length}
        </div>
      </div>

      {/* Tracing Canvas Area */}
      <div className="relative w-full aspect-square max-w-[340px] md:max-w-[400px] bg-white rounded-3xl shadow-xl border-4 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
        {/* Dotted guide letter in background */}
        <div
          className={`absolute inset-0 flex items-center justify-center text-[180px] md:text-[220px] font-extrabold select-none pointer-events-none transition-all duration-500 ${
            completedStrokes ? 'text-emerald-500 scale-105' : 'text-gray-200'
          }`}
          style={{
            color: completedStrokes ? themeColor : undefined,
          }}
        >
          {currentItem.symbol}
        </div>

        {/* Start dot indicator */}
        {!completedStrokes && (
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-green-500 border-4 border-white shadow-lg pointer-events-none z-10 flex items-center justify-center text-white text-xs font-bold"
          >
            🟢
          </motion.div>
        )}

        {/* Drawing canvas */}
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

        {/* Completion Celebration Overlay */}
        <AnimatePresence>
          {completedStrokes && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0 }}
              className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 pointer-events-none"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8 }}
                className="text-8xl drop-shadow-lg"
              >
                ⭐
              </motion.div>
              <span className="text-3xl font-extrabold text-emerald-700 mt-2">
                {currentItem.kind === 'fidel' ? 'ጎበዝ! ድንቅ ነው!' : 'Great job!'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip / Helper buttons */}
      <div className="flex items-center justify-between w-full mt-4">
        <button
          onClick={clearCanvas}
          className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg shadow-sm transition-colors"
        >
          {currentItem.kind === 'fidel' ? '🔄 አጥፋ' : '🔄 Clear'}
        </button>

        <BigButton
          onClick={handleSuccess}
          variant="success"
          size="md"
        >
          {currentItem.kind === 'fidel' ? 'ጨረስኩ ✨' : 'Done ✨'}
        </BigButton>
      </div>
    </div>
  );
}
