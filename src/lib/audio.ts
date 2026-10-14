'use client';

import { Howl, Howler } from 'howler';

/**
 * Cache of Howl audio instances indexed by audio URL/path.
 */
const audioCache = new Map<string, Howl>();

/**
 * Feedback sound file paths.
 */
export const FEEDBACK_AUDIO_PATHS = {
  correct: '/audio/sfx/correct.mp3',
  wrong: '/audio/sfx/wrong.mp3',
  celebrate: '/audio/sfx/celebrate.mp3',
} as const;

export type FeedbackType = keyof typeof FEEDBACK_AUDIO_PATHS;

export interface PlaySoundOptions {
  volume?: number;
  rate?: number;
  loop?: boolean;
  onend?: () => void;
  onloaderror?: (id: number, error: unknown) => void;
  onplayerror?: (id: number, error: unknown) => void;
}

/**
 * Fallback Web Audio synthesizer for cheerful feedback tones
 * in case audio files are missing or loading over slow connections.
 */
function playSynthesizedFeedback(type: FeedbackType): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'correct') {
      // Cheerful major chord arpeggio (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } else if (type === 'wrong') {
      // Gentle, non-punitive boing tone (no harsh buzzing)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'celebrate') {
      // Fanfare: C5 -> E5 -> G5 -> C6 celebration
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.1;
        const dur = idx === notes.length - 1 ? 0.6 : 0.2;

        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur + 0.05);
      });
    }
  } catch {
    // Ignore synthesizer errors
  }
}

/**
 * Preload an array of audio paths into memory.
 */
export function preloadAudio(paths: string[]): void {
  if (typeof window === 'undefined') return;

  for (const path of paths) {
    if (!path || audioCache.has(path)) continue;

    try {
      const sound = new Howl({
        src: [path],
        preload: true,
        html5: true,
      });
      audioCache.set(path, sound);
    } catch (err) {
      console.warn(`[audio] Failed to preload sound: ${path}`, err);
    }
  }
}

/**
 * Plays a sound file with Howler, using cached instance if available.
 */
export function playSound(path: string, options?: PlaySoundOptions): Howl | null {
  if (typeof window === 'undefined' || !path) return null;

  try {
    let sound = audioCache.get(path);

    if (!sound) {
      sound = new Howl({
        src: [path],
        html5: true,
        volume: options?.volume ?? 1.0,
        rate: options?.rate ?? 1.0,
        loop: options?.loop ?? false,
      });
      audioCache.set(path, sound);
    } else {
      if (options?.volume !== undefined) sound.volume(options.volume);
      if (options?.rate !== undefined) sound.rate(options.rate);
      if (options?.loop !== undefined) sound.loop(options.loop);
    }

    if (options?.onend) {
      sound.once('end', options.onend);
    }

    if (options?.onloaderror) {
      sound.once('loaderror', options.onloaderror);
    }

    if (options?.onplayerror) {
      sound.once('playerror', options.onplayerror);
    }

    sound.play();
    return sound;
  } catch (err) {
    console.warn(`[audio] Error playing sound: ${path}`, err);
    return null;
  }
}

/**
 * Plays tactile audio feedback: 'correct' | 'wrong' | 'celebrate'.
 * Uses Howler with fallback to Web Audio API synthesizer for guaranteed sound.
 */
export function playFeedback(type: FeedbackType): Howl | null {
  if (typeof window === 'undefined') return null;

  const audioPath = FEEDBACK_AUDIO_PATHS[type];

  try {
    const sound = playSound(audioPath, {
      onloaderror: () => {
        // Fallback to web audio synth if audio asset is missing
        playSynthesizedFeedback(type);
      },
      onplayerror: () => {
        playSynthesizedFeedback(type);
      },
    });

    // If sound couldn't be initialized, synthesize immediately
    if (!sound) {
      playSynthesizedFeedback(type);
    }

    return sound;
  } catch {
    playSynthesizedFeedback(type);
    return null;
  }
}

/**
 * Stop all active sounds playing in Howler.
 */
export function stopAllSounds(): void {
  if (typeof window === 'undefined') return;
  try {
    Howler.stop();
  } catch {
    // ignore
  }
}

/**
 * Set master volume for all Howler sounds (0.0 to 1.0).
 */
export function setGlobalVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  try {
    Howler.volume(Math.max(0, Math.min(1, volume)));
  } catch {
    // ignore
  }
}
