'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ParentGate from '@/components/ui/ParentGate';
import {
  saveVoiceRecording,
  deleteVoiceRecording,
  getAllCustomVoiceKeys,
  initVoiceStudioStorage,
  getGlobalVoicePreference,
  setGlobalVoicePreference,
  getItemVoiceChoice,
  setItemVoiceChoice,
  getCustomVoiceBlobUrl,
} from '@/lib/audioStorage';
import { speakText, playAudioOrSpeech, playChime } from '@/utils/sound';

interface SystemPrompt {
  id: string;
  category: 'prompts';
  title: string;
  subtitle: string;
  promptText: string;
  audioPath: string;
}

interface ItemTarget {
  id: string;
  category: 'english' | 'numbers' | 'amharic';
  title: string;
  subtitle: string;
  promptText: string;
  audioPath: string;
  symbol?: string;
  kind?: string;
  word?: string;
  wordAudioPath?: string;
}

interface ReviewModalState {
  audioPath: string;
  label: string;
  targetSpeech: string;
  blob: Blob;
  previewUrl: string;
  durationSec: number;
  chosenSource: 'parent' | 'computer';
}

export default function VoiceStudioPage() {
  const router = useRouter();
  const [gateOpen, setGateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'prompts' | 'amharic' | 'english' | 'numbers'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'missing' | 'recorded'>('all');
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Targets
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [english, setEnglish] = useState<ItemTarget[]>([]);
  const [numbers, setNumbers] = useState<ItemTarget[]>([]);
  const [amharic, setAmharic] = useState<ItemTarget[]>([]);
  const [loading, setLoading] = useState(true);

  // Voice storage state
  const [recordedKeys, setRecordedKeys] = useState<Set<string>>(new Set());
  const [globalVoicePref, setGlobalVoicePref] = useState<'parent' | 'computer'>('parent');
  const [voiceChoices, setVoiceChoices] = useState<Record<string, 'parent' | 'computer'>>({});

  // Active recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTargetDisplay, setRecordingTargetDisplay] = useState<{ path: string; label: string; targetSpeech: string } | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  // Review & Voice Selection Modal
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audio playback state
  const [isPlayingCustomPath, setIsPlayingCustomPath] = useState<string | null>(null);
  const [isPlayingComputerPath, setIsPlayingComputerPath] = useState<string | null>(null);

  // Refs to avoid stale closures
  const activeTargetRef = useRef<{ path: string; label: string; targetSpeech: string } | null>(null);
  const recordingStartMsRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const reviewPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Refresh voice keys and choices from storage
  const refreshRecordedKeys = useCallback(async () => {
    await initVoiceStudioStorage();
    const keys = getAllCustomVoiceKeys();
    setRecordedKeys(keys);
    setGlobalVoicePref(getGlobalVoicePreference());

    const choices: Record<string, 'parent' | 'computer'> = {};
    keys.forEach((k) => {
      choices[k] = getItemVoiceChoice(k);
    });
    setVoiceChoices(choices);
  }, []);

  // Fetch target list from API
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
      refreshRecordedKeys();
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
      if (reviewPlayerRef.current) {
        reviewPlayerRef.current.pause();
        reviewPlayerRef.current = null;
      }
    };
  }, [refreshRecordedKeys]);

  const handleGateSuccess = () => {
    setGateOpen(true);
    fetchTargets();
  };

  // Compile full deduplicated list of recordable units
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
  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // Start recording
  const startRecording = async (targetPath: string, targetLabel: string, targetSpeech: string) => {
    setMicError(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (reviewPlayerRef.current) {
      reviewPlayerRef.current.pause();
      reviewPlayerRef.current = null;
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

      // Save target into ref to be 100% immune to React closure stale state
      activeTargetRef.current = { path: targetPath, label: targetLabel, targetSpeech };
      recordingStartMsRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Stop stream audio tracks
        stream.getTracks().forEach((track) => track.stop());

        const duration = Math.max(0.5, Math.round(((Date.now() - recordingStartMsRef.current) / 1000) * 10) / 10);
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        const target = activeTargetRef.current;
        if (audioBlob.size > 0 && target) {
          const previewUrl = URL.createObjectURL(audioBlob);
          setReviewModal({
            audioPath: target.path,
            label: target.label,
            targetSpeech: target.targetSpeech,
            blob: audioBlob,
            previewUrl,
            durationSec: duration,
            chosenSource: 'parent', // Default to parent voice
          });
        }

        setIsRecording(false);
        setRecordingTargetDisplay(null);
        setRecordSeconds(0);
      };

      setIsRecording(true);
      setRecordingTargetDisplay({ path: targetPath, label: targetLabel, targetSpeech });
      setRecordSeconds(0);
      recorder.start();

      // Live second timer
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds(Math.round(((Date.now() - recordingStartMsRef.current) / 1000) * 10) / 10);
      }, 100);

      // Auto-stop after 3.5 seconds
      recordTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 3500);
    } catch (err: any) {
      console.error('Microphone recording error:', err);
      setMicError(err.message || 'Could not access microphone. Please check browser microphone permissions.');
      setIsRecording(false);
      setRecordingTargetDisplay(null);
    }
  };

  // Play custom preview blob in review modal
  const handlePlayReviewBlob = () => {
    if (!reviewModal) return;
    if (reviewPlayerRef.current) {
      reviewPlayerRef.current.pause();
    }
    const audio = new Audio(reviewModal.previewUrl);
    reviewPlayerRef.current = audio;
    audio.play().catch(console.error);
  };

  // Play computer voice preview in review modal
  const handlePlayReviewComputer = () => {
    if (!reviewModal) return;
    speakText(reviewModal.targetSpeech);
  };

  // Save voice recording from review modal
  const handleSaveFromReview = async () => {
    if (!reviewModal) return;

    await saveVoiceRecording(
      reviewModal.audioPath,
      reviewModal.blob,
      reviewModal.durationSec,
      reviewModal.label,
      reviewModal.chosenSource
    );

    playChime();
    const savedPath = reviewModal.audioPath;
    const isParentActive = reviewModal.chosenSource === 'parent';

    setToastMessage(`✓ Saved! Child will hear ${isParentActive ? 'your recorded voice' : 'computer voice'}.`);
    setTimeout(() => setToastMessage(null), 3000);

    setReviewModal(null);
    await refreshRecordedKeys();

    // Auto-advance to next unit if enabled
    if (autoAdvance) {
      const currentIndex = filteredUnits.findIndex((u) => u.audioPath === savedPath);
      if (currentIndex >= 0 && currentIndex < filteredUnits.length - 1) {
        const nextUnit = filteredUnits[currentIndex + 1];
        const element = document.getElementById(`unit-card-${nextUnit.audioPath}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  // Toggle voice source choice on an item card
  const handleToggleItemChoice = (audioPath: string, newChoice: 'parent' | 'computer') => {
    setItemVoiceChoice(audioPath, newChoice);
    setVoiceChoices((prev) => ({ ...prev, [audioPath]: newChoice }));
  };

  // Toggle global voice mode
  const handleToggleGlobalPref = (pref: 'parent' | 'computer') => {
    setGlobalVoicePreference(pref);
    setGlobalVoicePref(pref);
  };

  // Play custom voice from card
  const handlePlayCustomAudio = (audioPath: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const customUrl = getCustomVoiceBlobUrl(audioPath);
    if (customUrl) {
      setIsPlayingCustomPath(audioPath);
      const audio = new Audio(customUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setIsPlayingCustomPath(null);
      audio.onerror = () => setIsPlayingCustomPath(null);
      audio.play().catch(() => setIsPlayingCustomPath(null));
    }
  };

  // Play computer TTS voice from card
  const handlePlayComputerVoice = (audioPath: string, targetSpeech: string) => {
    setIsPlayingComputerPath(audioPath);
    speakText(targetSpeech);
    setTimeout(() => setIsPlayingComputerPath(null), 1500);
  };

  // Delete custom recording
  const handleDelete = async (audioPath: string) => {
    if (confirm('Delete your custom voice recording for this item and restore default computer voice?')) {
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
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400"
          >
            <span>✨</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/parent')}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-base transition-colors cursor-pointer"
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
            className="text-slate-500 hover:text-slate-800 text-sm font-medium cursor-pointer"
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
                Amharic fidels and English letters are best learned through a warm, familiar family voice.
                Tap any letter below, record your voice, preview it, and choose whether to use your voice or the default computer voice!
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
            </div>
          </div>
        </div>

        {/* Global Voice Choice Controller */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔊</span>
            <div>
              <div className="font-extrabold text-slate-800 text-sm sm:text-base">
                Child's Voice Mode in Games
              </div>
              <div className="text-xs text-slate-500">
                Choose which voice the child hears during level play
              </div>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => handleToggleGlobalPref('parent')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                globalVoicePref === 'parent'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🎙️</span>
              <span>Prefer Parent Voice</span>
            </button>
            <button
              onClick={() => handleToggleGlobalPref('computer')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                globalVoicePref === 'computer'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🤖</span>
              <span>Always Computer Voice</span>
            </button>
          </div>
        </div>

        {/* Mic Error Banner */}
        {micError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">{micError}</div>
            <button
              onClick={() => setMicError(null)}
              className="text-red-400 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Category Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Items', icon: '🌟' },
              { id: 'amharic', label: 'Amharic Fidel', icon: '🇪🇹' },
              { id: 'english', label: 'English ABC', icon: '🔤' },
              { id: 'numbers', label: 'Numbers', icon: '🔢' },
              { id: 'prompts', label: 'Game Prompts', icon: '📢' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search letter, word, or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'missing', label: 'Missing' },
                { id: 'recorded', label: 'Recorded' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Auto Advance Toggle */}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
              />
              <span>Auto-advance after saving</span>
            </label>
          </div>
        </div>

        {/* Live Recording Overlay */}
        <AnimatePresence>
          {isRecording && recordingTargetDisplay && (
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
                    {recordingTargetDisplay.label}
                  </h3>
                  <div className="inline-block bg-slate-100 rounded-xl px-4 py-2 border border-slate-200">
                    <span className="text-xs text-slate-500 block">Say clearly:</span>
                    <span className="text-lg font-black text-indigo-700">
                      "{recordingTargetDisplay.targetSpeech}"
                    </span>
                  </div>
                </div>

                {/* Live timer */}
                <div className="text-4xl font-black font-mono text-slate-700">
                  {recordSeconds.toFixed(1)}s / 3.5s
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="bg-red-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, (recordSeconds / 3.5) * 100)}%` }}
                  />
                </div>

                <button
                  onClick={stopRecording}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-2xl shadow-lg shadow-red-200 transition-all text-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>⏹️</span>
                  <span>Finish Recording</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review & Voice Selection Modal */}
        <AnimatePresence>
          {reviewModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 border border-slate-100 my-8"
              >
                {/* Modal Header */}
                <div className="text-center space-y-1">
                  <span className="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full uppercase tracking-wider">
                    Recording Complete
                  </span>
                  <h3 className="text-2xl font-black text-slate-800 pt-1">
                    {reviewModal.label}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Preview your recording and choose which voice to use
                  </p>
                </div>

                {/* Listen & Compare Section */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    1. Listen & Compare Voices
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handlePlayReviewBlob}
                      className="py-3 px-3 bg-purple-100 hover:bg-purple-200 active:scale-95 text-purple-800 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all border border-purple-200 cursor-pointer"
                    >
                      <span className="text-xl">🎙️</span>
                      <span>Play My Recording</span>
                      <span className="text-[10px] text-purple-600 font-normal">
                        ({reviewModal.durationSec.toFixed(1)}s)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePlayReviewComputer}
                      className="py-3 px-3 bg-blue-100 hover:bg-blue-200 active:scale-95 text-blue-800 rounded-xl font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all border border-blue-200 cursor-pointer"
                    >
                      <span className="text-xl">🤖</span>
                      <span>Play Computer Voice</span>
                      <span className="text-[10px] text-blue-600 font-normal">
                        (Default TTS)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Choose Voice Selection Section */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    2. Choose Which Voice Your Child Will Hear
                  </div>

                  <div className="space-y-2">
                    {/* Option A: Parent Voice */}
                    <div
                      onClick={() => setReviewModal((prev) => prev ? { ...prev, chosenSource: 'parent' } : null)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        reviewModal.chosenSource === 'parent'
                          ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎙️</span>
                        <div>
                          <div className="font-extrabold text-sm text-slate-800">
                            Use My Recorded Voice (Recommended)
                          </div>
                          <div className="text-xs text-slate-500">
                            Plays your natural voice in games and quizzes
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        reviewModal.chosenSource === 'parent' ? 'border-purple-600 bg-purple-600' : 'border-slate-300'
                      }`}>
                        {reviewModal.chosenSource === 'parent' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>

                    {/* Option B: Computer Voice */}
                    <div
                      onClick={() => setReviewModal((prev) => prev ? { ...prev, chosenSource: 'computer' } : null)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        reviewModal.chosenSource === 'computer'
                          ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🤖</span>
                        <div>
                          <div className="font-extrabold text-sm text-slate-800">
                            Use Default Computer Voice
                          </div>
                          <div className="text-xs text-slate-500">
                            Saves your recording, but keeps computer voice active
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        reviewModal.chosenSource === 'computer' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}>
                        {reviewModal.chosenSource === 'computer' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleSaveFromReview}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 transition-all text-base cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>💾</span>
                    <span>Save Voice Recording</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const target = reviewModal;
                        setReviewModal(null);
                        startRecording(target.audioPath, target.label, target.targetSpeech);
                      }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      🔄 Re-record
                    </button>
                    <button
                      onClick={() => setReviewModal(null)}
                      className="px-4 py-2.5 text-slate-400 hover:text-slate-600 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
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
            {filteredUnits.map((unit, unitIdx) => {
              const hasVoice = recordedKeys.has(unit.audioPath);
              const activeChoice = voiceChoices[unit.audioPath] || (hasVoice ? 'parent' : 'computer');
              const isParentActive = hasVoice && activeChoice === 'parent' && globalVoicePref === 'parent';
              const isPlayingCustom = isPlayingCustomPath === unit.audioPath;
              const isPlayingComputer = isPlayingComputerPath === unit.audioPath;

              return (
                <div
                  key={`${unit.uniqueKey}-${unitIdx}`}
                  id={`unit-card-${unit.audioPath}`}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    isParentActive
                      ? 'border-purple-300 shadow-sm bg-gradient-to-b from-purple-50/30 to-white'
                      : hasVoice
                      ? 'border-blue-200 shadow-sm bg-gradient-to-b from-blue-50/20 to-white'
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
                      {isParentActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                          ✓ Parent Voice
                        </span>
                      ) : hasVoice ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                          🤖 Computer (Saved)
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

                  {/* Voice Choice Switch (when recorded) */}
                  {hasVoice && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Active Voice:</span>
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                        <button
                          onClick={() => handleToggleItemChoice(unit.audioPath, 'parent')}
                          className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            activeChoice === 'parent'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🎙️ My Voice
                        </button>
                        <button
                          onClick={() => handleToggleItemChoice(unit.audioPath, 'computer')}
                          className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            activeChoice === 'computer'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🤖 Computer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audio Controls & Actions */}
                  <div className="mt-3.5 flex items-center gap-2">
                    {/* Record Button */}
                    <button
                      onClick={() => startRecording(unit.audioPath, unit.title, unit.targetSpeech)}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        hasVoice
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          : 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-100'
                      }`}
                    >
                      <span>🎙️</span>
                      <span>{hasVoice ? 'Re-record' : 'Record'}</span>
                    </button>

                    {/* Preview Parent Voice (if recorded) */}
                    {hasVoice && (
                      <button
                        onClick={() => handlePlayCustomAudio(unit.audioPath)}
                        disabled={isPlayingCustom}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                          isPlayingCustom
                            ? 'bg-purple-600 text-white animate-pulse'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        }`}
                        title="Listen to your recorded voice"
                      >
                        <span>{isPlayingCustom ? '🔊' : '▶️'}</span>
                        <span className="hidden sm:inline">Mine</span>
                      </button>
                    )}

                    {/* Preview Computer Voice */}
                    <button
                      onClick={() => handlePlayComputerVoice(unit.audioPath, unit.targetSpeech)}
                      disabled={isPlayingComputer}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                        isPlayingComputer
                          ? 'bg-blue-600 text-white animate-pulse'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                      title="Listen to computer voice"
                    >
                      <span>🤖</span>
                      <span className="hidden sm:inline">TTS</span>
                    </button>

                    {/* Delete Custom Recording if exists */}
                    {hasVoice && (
                      <button
                        onClick={() => handleDelete(unit.audioPath)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors text-xs cursor-pointer"
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
