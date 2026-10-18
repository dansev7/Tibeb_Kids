'use client';

// Web Audio Context singleton
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Master volume (0..1) — parent-configured, persisted in localStorage so it
 * applies on every page without visiting the settings screen.
 */
let currentVolume = 0.8;
let volumeLoaded = false;

export function setVolume(volume: number) {
  currentVolume = Math.max(0, Math.min(1, volume));
  volumeLoaded = true;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('little_learner_volume', String(currentVolume));
    } catch {}
  }
}

export function getVolume(): number {
  if (!volumeLoaded && typeof window !== 'undefined') {
    try {
      const stored = parseFloat(localStorage.getItem('little_learner_volume') ?? '');
      if (!isNaN(stored) && stored >= 0 && stored <= 1) {
        currentVolume = stored;
      }
    } catch {}
    volumeLoaded = true;
  }
  return currentVolume;
}

/**
 * Play pleasant positive chime (C5 -> E5 -> G5 -> C6 arpeggio)
 */
export function playChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;
    const vol = getVolume();
    if (vol <= 0) return;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);

      gain.gain.setValueAtTime(0, startTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.25 * vol, startTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + idx * 0.08);
      osc.stop(startTime + idx * 0.08 + 0.4);
    });
  } catch (err) {
    console.debug('Audio playChime error:', err);
  }
}

/**
 * Play a gentle, soft, friendly "boop" for incorrect attempt (no harsh buzzing)
 */
export function playBoop() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const now = ctx.currentTime;
    if (getVolume() <= 0) return;
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

    gain.gain.setValueAtTime(0.15 * getVolume(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch (err) {
    console.debug('Audio playBoop error:', err);
  }
}

/**
 * Play a bubbly pop sound for button clicks or interaction
 */
export function playPop() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    if (getVolume() <= 0) return;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

    gain.gain.setValueAtTime(0.2 * getVolume(), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch (err) {
    console.debug('Audio playPop error:', err);
  }
}

/**
 * Play celebratory victory fanfare
 */
export function playFanfare() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const chords = [
      { freq: 523.25, time: 0.0, dur: 0.15 }, // C5
      { freq: 659.25, time: 0.15, dur: 0.15 }, // E5
      { freq: 783.99, time: 0.3, dur: 0.2 },  // G5
      { freq: 1046.5, time: 0.5, dur: 0.5 },  // C6 (held)
      { freq: 1318.5, time: 0.52, dur: 0.5 }, // E6 harmonic
    ];

    const now = ctx.currentTime;
    const vol = getVolume();
    if (vol <= 0) return;

    chords.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0, now + note.time);
      gain.gain.linearRampToValueAtTime(0.25 * vol, now + note.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur + 0.05);
    });
  } catch (err) {
    console.debug('Audio playFanfare error:', err);
  }
}

/**
 * Voice settings (male vs female, speed multiplier)
 */
export type VoiceGender = 'female' | 'male';

let currentVoiceGender: VoiceGender = 'female';
let currentVoiceSpeed: number = 0.9;
let voiceSettingsLoaded = false;

export function setVoiceSettings(gender: VoiceGender, speed: number) {
  currentVoiceGender = gender;
  currentVoiceSpeed = speed;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('little_learner_voice_gender', gender);
      localStorage.setItem('little_learner_voice_speed', String(speed));
    } catch {}
  }
}

export function getVoiceSettings(): { gender: VoiceGender; speed: number } {
  if (!voiceSettingsLoaded && typeof window !== 'undefined') {
    try {
      const storedGender = localStorage.getItem('little_learner_voice_gender');
      const storedSpeed = localStorage.getItem('little_learner_voice_speed');
      if (storedGender === 'female' || storedGender === 'male') {
        currentVoiceGender = storedGender;
      }
      if (storedSpeed) {
        const parsed = parseFloat(storedSpeed);
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
          currentVoiceSpeed = parsed;
        }
      }
      voiceSettingsLoaded = true;
    } catch {}
  }
  return { gender: currentVoiceGender, speed: currentVoiceSpeed };
}

