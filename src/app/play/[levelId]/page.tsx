'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { queueOfflineProgress } from '@/lib/offlineQueue';
import LoadingScreen from '@/components/ui/LoadingScreen';
import type { StageResult } from '@/types';

// Dynamic imports for game components
const MeetCard = dynamic(() => import('@/components/games/MeetCard'), { ssr: false });
const FindIt = dynamic(() => import('@/components/games/FindIt'), { ssr: false });
const MatchPairs = dynamic(() => import('@/components/games/MatchPairs'), { ssr: false });
const TraceIt = dynamic(() => import('@/components/games/TraceIt'), { ssr: false });
const CountIt = dynamic(() => import('@/components/games/CountIt'), { ssr: false });
const SpotTheDifference = dynamic(() => import('@/components/games/SpotTheDifference'), { ssr: false });
const ListenAndTap = dynamic(() => import('@/components/games/ListenAndTap'), { ssr: false });
const CelebrationScreen = dynamic(() => import('@/components/games/CelebrationScreen'), { ssr: false });

interface GameItem {
  id: string;
  symbol: string;
  displayName: string;
  audioPath: string;
  picturePath: string;
  pictureWord: string;
  pictureWordAudioPath: string;
  kind: 'letter_upper' | 'letter_lower' | 'number' | 'fidel';
  confusableWith?: string[];
}

interface LevelData {
  id: string;
  title: string;
  type: string;
  worldSlug: string;
  worldTitle: string;
  themeColor: string;
  mascot: string;
  stages: Array<{
    type: string;
    items: GameItem[];
    distractors?: GameItem[];
    pairs?: Array<{ left: GameItem; right: GameItem }>;
  }>;
}

