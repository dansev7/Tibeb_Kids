'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setVoiceSettings, speakText, stopAllSpeech, setVolume, getActiveVoiceInfo, type VoiceGender } from '@/utils/sound';
import {
  getCustomVoiceCount,
  getGlobalVoicePreference,
  setGlobalVoicePreference,
  initVoiceStudioStorage,
  getAllCustomVoiceKeys,
  getCustomVoiceBlobUrl,
} from '@/lib/audioStorage';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    childName: 'Learner',
    sessionLimitMin: 15,
    volume: 0.8,
    voiceGender: 'male' as VoiceGender,
    voiceSpeed: 0.9,
    enabledWorlds: ['abc-garden', 'number-farm', 'fidel-village'],
  });
  const [saved, setSaved] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [swActive, setSwActive] = useState(false);
  const [voiceCount, setVoiceCount] = useState(0);
  const [globalVoicePref, setGlobalVoicePref] = useState<'parent' | 'computer'>('parent');
  const [activeVoiceInfo, setActiveVoiceInfo] = useState<{
    name: string;
    lang: string;
    isConfirmedMale: boolean;
    isFallback: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsPwaInstalled(isStandalone);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => setSwActive(true)).catch(() => {});
      }

      initVoiceStudioStorage().then(() => {
        setVoiceCount(getCustomVoiceCount());
        setGlobalVoicePref(getGlobalVoicePreference());
      });
    }

    fetch('/api/parent/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          const loadedGender: VoiceGender = (data.voiceGender === 'male' || data.voiceGender === 'female' || data.voiceGender === 'parent')
            ? data.voiceGender
            : 'male';

          setSettings(prev => ({
            childName: data.childName || prev.childName,
            sessionLimitMin: typeof data.sessionLimitMin === 'number' ? data.sessionLimitMin : prev.sessionLimitMin,
            volume: typeof data.volume === 'number' ? data.volume : prev.volume,
            voiceGender: loadedGender,
            voiceSpeed: typeof data.voiceSpeed === 'number' ? data.voiceSpeed : prev.voiceSpeed,
            enabledWorlds: Array.isArray(data.enabledWorlds) ? data.enabledWorlds : prev.enabledWorlds,
          }));
          setVoiceSettings(loadedGender, data.voiceSpeed ?? 0.9);
          setVolume(typeof data.volume === 'number' ? data.volume : 0.8);
          if (loadedGender === 'parent') {
            setGlobalVoicePreference('parent');
            setGlobalVoicePref('parent');
          } else {
            setGlobalVoicePreference('computer');
            setGlobalVoicePref('computer');
          }

          try {
            setActiveVoiceInfo(getActiveVoiceInfo(loadedGender));
          } catch {}
        }
      })
      .catch(console.error);

    const handleVoicesChanged = () => {
      try {
        setActiveVoiceInfo(getActiveVoiceInfo(settings.voiceGender));
      } catch {}
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      }
    };
  }, [settings.voiceGender]);

  const handleSave = () => {
    setVoiceSettings(settings.voiceGender, settings.voiceSpeed);
    setVolume(settings.volume);
    if (settings.voiceGender === 'parent') {
      setGlobalVoicePreference('parent');
      setGlobalVoicePref('parent');
    } else {
      setGlobalVoicePreference('computer');
      setGlobalVoicePref('computer');
    }

    fetch('/api/parent/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(console.error);
  };

  const handleTestVoice = (gender: VoiceGender = settings.voiceGender, speed = settings.voiceSpeed) => {
    setIsTestingVoice(true);
    setVoiceSettings(gender, speed);
    stopAllSpeech();

    if (gender === 'parent') {
      const allKeys = Array.from(getAllCustomVoiceKeys());
      if (allKeys.length > 0) {
        const sampleKey = allKeys[0];
        const blobUrl = getCustomVoiceBlobUrl(sampleKey);
        if (blobUrl) {
          try {
            const audio = new Audio(blobUrl);
            audio.volume = settings.volume;
            audio.onended = () => setIsTestingVoice(false);
            audio.play().catch(() => {
              speakText(`Parent voice is active for ${settings.childName}!`);
              setTimeout(() => setIsTestingVoice(false), 2000);
            });
            return;
          } catch {}
        }
      }
      speakText(`Hello ${settings.childName}! Parent Voiceover is active. Any letters you record in Voice Studio play in your natural voice, and unrecorded ones automatically use computer voice!`);
      setTimeout(() => setIsTestingVoice(false), 3000);
    } else if (gender === 'male') {
      speakText(`Hello ${settings.childName}! I am your male teacher. Let's play and learn together!`);
      setTimeout(() => setIsTestingVoice(false), 2500);
    } else {
      speakText(`Hello ${settings.childName}! Welcome to Little Learner. Let's play and learn together!`);
      setTimeout(() => setIsTestingVoice(false), 2500);
    }
  };

  const toggleWorld = (worldId: string) => {
    setSettings(prev => {
      const current = Array.isArray(prev.enabledWorlds) ? prev.enabledWorlds : ['abc-garden', 'number-farm', 'fidel-village'];
      return {
        ...prev,
        enabledWorlds: current.includes(worldId)
          ? current.filter(w => w !== worldId)
          : [...current, worldId],
      };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-lg mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/parent')}
            className="text-gray-500 hover:text-gray-700 font-semibold cursor-pointer"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">⚙️ Parent Settings</h1>
          <div />
        </div>

        <div className="space-y-6">
          {/* Child Name */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <label className="block text-sm font-semibold text-gray-600 mb-2">Child&apos;s Name</label>
            <input
              type="text"
              value={settings.childName}
              onChange={(e) => setSettings(prev => ({ ...prev, childName: e.target.value }))}
              className="w-full text-xl font-bold border-2 border-gray-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Voiceover Style Selector (Female, Male, Parent) */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                Teacher Voiceover Style
              </label>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                3 Options
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* 1. Female Voice */}
              <button
                type="button"
                onClick={() => {
                  setSettings(prev => ({ ...prev, voiceGender: 'female' }));
                  setGlobalVoicePreference('computer');
                  setGlobalVoicePref('computer');
                  handleTestVoice('female', settings.voiceSpeed);
                }}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-3 transition-all cursor-pointer ${
                  settings.voiceGender === 'female'
                    ? 'border-purple-500 bg-purple-50/80 shadow-md scale-102 ring-2 ring-purple-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-3xl mb-1">👩‍🏫</span>
                <span className="font-bold text-gray-800 text-sm">Female Voice</span>
                <span className="text-[11px] text-purple-600 font-semibold mt-0.5">Warm & Cheerful</span>
                <span className="text-[10px] text-gray-400">Computer TTS</span>
              </button>

              {/* 2. Male Voice */}
              <button
                type="button"
                onClick={() => {
                  setSettings(prev => ({ ...prev, voiceGender: 'male' }));
                  setGlobalVoicePreference('computer');
                  setGlobalVoicePref('computer');
                  handleTestVoice('male', settings.voiceSpeed);
                }}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-3 transition-all cursor-pointer ${
                  settings.voiceGender === 'male'
                    ? 'border-blue-500 bg-blue-50/80 shadow-md scale-102 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-3xl mb-1">👨‍🏫</span>
                <span className="font-bold text-gray-800 text-sm">Male Voice</span>
                <span className="text-[11px] text-blue-600 font-semibold mt-0.5">Encouraging & Clear</span>
                <span className="text-[10px] text-gray-400">Computer TTS</span>
              </button>

              {/* 3. Parent Voice (Recommended) */}
              <button
                type="button"
                onClick={() => {
                  setSettings(prev => ({ ...prev, voiceGender: 'parent' }));
                  setGlobalVoicePreference('parent');
                  setGlobalVoicePref('parent');
                  handleTestVoice('parent', settings.voiceSpeed);
                }}
                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-3 transition-all cursor-pointer relative ${
                  settings.voiceGender === 'parent'
                    ? 'border-emerald-500 bg-emerald-50/80 shadow-md scale-102 ring-2 ring-emerald-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-3xl mb-1">🎙️</span>
                <span className="font-bold text-gray-800 text-sm">Parent Voice</span>
                <span className="text-[11px] text-emerald-600 font-semibold mt-0.5">Family Voice First</span>
                <span className="text-[10px] text-gray-400">
                  {voiceCount > 0 ? `${voiceCount} Saved • Auto Fallback` : 'Auto Fallback'}
                </span>
                {voiceCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                    {voiceCount} Active
                  </span>
                )}
              </button>
            </div>

            {/* Contextual Status / Helper Banner */}
            {settings.voiceGender === 'parent' ? (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl shrink-0 mt-0.5">🎙️</span>
                  <div>
                    <div className="font-bold text-emerald-800">
                      Parent Voice Active (Cross-Check Enabled)
                    </div>
                    <p className="text-emerald-700 text-[11px] mt-0.5 leading-relaxed">
                      Little Learner cross-checks every letter, word, and fidel for your recorded voice.
                      If an item hasn&apos;t been recorded yet, the clear computer voice seamlessly steps in!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/parent/voice-studio')}
                  className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Voice Studio ({voiceCount}) →
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span>
                    Active Voice: <strong>{settings.voiceGender === 'female' ? '👩‍🏫 Female Teacher (Warm & Cheerful)' : '👨‍🏫 Male Teacher (Encouraging & Clear)'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTestVoice(settings.voiceGender, settings.voiceSpeed)}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Test Voice 🔊
                  </button>
                </div>
                {activeVoiceInfo && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                    <span className="truncate">
                      Device Voice: <strong>{activeVoiceInfo.name} ({activeVoiceInfo.lang})</strong>
                    </span>
                    <span className={`self-start sm:self-auto px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      settings.voiceGender === 'male' && !activeVoiceInfo.isConfirmedMale
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {settings.voiceGender === 'male' && !activeVoiceInfo.isConfirmedMale ? '⚡ Pitch/Pace Shifted' : '✓ Hardware Voice'}
                    </span>
                  </div>
                )}
                {settings.voiceGender === 'male' && activeVoiceInfo?.isFallback && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200/80 leading-relaxed mt-1">
                    💡 <strong>Tip for Android:</strong> If your phone only has female voice files downloaded, open phone <strong>Settings → Accessibility → Text-to-speech output → Install voice data → English → select Male/Voice 2</strong> to hear an authentic human-sounding male teacher.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voiceover Speed Adjustment */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-600">
                Voice Speed: <span className="text-blue-600 font-bold">{(settings.voiceSpeed ?? 0.9).toFixed(1)}x</span>
              </label>
              <button
                type="button"
                onClick={() => handleTestVoice(settings.voiceGender || 'male', settings.voiceSpeed ?? 0.9)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isTestingVoice
                    ? 'bg-amber-400 text-white animate-pulse'
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                }`}
              >
                🔊 {isTestingVoice ? 'Speaking...' : 'Test Voice'}
              </button>
            </div>

            <input
              type="range"
              min="0.6"
              max="1.4"
              step="0.1"
              value={settings.voiceSpeed ?? 0.9}
              onChange={(e) => {
                const newSpeed = parseFloat(e.target.value);
                setSettings(prev => ({ ...prev, voiceSpeed: newSpeed }));
                setVoiceSettings(settings.voiceGender || 'male', newSpeed);
              }}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>0.6x (Slower)</span>
              <span className="text-blue-500 font-semibold">0.9x (KG Recommended)</span>
              <span>1.4x (Faster)</span>
            </div>
          </div>

          {/* Parent Audio Voice Studio Card */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎙️</span>
                  <h3 className="font-bold text-lg">Human Voice Studio</h3>
                  <span className="bg-amber-400 text-slate-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {voiceCount > 0 ? `${voiceCount} Saved` : 'Recommended'}
                  </span>
                </div>
                <p className="text-xs text-white/90 max-w-md">
                  Record your own natural voice for letters, fidels, and prompts in 2 seconds per item.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/parent/voice-studio')}
                className="px-4 py-2.5 bg-white text-indigo-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer shadow"
              >
                Open Voice Studio →
              </button>
            </div>

            {/* Voice Source Switch: Parent vs Computer */}
            {voiceCount > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span>Active Voice in Games:</span>
                <div className="inline-flex rounded-lg bg-black/20 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSettings(prev => ({ ...prev, voiceGender: 'parent' }));
                      setVoiceSettings('parent', settings.voiceSpeed);
                      setGlobalVoicePreference('parent');
                      setGlobalVoicePref('parent');
                    }}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      globalVoicePref === 'parent' && settings.voiceGender === 'parent'
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    🎙️ Parent Voice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings(prev => ({ ...prev, voiceGender: prev.voiceGender === 'parent' ? 'male' : prev.voiceGender }));
                      setVoiceSettings(settings.voiceGender === 'parent' ? 'male' : settings.voiceGender, settings.voiceSpeed);
                      setGlobalVoicePreference('computer');
                      setGlobalVoicePref('computer');
                    }}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      globalVoicePref === 'computer' || settings.voiceGender !== 'parent'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    🤖 Computer Voice
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Session Time Limit */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-gray-600">
                Session Time Limit: <span className="text-blue-600 font-bold">{settings.sessionLimitMin ?? 15} minutes</span>
              </label>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                Optional Reminder
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Gentle reminder to rest eyes. Taking a break is optional — children can choose to keep playing!
            </p>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={settings.sessionLimitMin ?? 15}
              onChange={(e) => setSettings(prev => ({ ...prev, sessionLimitMin: parseInt(e.target.value) || 15 }))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5 min</span>
              <span>15 min</span>
              <span>30 min</span>
              <span>60 min</span>
            </div>
          </div>

          {/* Volume */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Sound Volume: <span className="text-blue-600 font-bold">{Math.round((settings.volume ?? 0.8) * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume ?? 0.8}
              onChange={(e) => setSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) || 0.8 }))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Enabled Worlds */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <label className="block text-sm font-semibold text-gray-600 mb-3">Enabled Worlds</label>
            <div className="space-y-3">
              {[
                { id: 'abc-garden', emoji: '🔤', name: 'ABC Garden', color: 'emerald' },
                { id: 'number-farm', emoji: '🔢', name: 'Number Farm', color: 'amber' },
                { id: 'fidel-village', emoji: 'ፊ', name: 'Fidel Village', color: 'purple' },
              ].map(world => {
                const isEnabled = Array.isArray(settings.enabledWorlds)
                  ? settings.enabledWorlds.includes(world.id)
                  : true;

                return (
                  <label
                    key={world.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleWorld(world.id)}
                      className="w-6 h-6 rounded accent-blue-500"
                    />
                    <span className="text-2xl">{world.emoji}</span>
                    <span className="font-semibold text-gray-700">{world.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* PWA & Offline Installation Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📲</span>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">PWA Home Screen & Offline Play</h3>
                  <p className="text-xs text-gray-500">Install app on phone, tablet or desktop for offline play without Wi-Fi</p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  isPwaInstalled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {isPwaInstalled ? '✓ App Installed' : 'Ready to Install'}
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between">
                <span>Offline Service Worker:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  ● {swActive ? 'Active & Ready' : 'Enabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>App Mode:</span>
                <span className="font-semibold text-slate-700">
                  {isPwaInstalled ? 'Standalone Window' : 'Browser View'}
                </span>
              </div>
            </div>

            {!isPwaInstalled && (
              <button
                type="button"
                onClick={async () => {
                  const trigger = (window as any).triggerPwaInstall;
                  if (trigger) {
                    const ok = await trigger();
                    if (!ok) {
                      window.dispatchEvent(new CustomEvent('show-pwa-install'));
                    }
                  } else {
                    alert('To install Little Learner - ኪንደርጋርደን: On Chrome/Edge, click the install icon (⊕) in the browser address bar. On iPhone/iPad Safari, tap Share ⎋ and choose "Add to Home Screen".');
                  }
                }}
                className="mt-3 w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📥</span>
                <span>Install Little Learner - ኪንደርጋርደን as App</span>
              </button>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className={`w-full py-4 rounded-2xl font-bold text-xl transition-colors cursor-pointer shadow-lg ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>

          {/* Reset Progress */}
          <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
            <h3 className="text-lg font-bold text-red-700 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-600 mb-3">This will erase all progress and start over.</p>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
                  fetch('/api/parent/reset', { method: 'POST' })
                    .then(() => router.push('/'))
                    .catch(console.error);
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              Reset All Progress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
