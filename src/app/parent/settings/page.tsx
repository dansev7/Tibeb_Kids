'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setVoiceSettings, speakText } from '@/utils/sound';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    childName: 'Learner',
    sessionLimitMin: 15,
    volume: 0.8,
    voiceGender: 'female' as 'female' | 'male',
    voiceSpeed: 0.9,
    enabledWorlds: ['abc-garden', 'number-farm', 'fidel-village'],
  });
  const [saved, setSaved] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    fetch('/api/parent/settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSettings({
            childName: data.childName || 'Learner',
            sessionLimitMin: data.sessionLimitMin ?? 15,
            volume: data.volume ?? 0.8,
            voiceGender: data.voiceGender || 'female',
            voiceSpeed: data.voiceSpeed ?? 0.9,
            enabledWorlds: data.enabledWorlds || ['abc-garden', 'number-farm', 'fidel-village'],
          });
          setVoiceSettings(data.voiceGender || 'female', data.voiceSpeed ?? 0.9);
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = () => {
    setVoiceSettings(settings.voiceGender, settings.voiceSpeed);

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

  const handleTestVoice = (gender = settings.voiceGender, speed = settings.voiceSpeed) => {
    setIsTestingVoice(true);
    setVoiceSettings(gender, speed);
    speakText(`Hello ${settings.childName}! Welcome to Little Learner. Let's play and learn together!`);
    setTimeout(() => setIsTestingVoice(false), 2500);
  };

  const toggleWorld = (worldId: string) => {
    setSettings(prev => ({
      ...prev,
      enabledWorlds: prev.enabledWorlds.includes(worldId)
        ? prev.enabledWorlds.filter(w => w !== worldId)
        : [...prev.enabledWorlds, worldId],
    }));
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

          {/* Voiceover Gender Toggle */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <label className="block text-sm font-semibold text-gray-600 mb-3">
              Teacher Voiceover Style
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => {
                  setSettings(prev => ({ ...prev, voiceGender: 'female' }));
                  handleTestVoice('female', settings.voiceSpeed);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all cursor-pointer ${
                  settings.voiceGender === 'female'
                    ? 'border-purple-500 bg-purple-50 shadow-md scale-102'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-4xl mb-1">👩‍🏫</span>
                <span className="font-bold text-gray-800">Female Voice</span>
                <span className="text-xs text-gray-500 mt-1">Warm & Cheerful</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettings(prev => ({ ...prev, voiceGender: 'male' }));
                  handleTestVoice('male', settings.voiceSpeed);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all cursor-pointer ${
                  settings.voiceGender === 'male'
                    ? 'border-blue-500 bg-blue-50 shadow-md scale-102'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-4xl mb-1">👨‍🏫</span>
                <span className="font-bold text-gray-800">Male Voice</span>
                <span className="text-xs text-gray-500 mt-1">Encouraging & Clear</span>
              </button>
            </div>
          </div>

          {/* Voiceover Speed Adjustment */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-600">
                Voice Speed: <span className="text-blue-600 font-bold">{settings.voiceSpeed.toFixed(1)}x</span>
              </label>
              <button
                type="button"
                onClick={() => handleTestVoice(settings.voiceGender, settings.voiceSpeed)}
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
              value={settings.voiceSpeed}
              onChange={(e) => {
                const newSpeed = parseFloat(e.target.value);
                setSettings(prev => ({ ...prev, voiceSpeed: newSpeed }));
                setVoiceSettings(settings.voiceGender, newSpeed);
              }}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>0.6x (Slower)</span>
              <span className="text-blue-500 font-semibold">0.9x (KG Recommended)</span>
              <span>1.4x (Faster)</span>
            </div>
          </div>

          {/* Session Time Limit */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Session Time Limit: <span className="text-blue-600 font-bold">{settings.sessionLimitMin} minutes</span>
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={settings.sessionLimitMin}
              onChange={(e) => setSettings(prev => ({ ...prev, sessionLimitMin: parseInt(e.target.value) }))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5 min</span>
              <span>15 min</span>
              <span>30 min</span>
            </div>
          </div>

          {/* Volume */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Sound Volume: <span className="text-blue-600 font-bold">{Math.round(settings.volume * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => setSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
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
              ].map(world => (
                <label
                  key={world.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={settings.enabledWorlds.includes(world.id)}
                    onChange={() => toggleWorld(world.id)}
                    className="w-6 h-6 rounded accent-blue-500"
                  />
                  <span className="text-2xl">{world.emoji}</span>
                  <span className="font-semibold text-gray-700">{world.name}</span>
                </label>
              ))}
            </div>
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
