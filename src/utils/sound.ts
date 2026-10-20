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
 * Voice settings (male teacher vs parent voice, speed multiplier)
 */
export type VoiceGender = 'male' | 'parent';

let currentVoiceGender: VoiceGender = 'male';
let currentVoiceSpeed: number = 0.9;
let voiceSettingsLoaded = false;

export function setVoiceSettings(gender: VoiceGender, speed: number) {
  currentVoiceGender = gender === 'parent' ? 'parent' : 'male';
  currentVoiceSpeed = speed;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('little_learner_voice_gender', currentVoiceGender);
      localStorage.setItem('little_learner_voice_speed', String(speed));
    } catch {}
  }
}

export function getVoiceSettings(): { gender: VoiceGender; speed: number } {
  if (!voiceSettingsLoaded && typeof window !== 'undefined') {
    try {
      const storedGender = localStorage.getItem('little_learner_voice_gender');
      const storedSpeed = localStorage.getItem('little_learner_voice_speed');
      if (storedGender === 'parent') {
        currentVoiceGender = 'parent';
      } else {
        currentVoiceGender = 'male';
        if (storedGender && storedGender !== 'male') {
          localStorage.setItem('little_learner_voice_gender', 'male');
        }
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

  // Mobile WebKit (iOS) & Android Chrome: speech synthesis voices populate
  // after the first user gesture. Prime voice cache on first touch or click.
  const primeVoicesOnGesture = () => {
    updateVoices();
  };
  window.addEventListener('touchstart', primeVoicesOnGesture, { once: true, passive: true });
  window.addEventListener('pointerdown', primeVoicesOnGesture, { once: true, passive: true });
  window.addEventListener('click', primeVoicesOnGesture, { once: true, passive: true });
}

let currentActiveAudio: HTMLAudioElement | null = null;

export function stopAllSpeech() {
  if (typeof window !== 'undefined') {
    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
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

  // If explicit male tag or name is present, it is NEVER female
  if (
    str.includes('#male') ||
    str.includes('male_') ||
    str.includes('-male') ||
    str.includes('_male') ||
    str.includes(' male') ||
    str.endsWith('male') ||
    str.includes('daniel') ||
    str.includes('david') ||
    str.includes('george') ||
    str.includes('oliver') ||
    str.includes('arthur') ||
    str.includes('fred') ||
    str.includes('rishi') ||
    str.includes('gordon') ||
    str.includes('alex') ||
    str.includes('aaron')
  ) {
    if (!str.includes('female') && !str.includes('woman')) return false;
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
    // Google default US English on Android is female (unless tagged male)
    (str.includes('google us english') && !str.includes('male')) ||
    str.includes('google uk english female') ||
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

  // Standalone or tagged "male"
  if (
    str.includes('male') ||
    str.includes('masculine') ||
    /\b(man|boy)\b/i.test(str)
  ) {
    return true;
  }

  // Android Google TTS specific male voice tags and models:
  // tpf = Google US Male, iom = Google US Male, iol = Google US Male, iob = Google US Male
  // rjs = Google UK Male, fis = Google UK Male, aub = Google AU Male, cxx = Google IN Male
  const androidMaleTags = [
    'tpf', 'iom', 'iol', 'iob', 'rjs', 'fis', 'aub', 'cxx',
    'en-us-x-sfg#male', 'en-us-x-tpf', 'en-us-x-iom', 'en-gb-x-rjs', 'en-gb-x-fis',
    'smt_en_usa_m', 'smt_en_gbr_m',
    'voice 2', 'voice 4', 'voice 6', 'voice 8',
    'voice ii', 'voice iv', 'voice vi', 'voice viii'
  ];
  if (androidMaleTags.some(tag => str.includes(tag))) {
    return true;
  }

  // Common authentic male voice names across iOS, macOS, Windows, Android, Linux:
  const maleNames = [
    'daniel', 'david', 'alex', 'george', 'fred', 'oliver', 'rishi', 'guy',
    'christopher', 'mark', 'ryan', 'james', 'eric', 'steffan', 'brian',
    'tom', 'aaron', 'arthur', 'gordon', 'evan', 'nathan',
    'richard', 'charles', 'martin', 'russell', 'jack', 'thomas', 'lee',
    'm0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'mb-en1'
  ];
  return maleNames.some(name => str.includes(name));
}

export function selectVoiceForGender(
  voices: SpeechSynthesisVoice[],
  _gender?: VoiceGender,
  lang = 'en-US'
): SpeechSynthesisVoice | null {
  const pool = voices && voices.length > 0 ? voices : loadVoices();
  if (!pool || pool.length === 0) return null;

  const targetNorm = lang.toLowerCase().replace('_', '-');
  const langPrefix = targetNorm.split('-')[0];

  // Specific exact locale match (e.g. 'en-us')
  const exactLocaleVoices = pool.filter((v) => (v.lang || '').toLowerCase().replace('_', '-') === targetNorm);
  // Same language family (e.g. 'en-gb', 'en-us', 'en-au')
  const langFamilyVoices = pool.filter((v) => (v.lang || '').toLowerCase().startsWith(langPrefix));
  // All English voices
  const englishVoices = pool.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));

  // 1. Confirmed male voice in exact requested locale (e.g. en-US male)
  const exactLocaleMale = exactLocaleVoices.find(isVoiceMale);
  if (exactLocaleMale) return exactLocaleMale;

  // 2. High-priority standard mobile male voices:
  //    Daniel (standard on iOS), Google UK English Male (standard on Android), George, Guy, David
  const premiumMale = pool.find((v) => {
    const s = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();
    return (
      s.includes('daniel') ||
      s.includes('google uk english male') ||
      s.includes('rjs') ||
      s.includes('tpf') ||
      s.includes('iom') ||
      s.includes('david') ||
      s.includes('george') ||
      s.includes('oliver') ||
      s.includes('arthur')
    );
  });
  if (premiumMale) return premiumMale;

  // 3. Any confirmed male voice in same language family (e.g. en-GB, en-AU, en-IN)
  const familyMale = langFamilyVoices.find(isVoiceMale);
  if (familyMale) return familyMale;

  // 4. Any confirmed male voice in English
  const anyEnglishMale = englishVoices.find(isVoiceMale);
  if (anyEnglishMale) return anyEnglishMale;

  // 5. Any confirmed male voice in entire device pool
  const anyMale = pool.find(isVoiceMale);
  if (anyMale) return anyMale;

  // 6. If no confirmed male voice is installed on device OS:
  //    Prefer a non-female English voice, or fallback to first available
  const nonFemale = exactLocaleVoices.find((v) => !isVoiceFemale(v))
    || langFamilyVoices.find((v) => !isVoiceFemale(v))
    || englishVoices.find((v) => !isVoiceFemale(v));
  if (nonFemale) return nonFemale;

  return pool[0] || null;
}

/**
 * Returns diagnostic information about the voice selected on the current device.
 */
export function getActiveVoiceInfo(_gender?: VoiceGender): {
  name: string;
  lang: string;
  isConfirmedMale: boolean;
  isFallback: boolean;
} {
  const voices = loadVoices();
  const voice = selectVoiceForGender(voices, 'male', 'en-US');
  if (!voice) {
    return { name: 'Default System Voice', lang: 'en-US', isConfirmedMale: false, isFallback: true };
  }
  const isMale = isVoiceMale(voice);
  return {
    name: voice.name || voice.voiceURI || 'System Voice',
    lang: voice.lang || 'en-US',
    isConfirmedMale: isMale,
    isFallback: !isMale,
  };
}

import { isEthiopicText, getAmharicPhonetic } from './amharicSpeech';
import { resolveAudioPath, hasCustomVoice, findCustomVoiceForTextOrItem } from '@/lib/audioStorage';
export { resolveAudioPath, hasCustomVoice, findCustomVoiceForTextOrItem };

function synthesizeSpeech(text: string, lang = 'en-US', gender: VoiceGender = 'male', speed = 0.9) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

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

    const chosenVoice = (hasAmharic && nativeAmharicVoice)
      ? nativeAmharicVoice
      : selectVoiceForGender(voices, gender, targetLang);

    // Synchronize utterance.lang with chosenVoice.lang on mobile
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      if (!hasAmharic || !nativeAmharicVoice) {
        utterance.lang = chosenVoice.lang || targetLang;
      } else {
        utterance.lang = targetLang;
      }
    } else if (voices.length > 0) {
      const langFallback = voices.find(v =>
        v.lang.toLowerCase().startsWith(targetLang.split('-')[0].toLowerCase())
      );
      if (langFallback) {
        utterance.voice = langFallback;
        if (!hasAmharic || !nativeAmharicVoice) {
          utterance.lang = langFallback.lang || targetLang;
        } else {
          utterance.lang = targetLang;
        }
      } else {
        utterance.lang = targetLang;
      }
    } else {
      utterance.lang = targetLang;
    }

    utterance.volume = getVolume();

    // Pitch & Rate tuning for Male Teacher vs Parent Voice:
    if (gender === 'parent') {
      utterance.pitch = 1.05;
      utterance.rate = Math.max(0.5, Math.min(1.6, speed));
    } else {
      // Male teacher voice (the exclusive computer voiceover)
      const isExplicitMale = chosenVoice && isVoiceMale(chosenVoice);
      if (isExplicitMale) {
        // Confirmed male voice active: warm, encouraging, resonant teacher tone
        utterance.pitch = 0.88;
        utterance.rate = Math.max(0.5, Math.min(1.6, speed * 0.95));
      } else {
        // Fallback when phone OS has no male voice pack:
        // Deep pitch 0.55 and noticeably calmer pace (0.8x) gives a distinct,
        // deeper masculine delivery even on devices with limited pitch support.
        utterance.pitch = 0.55;
        utterance.rate = Math.max(0.5, Math.min(1.6, speed * 0.8));
      }
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

  // Standard computer voice style (male teacher)
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
