'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ParentGateProps {
  /** Controls visibility if used as a modal overlay (defaults to true) */
  isOpen?: boolean;
  /** Callback fired when the parent solves the question correctly */
  onSuccess: () => void;
  /** Callback fired when cancelled or closed */
  onCancel?: () => void;
  /** Custom title (default: 'Parents & Grown-ups Only') */
  title?: string;
  /** Additional CSS class names */
  className?: string;
}

interface MathProblem {
  question: string;
  answer: number;
}

function generateMathProblem(): MathProblem {
  const operations = ['+', 'x', '-'];
  const op = operations[Math.floor(Math.random() * operations.length)];

  if (op === '+') {
    // 2-digit addition: e.g. 14 + 18
    const a = 12 + Math.floor(Math.random() * 25);
    const b = 11 + Math.floor(Math.random() * 25);
    return {
      question: `${a} + ${b}`,
      answer: a + b,
    };
  } else if (op === 'x') {
    // Multiplication tables: e.g. 7 x 8
    const a = 6 + Math.floor(Math.random() * 4); // 6 to 9
    const b = 6 + Math.floor(Math.random() * 4); // 6 to 9
    return {
      question: `${a} × ${b}`,
      answer: a * b,
    };
  } else {
    // 2-digit subtraction: e.g. 52 - 18
    const b = 14 + Math.floor(Math.random() * 20);
    const a = b + 15 + Math.floor(Math.random() * 25);
    return {
      question: `${a} - ${b}`,
      answer: a - b,
    };
  }
}

export default function ParentGate({
  isOpen = true,
  onSuccess,
  onCancel,
  title = 'Parents & Grown-ups Only',
  className = '',
}: ParentGateProps) {
  const [problem, setProblem] = useState<MathProblem>({ question: '', answer: 0 });
  const [inputAnswer, setInputAnswer] = useState<string>('');
  const [errorShake, setErrorShake] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const nextProblem = useCallback(() => {
    setProblem(generateMathProblem());
    setInputAnswer('');
    setStatusMessage('');
  }, []);

  useEffect(() => {
    if (isOpen) {
      nextProblem();
    }
  }, [isOpen, nextProblem]);

  const handleKeyPress = (num: string) => {
    if (inputAnswer.length >= 4) return;
    setInputAnswer((prev) => prev + num);
  };

  const handleBackspace = () => {
    setInputAnswer((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInputAnswer('');
    setStatusMessage('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(inputAnswer.trim(), 10);

    if (parsed === problem.answer) {
      setStatusMessage('Unlocked! Welcome.');
      setTimeout(() => {
        onSuccess();
      }, 300);
    } else {
      setErrorShake(true);
      setStatusMessage('Incorrect. Please try this new question:');
      setTimeout(() => {
        setErrorShake(false);
        nextProblem();
      }, 900);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`relative w-full max-w-sm rounded-3xl bg-white shadow-2xl border-4 border-slate-200 overflow-hidden ${className}`}
        >
          {/* Header Bar */}
          <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="lock">
                🔒
              </span>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Gate Body */}
          <div className="p-6 flex flex-col items-center">
            <p className="text-sm font-medium text-slate-500 mb-3 text-center">
              Please solve this math problem to access parent settings:
            </p>

            {/* Question Card */}
            <motion.div
              animate={errorShake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.5 }}
              className={`w-full py-4 px-6 rounded-2xl text-center mb-4 transition-colors ${
                statusMessage && statusMessage.startsWith('Incorrect')
                  ? 'bg-rose-50 border-2 border-rose-300'
                  : 'bg-indigo-50/70 border-2 border-indigo-200'
              }`}
            >
              <div className="text-3xl font-extrabold text-slate-800 tracking-wider font-mono">
                {problem.question} = ?
              </div>
              {statusMessage && (
                <div
                  className={`text-xs mt-1 font-semibold ${
                    statusMessage.startsWith('Unlocked') ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {statusMessage}
                </div>
              )}
            </motion.div>

            {/* Digit Display */}
            <div className="w-full h-14 bg-slate-100 rounded-2xl border-2 border-slate-300 flex items-center justify-center text-3xl font-bold font-mono tracking-widest text-slate-800 mb-5 shadow-inner">
              {inputAnswer || <span className="text-slate-300 font-normal">--</span>}
            </div>

            {/* Numeric Keypad for fast touch on phones/tablets */}
            <div className="grid grid-cols-3 gap-2.5 w-full mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xl font-bold transition-colors cursor-pointer select-none border border-slate-200 active:translate-y-0.5"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 text-sm font-bold transition-colors cursor-pointer select-none border border-rose-200"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xl font-bold transition-colors cursor-pointer select-none border border-slate-200 active:translate-y-0.5"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 text-lg font-bold transition-colors cursor-pointer select-none border border-slate-200"
                aria-label="Backspace"
              >
                ⌫
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-base transition-colors cursor-pointer"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={inputAnswer.length === 0}
                className={`flex-1 py-3 rounded-2xl font-bold text-base transition-all cursor-pointer shadow-md ${
                  inputAnswer.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-blue-300'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                Unlock
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