function PlayContent() {
  const params = useParams();
  const router = useRouter();
  const levelId = params?.levelId as string;

  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [allResults, setAllResults] = useState<StageResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (!levelId) return;
    fetch(`/api/levels/${levelId}`)
      .then(res => res.json())
      .then(data => {
        setLevelData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [levelId]);

  const calculateStars = useCallback((results: StageResult[]): number => {
    if (results.length === 0) return 1;
    const firstTryCorrect = results.filter(r => r.correct && r.firstTry).length;
    const total = results.length;
    const percentage = (firstTryCorrect / total) * 100;
    if (percentage >= 90) return 3;
    if (percentage >= 70) return 2;
    return 1;
  }, []);

  const postProgress = useCallback((payload: Record<string, unknown>) => {
    // Save progress with offline fallback (queue on network OR server errors)
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Progress save failed with status ${res.status}`);
      })
      .catch((err) => {
        console.warn('Could not save progress, queueing offline:', err);
        queueOfflineProgress('/api/progress', payload);
      });
  }, []);

  const handleStageComplete = useCallback((results?: StageResult[]) => {
    // Tag each result with the stage that produced it so analytics stay accurate
    const stageType = levelData?.stages[currentStageIndex]?.type;
    const taggedResults = results?.map(r => ({ ...r, gameType: r.gameType ?? stageType }));

    if (taggedResults) {
      setAllResults(prev => [...prev, ...taggedResults]);
    }

    if (!levelData) return;

    // Stream this stage's results immediately so exiting mid-level
    // doesn't lose mastery data or attempts
    if (taggedResults && taggedResults.length > 0) {
      postProgress({ levelId, results: taggedResults, partial: true });
    }

    const nextIndex = currentStageIndex + 1;
    if (nextIndex >= levelData.stages.length) {
      // Level complete! Calculate stars
      const finalResults = taggedResults ? [...allResults, ...taggedResults] : allResults;
      const earnedStars = calculateStars(finalResults);
      setStars(earnedStars);

      // Attempts were already streamed via partial saves; final save only
      // completes the level and records stars.
      postProgress({ levelId, stars: earnedStars, results: [], partial: false });
    }

    setCurrentStageIndex(nextIndex);
  }, [currentStageIndex, levelData, allResults, calculateStars, levelId, postProgress]);

  if (loading) {
    return <LoadingScreen bgClass="bg-sky-100" />;
  }

  if (!levelData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-100">
        <p className="text-2xl text-gray-400">Level not found</p>
      </div>
    );
  }

  const currentStage = levelData.stages[currentStageIndex];
  const isCelebration = !currentStage || currentStageIndex >= levelData.stages.length;
  const progress = ((currentStageIndex) / levelData.stages.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 to-sky-50 relative flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-sm shadow-sm z-20">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push(`/world/${levelData.worldSlug}`)}
          className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-xl cursor-pointer"
        >
          ⬅️
        </motion.button>

        {/* Progress bar */}
        <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: levelData.themeColor || '#4CAF50' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/')}
          className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-xl cursor-pointer"
        >
          🏠
        </motion.button>
      </div>

      {/* Stage content */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {isCelebration ? (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="h-full"
            >
              <CelebrationScreen
                stars={stars}
                mascot={levelData.mascot}
                worldSlug={levelData.worldSlug}
                onNext={() => router.push(`/world/${levelData.worldSlug}`)}
                themeColor={levelData.themeColor}
              />
            </motion.div>
          ) : currentStage?.type === 'meet' ? (
            <motion.div
              key={`meet-${currentStageIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="h-full"
            >
              <MeetCard
                items={currentStage.items}
                onComplete={() => handleStageComplete()}
                themeColor={levelData.themeColor}
              />
            </motion.div>
          ) : currentStage?.type === 'count' ? (
            <motion.div
              key={`count-${currentStageIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="h-full"
            >
              <CountIt
                items={currentStage.items}
                onComplete={(results) => handleStageComplete(results)}
                themeColor={levelData.themeColor}
              />
            </motion.div>
          ) : currentStage?.type === 'trace' ? (
            <motion.div
              key={`trace-${currentStageIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="h-full"
            >
              <TraceIt
                items={currentStage.items}
                onComplete={(results) => handleStageComplete(results)}
                themeColor={levelData.themeColor}
              />
            </motion.div>
          ) : currentStage?.type === 'find' ? (
            <motion.div
              key={`find-${currentStageIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="h-full"
            >
              <FindIt
                items={currentStage.items}
                distractors={currentStage.distractors || []}
                showHints={true}
                onComplete={(results) => handleStageComplete(results)}
                themeColor={levelData.themeColor}
              />
            </motion.div>
          ) : currentStage?.type === 'match' ? (
            <motion.div
              key={`match-${currentStageIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="h-full"
            >
              <MatchPairs
                pairs={currentStage.pairs || currentStage.items.map(item => ({
                  left: item,
                  right: { ...item, symbol: item.pictureWord, displayName: item.pictureWord },
                }))}
                onComplete={(results) => handleStageComplete(results)}
                themeColor={levelData.themeColor}
              />
            </motion.div>
          ) : currentStage?.type === 'spotDifference' ? (
            <motion.div
              key={`spot-${currentStageIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="h-full"
            >
              <SpotTheDifference
                targetItem={currentStage.items[0]}
                confusables={currentStage.distractors || []}
                onComplete={(results) => handleStageComplete(results)}
                themeColor={levelData.themeColor}
              />
            </motion.div>
          ) : currentStage?.type === 'listen' ? (
            <motion.div
              key={`listen-${currentStageIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="h-full"
            >
              <ListenAndTap
                items={currentStage.items}
                distractors={currentStage.distractors || []}
                onComplete={(results) => handleStageComplete(results)}
                themeColor={levelData.themeColor}
              />
            </motion.div>
          ) : currentStage?.type === 'quiz' ? (
            <motion.div
              key={`quiz-${currentStageIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="h-full"
            >
              <FindIt
                items={currentStage.items}
                distractors={currentStage.distractors || []}
                showHints={false}
                onComplete={(results) => handleStageComplete(results)}
                themeColor={levelData.themeColor}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<LoadingScreen bgClass="bg-sky-100" />}>
      <PlayContent />
    </Suspense>
  );
}
