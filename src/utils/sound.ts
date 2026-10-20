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
 * Voice settings (male vs female vs parent, speed multiplier)
 */
export type VoiceGender = 'female' | 'male' | 'parent';

let currentVoiceGender: VoiceGender = 'male';
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
      if (storedGender === 'female' || storedGender === 'male' || storedGender === 'parent') {
        currentVoiceGender = storedGender;
      } else {
        currentVoiceGender = 'male';
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

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const list = window.speechSynthesis.getVoices();
    if (list && list.length > 0) {
      cachedVoices = list;
      return cachedVoices;
    }
  } catch {}
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const updateVoices = () => {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
      }
    } catch {}
  };

  updateVoices();
  try {
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
  } catch {}
  try {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  } catch {}
}

let currentActiveAudio: HTMLAudioElement | null = null;

export function stopAllSpeech() {
  if (typeof window !== 'undefined') {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
  if (currentActiveAudio) {
    try {
      currentActiveAudio.pause();
      currentActiveAudio.currentTime = 0;
    } catch {}
    currentActiveAudio = null;
  }
}

/**
 * Determine whether a SpeechSynthesisVoice is female across Android, iOS, Windows, Mac, and Linux.
 */
export function isVoiceFemale(v: SpeechSynthesisVoice): boolean {
  const str = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();

  // If explicit male tag is present (e.g. #male_1), it is NOT female
  if (
    str.includes('#male') ||
    str.includes('male_') ||
    str.includes('-male') ||
    str.includes('_male') ||
    str.includes(' male') ||
    str.endsWith('male')
  ) {
    if (!str.includes('female')) return false;
  }

  if (
    str.includes('female') ||
    str.includes('woman') ||
    str.includes('girl') ||
    str.includes('feminine') ||
    str.includes('#female') ||
    str.includes('female_') ||
    str.includes('-female') ||
    str.includes('_female') ||
    // Android Google TTS female offline/network tags
    str.includes('sfg-local') ||
    str.includes('sfg-network') ||
    str.includes('sfg#female') ||
    str.includes('iog-local') ||
    str.includes('iog-network') ||
    str.includes('tpc-local') ||
    str.includes('tpc-network') ||
    str.includes('gba-local') ||
    str.includes('gba-network') ||
    // Samsung TTS female tags
    str.includes('smt_en_usa_f') ||
    str.includes('smt_en_gbr_f') ||
    // Google default US English on Android is female
    str === 'google us english' ||
    str.includes('google us english') ||
    // Well-known female voice names across Apple, Microsoft, Android
    str.includes('zira') ||
    str.includes('samantha') ||
    str.includes('karen') ||
    str.includes('victoria') ||
    str.includes('moira') ||
    str.includes('catherine') ||
    str.includes('eva') ||
    str.includes('fiona') ||
    str.includes('jenny') ||
    str.includes('aria') ||
    str.includes('ava') ||
    str.includes('allison') ||
    str.includes('susan') ||
    str.includes('hazel') ||
    str.includes('zoe') ||
    str.includes('lucy') ||
    str.includes('kate') ||
    str.includes('stephanie') ||
    str.includes('helena') ||
    str.includes('heera') ||
    str.includes('kalpana') ||
    str.includes('ayanda') ||
    str.includes('tessa') ||
    str.includes('serena') ||
    str.includes('yuri') ||
    str.includes('kyoko') ||
    str.includes('ting-ting')
  ) {
    return true;
  }

  return false;
}

/**
 * Determine whether a SpeechSynthesisVoice is male across Android, iOS, Windows, Mac, and Linux.
 */
export function isVoiceMale(v: SpeechSynthesisVoice): boolean {
  const str = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();

  // If flagged as female, it is NEVER male
  if (isVoiceFemale(v)) return false;

  // Standalone or tagged "male" (e.g. #male_1, male-local, Google UK English Male)
  if (
    str.includes('male') ||
    str.includes('masculine') ||
    /\b(man|boy)\b/i.test(str)
  ) {
    return true;
  }

  // Android Google TTS specific male voice tags:
  // tpf = Google US Male, iom = Google US Male, iol = Google US Male, iob = Google US Male
  // rjs = Google UK Male, fis = Google UK Male, aub = Google AU Male, cxx = Google IN Male
  const androidMaleTags = [
    'tpf', 'iom', 'iol', 'iob', 'rjs', 'fis', 'aub', 'cxx',
    'en-us-x-sfg#male', 'en-us-x-tpf', 'en-us-x-iom', 'en-gb-x-rjs', 'en-gb-x-fis',
    'smt_en_usa_m', 'smt_en_gbr_m'
  ];
  if (androidMaleTags.some(tag => str.includes(tag))) {
    return true;
  }

  // Common male voice names across Windows, Apple iOS/macOS, Android, Linux:
  const maleNames = [
    'david', 'alex', 'daniel', 'george', 'fred', 'oliver', 'rishi', 'guy',
    'christopher', 'mark', 'ryan', 'james', 'eric', 'steffan', 'brian',
    'tom', 'aaron', 'arthur', 'gordon', 'nicky', 'evan', 'nathan',
    'richard', 'charles', 'martin', 'russell', 'jack', 'thomas', 'lee',
    'm0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'mb-en1'
  ];
  return maleNames.some(name => str.includes(name));
}

export function selectVoiceForGender(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
  lang: string
): SpeechSynthesisVoice | null {
  const pool = voices && voices.length > 0 ? voices : loadVoices();
  if (!pool || pool.length === 0) return null;

  const langPrefix = lang.split('-')[0].toLowerCase();
  const matchingLang = pool.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  const englishVoices = pool.filter((v) => v.lang.toLowerCase().startsWith('en'));

  if (gender === 'male') {
    // 1. Look for confirmed male voice in requested language (e.g. en-US)
    const exactMatch = matchingLang.find(isVoiceMale);
    if (exactMatch) return exactMatch;

    // 2. Look for confirmed male voice in ANY English locale (en-GB, en-AU, en-IN, etc.)
    const anyEnglishMale = englishVoices.find(isVoiceMale);
    if (anyEnglishMale) return anyEnglishMale;

    // 3. Look for confirmed male voice in entire pool
    const anyMale = pool.find(isVoiceMale);
    if (anyMale) return anyMale;

    // 4. CRITICAL: If no true male voice exists in the OS/browser, DO NOT return a female voice!
    // Returning null ensures synthesizeSpeech does NOT bind utterance.voice to a female voice object,
    // allowing pitch (0.65) to lower the default stream into an authentic masculine register!
    return null;
  } else {
    // Female voice
    // 1. Look for confirmed female voice in requested language
    const exactMatch = matchingLang.find(isVoiceFemale);
    if (exactMatch) return exactMatch;

    // 2. Look for confirmed female voice in ANY English locale
    const anyEnglishFemale = englishVoices.find(isVoiceFemale);
    if (anyEnglishFemale) return anyEnglishFemale;

    // 3. Look for non-male voice in requested language (e.g. Google US English default)
    const nonMale = matchingLang.find((v) => !isVoiceMale(v));
    if (nonMale) return nonMale;

    // 4. Fallback to candidate in matching language or pool
    return matchingLang[0] || pool[0] || null;
  }
}

import { isEthiopicText, getAmharicPhonetic } from './amharicSpeech';
import { resolveAudioPath, hasCustomVoice, findCustomVoiceForTextOrItem } from '@/lib/audioStorage';
export { resolveAudioPath, hasCustomVoice, findCustomVoiceForTextOrItem };

function synthesizeSpeech(text: string, lang = 'en-US', gender: VoiceGender = 'male', speed = 0.9) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // Stop prior speech

    const voices = loadVoices();
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

    const chosenVoice = (hasAmharic && nativeAmharicVoice)
      ? nativeAmharicVoice
      : selectVoiceForGender(voices, gender, targetLang);

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.volume = getVolume();

    // Pitch & Rate tuning for Male vs Female vs Parent:
    if (gender === 'male') {
      const isExplicitMale = chosenVoice && isVoiceMale(chosenVoice);
      if (isExplicitMale) {
        // A confirmed male voice is active: resonant, warm, encouraging teacher pitch
        utterance.pitch = 0.88;
        utterance.rate = Math.max(0.5, Math.min(1.6, speed));
      } else {
        // Fallback when device OS has no male voice pack:
        // Deep pitch 0.65 and slightly slower pace (0.92x) shifts the unassigned default stream into a distinct masculine register
        utterance.pitch = 0.65;
        utterance.rate = Math.max(0.5, Math.min(1.6, speed * 0.92));
      }
    } else if (gender === 'parent') {
      utterance.pitch = 1.05;
      utterance.rate = Math.max(0.5, Math.min(1.6, speed));
    } else {
      // Female voice: cheerful, bright, friendly teacher pitch
      utterance.pitch = 1.15;
      utterance.rate = Math.max(0.5, Math.min(1.6, speed));
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.debug('SpeechSynthesis error:', err);
  }
}

