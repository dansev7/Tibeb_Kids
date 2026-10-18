'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ParentGate from '@/components/ui/ParentGate';
import {
  initVoiceStudioStorage,
  saveVoiceRecording,
  deleteVoiceRecording,
  getAllCustomVoiceKeys,
  resolveAudioPath,
} from '@/lib/audioStorage';
import { playAudioOrSpeech } from '@/utils/sound';

interface VoiceItem {
  id: string;
  category: 'prompts' | 'english' | 'numbers' | 'amharic';
  title: string;
  subtitle: string;
  promptText: string;
  audioPath: string;
  symbol?: string;
  kind?: string;
  word?: string;
  wordAudioPath?: string;
}

export default function VoiceStudioPage() {
  const router = useRouter();
  const [gateOpen, setGateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Items from API
  const [prompts, setPrompts] = useState<VoiceItem[]>([]);
  const [english, setEnglish] = useState<VoiceItem[]>([]);
  const [numbers, setNumbers] = useState<VoiceItem[]>([]);
  const [amharic, setAmharic] = useState<VoiceItem[]>([]);

  // State of recorded keys
  const [recordedKeys, setRecordedKeys] = useState<Set<string>>(new Set());

  // UI filters
  const [activeTab, setActiveTab] = useState<'all' | 'amharic' | 'english' | 'numbers' | 'prompts'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recorded' | 'missing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Active recording state
  const [recordingTarget, setRecordingTarget] = useState<{ path: string; label: string } | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isPlayingPath, setIsPlayingPath] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Refresh recorded keys from IndexedDB
  const refreshRecordedKeys = useCallback(async () => {
    await initVoiceStudioStorage();
    setRecordedKeys(getAllCustomVoiceKeys());
  }, []);

  // Fetch targets
  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/parent/voice-items');
      const data = await res.json();
      if (data && !data.error) {
        setPrompts(data.prompts || []);
        setEnglish(data.english || []);
        setNumbers(data.numbers || []);
        setAmharic(data.amharic || []);
      }
    } catch (err) {
      console.error('Failed to load voice targets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRecordedKeys();
    const handleVoiceChange = () => {
      setRecordedKeys(getAllCustomVoiceKeys());
    };
    window.addEventListener('voice_recordings_changed', handleVoiceChange);
    return () => {
      window.removeEventListener('voice_recordings_changed', handleVoiceChange);
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, [refreshRecordedKeys]);

  const handleGateSuccess = () => {
    setGateOpen(true);
    fetchTargets();
  };

  // Compile full list of recordable units
  interface RecordableUnit {
    uniqueKey: string;
    audioPath: string;
    title: string;
    subtitle: string;
    category: 'prompts' | 'english' | 'numbers' | 'amharic';
    symbol?: string;
    targetSpeech: string;
    type: 'symbol' | 'word' | 'prompt';
  }

  const allUnits: RecordableUnit[] = useMemo(() => {
    const unitMap = new Map<string, RecordableUnit>();

    const addOrMergeUnit = (unit: RecordableUnit) => {
      if (!unit.audioPath) return;
      const existing = unitMap.get(unit.audioPath);
      if (existing) {
        // If this audio target already exists (e.g. word_apple for lowercase after uppercase),
        // merge symbols so parent sees it covers both (e.g. "A / a")
        if (unit.symbol && existing.symbol && !existing.symbol.includes(unit.symbol)) {
          existing.symbol = `${existing.symbol} / ${unit.symbol}`;
          if (existing.type === 'word') {
            existing.subtitle = `Vocabulary for letters ${existing.symbol}`;
          }
        }
        return;
      }
      unitMap.set(unit.audioPath, unit);
    };

    // System prompts
    prompts.forEach((p) => {
      addOrMergeUnit({
        uniqueKey: `prompt-${p.audioPath}`,
        audioPath: p.audioPath,
        title: p.title,
        subtitle: p.subtitle,
        category: 'prompts',
        symbol: '📢',
        targetSpeech: p.promptText,
        type: 'prompt',
      });
    });

    // Amharic fidels
    amharic.forEach((a) => {
      addOrMergeUnit({
        uniqueKey: `amharic-symbol-${a.audioPath}`,
        audioPath: a.audioPath,
        title: a.title,
        subtitle: a.subtitle,
        category: 'amharic',
        symbol: a.symbol,
        targetSpeech: a.symbol || a.title,
        type: 'symbol',
      });
      if (a.word && a.wordAudioPath) {
        addOrMergeUnit({
          uniqueKey: `amharic-word-${a.wordAudioPath}`,
          audioPath: a.wordAudioPath,
          title: `ቃል: ${a.word}`,
          subtitle: `የ ${a.symbol} ቃል`,
          category: 'amharic',
          symbol: a.symbol,
          targetSpeech: a.word,
          type: 'word',
        });
      }
    });

    // English letters
    english.forEach((e) => {
      addOrMergeUnit({
        uniqueKey: `english-symbol-${e.audioPath}`,
        audioPath: e.audioPath,
        title: e.title,
        subtitle: e.subtitle,
        category: 'english',
        symbol: e.symbol,
        targetSpeech: e.title,
        type: 'symbol',
      });
      if (e.word && e.wordAudioPath) {
        addOrMergeUnit({
          uniqueKey: `english-word-${e.wordAudioPath}`,
          audioPath: e.wordAudioPath,
          title: `Word: ${e.word}`,
          subtitle: `Vocabulary for letter ${e.symbol}`,
          category: 'english',
          symbol: e.symbol,
          targetSpeech: e.word,
          type: 'word',
        });
      }
    });

    // Numbers
    numbers.forEach((n) => {
      addOrMergeUnit({
        uniqueKey: `numbers-symbol-${n.audioPath}`,
        audioPath: n.audioPath,
        title: n.title,
        subtitle: n.subtitle,
        category: 'numbers',
        symbol: n.symbol,
        targetSpeech: n.promptText,
        type: 'symbol',
      });
      if (n.word && n.wordAudioPath) {
        addOrMergeUnit({
          uniqueKey: `numbers-word-${n.wordAudioPath}`,
          audioPath: n.wordAudioPath,
          title: `Item: ${n.word}`,
          subtitle: `Count word for ${n.symbol}`,
          category: 'numbers',
          symbol: n.symbol,
          targetSpeech: n.word,
          type: 'word',
        });
      }
    });

    return Array.from(unitMap.values());
  }, [prompts, amharic, english, numbers]);

  // Filtered units
  const filteredUnits = useMemo(() => {
    return allUnits.filter((unit) => {
      // Category filter
      if (activeTab !== 'all' && unit.category !== activeTab) {
        return false;
      }
      // Status filter
      const isRecorded = recordedKeys.has(unit.audioPath);
      if (statusFilter === 'recorded' && !isRecorded) return false;
      if (statusFilter === 'missing' && isRecorded) return false;

      // Search filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matches =
          unit.title.toLowerCase().includes(q) ||
          unit.subtitle.toLowerCase().includes(q) ||
          unit.targetSpeech.toLowerCase().includes(q) ||
          (unit.symbol && unit.symbol.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [allUnits, activeTab, statusFilter, searchQuery, recordedKeys]);

  const totalRecordableCount = allUnits.length;
  const recordedCount = allUnits.filter((u) => recordedKeys.has(u.audioPath)).length;
  const progressPercent = totalRecordableCount > 0 ? Math.round((recordedCount / totalRecordableCount) * 100) : 0;

  // Stop recording handler
  const stopRecording = useCallback(async () => {
    if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Start recording
  const startRecording = async (targetPath: string, targetLabel: string) => {
    setMicError(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());

        const duration = recordSeconds;
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (audioBlob.size > 0 && recordingTarget) {
          await saveVoiceRecording(recordingTarget.path, audioBlob, duration, recordingTarget.label);
          await refreshRecordedKeys();

          // Auto-advance if enabled
          if (autoAdvance) {
            const currentIndex = filteredUnits.findIndex((u) => u.audioPath === recordingTarget.path);
            if (currentIndex >= 0 && currentIndex < filteredUnits.length - 1) {
              const nextUnit = filteredUnits[currentIndex + 1];
              const element = document.getElementById(`unit-card-${nextUnit.audioPath}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        }
        setRecordingTarget(null);
        setRecordSeconds(0);
      };

      setRecordingTarget({ path: targetPath, label: targetLabel });
      setRecordSeconds(0);
      recorder.start();

      // Second counter
      const startMs = Date.now();
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds(Math.round(((Date.now() - startMs) / 1000) * 10) / 10);
      }, 100);

      // Auto-stop after 3.2 seconds
      recordTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 3200);
    } catch (err: any) {
      console.error('Microphone recording error:', err);
      setMicError(err.message || 'Could not access microphone. Please allow microphone permissions.');
      setRecordingTarget(null);
    }
  };

  // Play audio
  const handlePlayAudio = (audioPath: string, targetSpeech: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    setIsPlayingPath(audioPath);
    const audio = playAudioOrSpeech(audioPath, targetSpeech, () => {
      setIsPlayingPath(null);
    });

    if (audio) {
      audioPlayerRef.current = audio;
    } else {
      setTimeout(() => setIsPlayingPath(null), 1500);
    }
  };

  // Delete recording
  const handleDelete = async (audioPath: string) => {
    if (confirm('Delete this custom voice recording and restore system default?')) {
      await deleteVoiceRecording(audioPath);
      await refreshRecordedKeys();
    }
  };

  if (!gateOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <ParentGate
          isOpen={true}
          onSuccess={handleGateSuccess}
          onCancel={() => router.push('/parent')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/parent')}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-base transition-colors"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎙️</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Parent Audio Voice Studio
            </h1>
          </div>
          <button
            onClick={() => router.push('/parent/settings')}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium"
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* Banner / Explanation */}
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wide uppercase">
                Natural Human Audio for Kids
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold">
                Teach with Your Own Voice ❤️
              </h2>
              <p className="text-white/90 text-sm md:text-base max-w-xl">
                Amharic fidels and English phonics are best learned through a warm, familiar family voice.
                Tap any letter below and speak for 2 seconds. The app saves it instantly for offline play!
              </p>
            </div>

            {/* Quick Stat Badge */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[200px] flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-amber-300">
                {recordedCount} / {totalRecordableCount}
              </span>
              <span className="text-xs text-white/80 mt-1">Recordings Saved</span>
              <div className="w-full bg-white/20 rounded-full h-2.5 mt-3 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-amber-200 mt-1">{progressPercent}% Completed</span>
            </div>
          </div>
        </div>

        {/* Microphone Error Alert */}
        {micError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span className="text-sm font-medium">{micError}</span>
            </div>
            <button
              onClick={() => setMicError(null)}
              className="text-red-500 hover:text-red-800 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Controls & Search */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Items', emoji: '🌟' },
              { id: 'amharic', label: 'Fidel Village', emoji: '🦁' },
              { id: 'english', label: 'ABC Garden', emoji: '🔤' },
              { id: 'numbers', label: 'Number Farm', emoji: '🔢' },
              { id: 'prompts', label: 'Prompts & Mascot', emoji: '📢' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Status Pills */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'missing', label: '⭕ Missing Voice' },
                { id: 'recorded', label: '🎙️ Recorded' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === st.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Quick Record Mode & Search */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                Auto-next card
              </label>

              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  placeholder="Search letter, word..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recording Modal / Live Overlay when recording */}
        <AnimatePresence>
          {recordingTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-6"
              >
                <div className="flex justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center border-4 border-red-500 shadow-lg shadow-red-200"
                  >
                    <span className="text-4xl">🎙️</span>
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-red-500 tracking-wider uppercase animate-pulse">
                    ● Recording Voice...
                  </span>
                  <h3 className="text-2xl font-black text-slate-800">
                    {recordingTarget.label}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Speak clearly into your microphone
                  </p>
                </div>

                {/* Live timer */}
                <div className="text-4xl font-black font-mono text-slate-700">
                  {recordSeconds.toFixed(1)}s / 3.0s
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="bg-red-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, (recordSeconds / 3.0) * 100)}%` }}
                  />
                </div>

                <button
                  onClick={stopRecording}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-2xl shadow-lg shadow-red-200 transition-all text-lg cursor-pointer"
                >
                  ⏹️ Done / Save Now
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Units Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading audio targets...</div>
        ) : filteredUnits.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500">
            No items match your filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredUnits.map((unit) => {
              const hasVoice = recordedKeys.has(unit.audioPath);
              const isPlaying = isPlayingPath === unit.audioPath;

              return (
                <div
                  key={unit.uniqueKey}
                  id={`unit-card-${unit.audioPath}`}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    hasVoice
                      ? 'border-emerald-300 shadow-sm bg-gradient-to-b from-emerald-50/20 to-white'
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                          unit.category === 'amharic'
                            ? 'bg-purple-100 text-purple-700'
                            : unit.category === 'numbers'
                            ? 'bg-amber-100 text-amber-700'
                            : unit.category === 'english'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {unit.symbol || '🔊'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base leading-snug">
                          {unit.title}
                        </h4>
                        <p className="text-xs text-slate-400 leading-tight">
                          {unit.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {hasVoice ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          ✓ Parent Voice
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          System TTS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Speech Target Guide */}
                  <div className="mt-3 py-1.5 px-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Say:</span>
                    <span className="text-xs font-bold text-indigo-700 truncate max-w-[200px]">
                      "{unit.targetSpeech}"
                    </span>
                  </div>

                  {/* Audio Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    {/* Record Button */}
                    <button
                      onClick={() => startRecording(unit.audioPath, unit.targetSpeech)}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        hasVoice
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-100'
                      }`}
                    >
                      <span>🎙️</span>
                      <span>{hasVoice ? 'Re-record' : 'Record'}</span>
                    </button>

                    {/* Play Preview */}
                    <button
                      onClick={() => handlePlayAudio(unit.audioPath, unit.targetSpeech)}
                      disabled={isPlaying}
                      className={`p-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center ${
                        isPlaying
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="Play Preview"
                    >
                      {isPlaying ? '🔊' : '▶️'}
                    </button>

                    {/* Delete Custom Recording if exists */}
                    {hasVoice && (
                      <button
                        onClick={() => handleDelete(unit.audioPath)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-xs"
                        title="Delete recording and restore system default"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
