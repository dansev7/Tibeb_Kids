'use client';

import { setVolume, setVoiceSettings, type VoiceGender } from '@/utils/sound';

export interface AppSettings {
  childName: string;
  sessionLimitMin: number;
  volume: number;
  voiceGender: VoiceGender;
  voiceSpeed: number;
  enabledWorlds: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  childName: 'Learner',
  sessionLimitMin: 15,
  volume: 0.8,
  voiceGender: 'male',
  voiceSpeed: 0.9,
  enabledWorlds: ['abc-garden', 'number-farm', 'fidel-village'],
};

/** Parent-configured settings used across kid screens (volume, voice, limits). */
export async function fetchSettings(): Promise<AppSettings> {
  try {
    const res = await fetch('/api/parent/settings');
    if (!res.ok) return DEFAULT_SETTINGS;
    const data = await res.json();
    if (!data || data.error) return DEFAULT_SETTINGS;
    return {
      childName: typeof data.childName === 'string' ? data.childName : DEFAULT_SETTINGS.childName,
      sessionLimitMin: typeof data.sessionLimitMin === 'number' ? data.sessionLimitMin : DEFAULT_SETTINGS.sessionLimitMin,
      volume: typeof data.volume === 'number' ? data.volume : DEFAULT_SETTINGS.volume,
      voiceGender: data.voiceGender === 'parent' ? 'parent' : (data.voiceGender === 'female' ? 'female' : 'male'),
      voiceSpeed: typeof data.voiceSpeed === 'number' ? data.voiceSpeed : DEFAULT_SETTINGS.voiceSpeed,
      enabledWorlds: Array.isArray(data.enabledWorlds) && data.enabledWorlds.length > 0
        ? data.enabledWorlds
        : DEFAULT_SETTINGS.enabledWorlds,
    };
  } catch {
    let localGender: VoiceGender = 'male';
    let localSpeed = 0.9;
    let localVolume = 0.8;
    if (typeof window !== 'undefined') {
      try {
        const g = localStorage.getItem('little_learner_voice_gender');
        if (g === 'parent' || g === 'female' || g === 'male') {
          localGender = g;
        } else {
          localGender = 'male';
        }
        const sp = parseFloat(localStorage.getItem('little_learner_voice_speed') ?? '');
        if (!isNaN(sp)) localSpeed = sp;
        const vol = parseFloat(localStorage.getItem('little_learner_volume') ?? '');
        if (!isNaN(vol)) localVolume = vol;
      } catch {}
    }
    return {
      ...DEFAULT_SETTINGS,
      voiceGender: localGender,
      voiceSpeed: localSpeed,
      volume: localVolume,
    };
  }
}

/** Push settings into the audio engine so they apply everywhere. */
export function applySettings(s: AppSettings) {
  setVolume(s.volume);
  setVoiceSettings(s.voiceGender, s.voiceSpeed);
}