/**
 * Spoken speech fallback with configured gender, speed, and Amharic support.
 * If Parent Voiceover style is active, ALWAYS cross-checks if a parent recording exists
 * for this word or letter first, seamlessly falling back to computer speech if not.
 */
export function speakText(text: string, lang = 'en-US') {
  if (typeof window === 'undefined') return;

  const { gender, speed } = getVoiceSettings();

  // If Parent Voiceover style is active, cross-check if there is a parent voice for this word or letter!
  if (gender === 'parent') {
    const parentBlobUrl = findCustomVoiceForTextOrItem(undefined, text);
    if (parentBlobUrl) {
      try {
        const audio = new Audio(parentBlobUrl);
        audio.volume = getVolume();
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Fall back to computer voice synthesis if audio play fails
            synthesizeSpeech(text, lang, gender, speed);
          });
        }
        return;
      } catch {
        // Fall back to synthesis
      }
    }
  }

  // Choose computer voiceover
  synthesizeSpeech(text, lang, gender, speed);
}

/**
 * Play audio from file path or custom parent recording.
 * When Teacher Voiceover style is 'parent', ALWAYS cross-checks if a parent recording exists
 * for the letter, word, or teaching prompt. If none exists, automatically chooses computer voiceover!
 */
export function playAudioOrSpeech(
  audioPath?: string,
  fallbackText?: string,
  onEnded?: () => void
): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  const { gender } = getVoiceSettings();

  // In Parent Voiceover style, ALWAYS cross-check if a parent recording exists for this item or word/letter!
  if (gender === 'parent') {
    const parentBlobUrl = findCustomVoiceForTextOrItem(audioPath, fallbackText);
    if (parentBlobUrl) {
      try {
        const audio = new Audio(parentBlobUrl);
        audio.volume = getVolume();
        currentActiveAudio = audio;
        let fallbackTriggered = false;

        const triggerFallback = () => {
          if (currentActiveAudio === audio) currentActiveAudio = null;
          if (!fallbackTriggered && fallbackText) {
            fallbackTriggered = true;
            speakText(fallbackText);
            if (onEnded) setTimeout(onEnded, 1000);
          }
        };

        audio.onerror = () => triggerFallback();
        audio.onended = () => {
          if (currentActiveAudio === audio) currentActiveAudio = null;
          if (onEnded) onEnded();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => triggerFallback());
        }
        return audio;
      } catch {
        if (fallbackText) {
          speakText(fallbackText);
          if (onEnded) setTimeout(onEnded, 1000);
        }
        return null;
      }
    }

    // No parent voice exists for this specific letter, word, or prompt -> Choose computer voiceover!
    if (fallbackText) {
      speakText(fallbackText);
      if (onEnded) setTimeout(onEnded, 1000);
    }
    return null;
  }

  // Standard computer voice style (female or male)
  const resolvedPath = audioPath ? resolveAudioPath(audioPath) : undefined;
  if (resolvedPath && resolvedPath.startsWith('blob:')) {
    try {
      const audio = new Audio(resolvedPath);
      audio.volume = getVolume();
      currentActiveAudio = audio;
      let fallbackTriggered = false;

      const triggerFallback = () => {
        if (currentActiveAudio === audio) currentActiveAudio = null;
        if (!fallbackTriggered && fallbackText) {
          fallbackTriggered = true;
          speakText(fallbackText);
          if (onEnded) setTimeout(onEnded, 1000);
        }
      };

      audio.onerror = () => triggerFallback();
      audio.onended = () => {
        if (currentActiveAudio === audio) currentActiveAudio = null;
        if (onEnded) onEnded();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => triggerFallback());
      }
      return audio;
    } catch {
      if (fallbackText) {
        speakText(fallbackText);
        if (onEnded) setTimeout(onEnded, 1000);
      }
      return null;
    }
  }

  // Choose computer voiceover
  if (fallbackText) {
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
