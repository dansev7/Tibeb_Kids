'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface SpeakerButtonProps {
  /** Path to audio file (e.g. '/audio/letters/a.mp3') */
  audioPath?: string;
  /** Fallback speech text if audioPath fails or is omitted */
  textToSpeak?: string;
  /** Alias for textToSpeak */
  fallbackSpeech?: string;

  /** Size variant (min 64x64px for children) */
  size?: 'sm' | 'md' | 'lg';
  /** Color theme variant */
  variant?: 'primary' | 'amber' | 'emerald' | 'purple';
  /** Optional click callback */
  onClick?: () => void;
  /** Callback fired when audio finishes playing */
  onAudioEnd?: () => void;
  /** Disable button */
  disabled?: boolean;
  /** Accessible label */
  ariaLabel?: string;
  /** Additional CSS class names */
  className?: string;
}

const sizeConfig = {
  sm: {
    btn: 'w-16 h-16 text-2xl shadow-[0_6px_0_#1d4ed8]',
    activeBtn: 'active:shadow-[0_2px_0_#1d4ed8]',
    iconSize: 'w-7 h-7',
    rippleSize: 'inset-[-8px]',
  },
  md: {
    btn: 'w-20 h-20 text-3xl shadow-[0_8px_0_#1d4ed8]',
    activeBtn: 'active:shadow-[0_2px_0_#1d4ed8]',
    iconSize: 'w-9 h-9',
    rippleSize: 'inset-[-12px]',
  },
  lg: {
    btn: 'w-24 h-24 text-4xl shadow-[0_10px_0_#1d4ed8]',
    activeBtn: 'active:shadow-[0_3px_0_#1d4ed8]',
    iconSize: 'w-11 h-11',
    rippleSize: 'inset-[-16px]',
  },
};

const variantColorMap = {
  primary: {
    bg: 'bg-gradient-to-b from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white border-2 border-blue-200',
    shadow: 'shadow-[0_8px_0_#1d4ed8] active:shadow-[0_2px_0_#1d4ed8]',
    ripple: 'bg-blue-400/30',
  },
  amber: {
    bg: 'bg-gradient-to-b from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white border-2 border-amber-200',
    shadow: 'shadow-[0_8px_0_#c2410c] active:shadow-[0_2px_0_#c2410c]',
    ripple: 'bg-amber-400/30',
  },
  emerald: {
    bg: 'bg-gradient-to-b from-emerald-400 to-teal-600 hover:from-emerald-500 hover:to-teal-700 text-white border-2 border-emerald-200',
    shadow: 'shadow-[0_8px_0_#0f766e] active:shadow-[0_2px_0_#0f766e]',
    ripple: 'bg-emerald-400/30',
  },
  purple: {
    bg: 'bg-gradient-to-b from-purple-400 to-indigo-600 hover:from-purple-500 hover:to-indigo-700 text-white border-2 border-purple-200',
    shadow: 'shadow-[0_8px_0_#4338ca] active:shadow-[0_2px_0_#4338ca]',
    ripple: 'bg-purple-400/30',
  },
};

export default function SpeakerButton({
  audioPath,
  textToSpeak,
  fallbackSpeech: fallbackSpeechProp,
  size = 'md',
  variant = 'primary',
  onClick,
  onAudioEnd,
  disabled = false,
  ariaLabel = 'Play sound',
  className = '',
}: SpeakerButtonProps) {
  const actualText = textToSpeak || fallbackSpeechProp;
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);


  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlaySound = async () => {
    if (disabled || isPlaying) return;

    if (onClick) {
      onClick();
    }

    // Try HTML5 Audio if audioPath provided
    if (audioPath) {
      try {
        const { resolveAudioPath } = require('@/lib/audioStorage');
        const resolvedPath = resolveAudioPath(audioPath) || audioPath;

        if (!audioRef.current) {
          audioRef.current = new Audio(resolvedPath);
        } else {
          audioRef.current.src = resolvedPath;
        }

        setIsPlaying(true);

        audioRef.current.onended = () => {
          setIsPlaying(false);
          onAudioEnd?.();
        };

        audioRef.current.onerror = () => {
          // If audio file fails to load, attempt fallback speech synthesis
          fallbackSpeech();
        };

        await audioRef.current.play();
        return;
      } catch {
        fallbackSpeech();
        return;
      }
    }

    // Fallback to Web Speech API
    if (actualText) {
      fallbackSpeech();
    }
  };

  const fallbackSpeech = () => {
    if (typeof window !== 'undefined' && actualText) {
      setIsPlaying(true);
      try {
        const { speakText } = require('@/utils/sound');
        speakText(
          actualText,
          'en-US',
          () => {
            setIsPlaying(false);
            onAudioEnd?.();
          },
          () => {
            setIsPlaying(false);
          }
        );
      } catch {
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  };



  const currentSize = sizeConfig[size];
  const currentColor = variantColorMap[variant];

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Soundwave Ripple Ring when Playing */}
      {isPlaying && (
        <>
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: [1, 1.45, 1.7], opacity: [0.7, 0.35, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className={`absolute ${currentSize.rippleSize} rounded-full ${currentColor.ripple} pointer-events-none`}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: [1, 1.3, 1.5], opacity: [0.6, 0.25, 0] }}
            transition={{
              duration: 1.2,
              delay: 0.4,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className={`absolute ${currentSize.rippleSize} rounded-full ${currentColor.ripple} pointer-events-none`}
          />
        </>
      )}

      {/* Main Speaker Button */}
      <motion.button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={handlePlaySound}
        whileHover={disabled ? undefined : { scale: 1.08 }}
        whileTap={disabled ? undefined : { scale: 0.92, y: 3 }}
        animate={isPlaying ? { scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] } : {}}
        transition={
          isPlaying
            ? { repeat: Infinity, duration: 0.6, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 450, damping: 15 }
        }
        className={`relative rounded-full flex items-center justify-center cursor-pointer transition-colors active:translate-y-1 ${
          currentSize.btn
        } ${currentColor.bg} ${currentColor.shadow} ${
          disabled ? 'opacity-40 cursor-not-allowed shadow-none' : ''
        }`}
      >
        {/* Gloss shine highlight */}
        <span
          aria-hidden="true"
          className="absolute top-1.5 left-2.5 right-2.5 h-1/3 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none"
        />

        {/* Big Crisp Speaker SVG Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${currentSize.iconSize} drop-shadow-md text-white`}
          aria-hidden="true"
        >
          {/* Speaker cone */}
          <path d="M13.5 4.06c0-1.33-1.61-2-2.55-1.06L6.88 7.07H3.75C2.78 7.07 2 7.85 2 8.82v6.36c0 .97.78 1.75 1.75 1.75h3.13l4.07 4.07c.94.94 2.55.27 2.55-1.06V4.06z" />
          {/* Waves */}
          <path
            d="M17.5 7.5c1.7 1.7 2.5 3.5 2.5 5.5s-.8 3.8-2.5 5.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M20.5 4.5c2.6 2.6 3.5 5.3 3.5 7.5s-.9 4.9-3.5 7.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </motion.button>
    </div>
  );
}