export function selectVoiceForGender(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
  lang: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const langPrefix = lang.split('-')[0].toLowerCase();
  const matchingLang = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
  const pool = matchingLang.length > 0 ? matchingLang : voices;

  const femaleKeywords = ['female', 'samantha', 'zira', 'karen', 'victoria', 'moira', 'catherine', 'eva', 'fiona', 'jenny', 'aria'];
  const maleKeywords = ['male', 'david', 'alex', 'daniel', 'george', 'fred', 'oliver', 'rishi', 'guy', 'christopher'];

  const targetKeywords = gender === 'female' ? femaleKeywords : maleKeywords;

  const bestMatch = pool.find(v => targetKeywords.some(kw => v.name.toLowerCase().includes(kw)));
  return bestMatch || pool[0] || null;
}

import { isEthiopicText, getAmharicPhonetic } from './amharicSpeech';

/**
 * Spoken speech fallback with configured gender, speed, and Amharic support
 */
export function speakText(text: string, lang = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // Stop prior speech

    const voices = window.speechSynthesis.getVoices();
    const hasAmharic = isEthiopicText(text);

    let textToSpeak = text;
    let targetLang = lang;

    // Check if system has a native Amharic voice installed
    const nativeAmharicVoice = hasAmharic
      ? voices.find(v => v.lang.toLowerCase().startsWith('am'))
      : null;

    if (hasAmharic) {
      if (nativeAmharicVoice) {
        targetLang = 'am-ET';
      } else {
        // Transliterate Amharic script into phonetics so standard TTS pronounces authentic Amharic syllables
        textToSpeak = getAmharicPhonetic(text);
        targetLang = 'en-US';
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = targetLang;

    const { gender, speed } = getVoiceSettings();

    if (hasAmharic && nativeAmharicVoice) {
      utterance.voice = nativeAmharicVoice;
    } else {
      const chosenVoice = selectVoiceForGender(voices, gender, targetLang);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
    }

    // Adjust rate according to parent setting
    utterance.rate = Math.max(0.5, Math.min(1.6, speed));
    utterance.volume = getVolume();

    // Pitch: higher warm pitch for female (~1.2), deeper resonant pitch for male (~0.85)
    utterance.pitch = gender === 'female' ? 1.2 : 0.85;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.debug('SpeechSynthesis error:', err);
  }
}


import { resolveAudioPath, hasCustomVoice } from '@/lib/audioStorage';
export { resolveAudioPath, hasCustomVoice };

/**
 * Play audio from file path, falling back to speech synthesis if file cannot load or is empty.
 * Seamlessly checks for parent-recorded voice in IndexedDB first.
 */
export function playAudioOrSpeech(
  audioPath?: string,
  fallbackText?: string,
  onEnded?: () => void
): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  const resolvedPath = audioPath ? resolveAudioPath(audioPath) : undefined;

  if (resolvedPath && resolvedPath.trim().length > 0) {
    try {
      const audio = new Audio(resolvedPath);
      audio.volume = getVolume();
      let fallbackTriggered = false;

      const triggerFallback = () => {
        if (!fallbackTriggered && fallbackText) {
          fallbackTriggered = true;
          speakText(fallbackText);
          if (onEnded) {
            setTimeout(onEnded, 1000);
          }
        }
      };

      audio.onerror = () => {
        triggerFallback();
      };

      if (onEnded) {
        audio.onended = onEnded;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          triggerFallback();
        });
      }
      return audio;
    } catch {
      if (fallbackText) {
        speakText(fallbackText);
        if (onEnded) setTimeout(onEnded, 1000);
      }
      return null;
    }
  } else if (fallbackText) {
    speakText(fallbackText);
    if (onEnded) setTimeout(onEnded, 1000);
  }
  return null;
}

/**
 * Universal feedback tone player for game interactions
 */
export function playFeedbackTone(type: 'correct' | 'wrong' | 'pop' | 'celebrate') {
  if (type === 'correct') {
    playChime();
  } else if (type === 'wrong') {
    playBoop();
  } else if (type === 'pop') {
    playPop();
  } else if (type === 'celebrate') {
    playFanfare();
  }
}
