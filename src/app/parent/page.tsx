'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ParentGate from '@/components/ui/ParentGate';

export default function ParentPage() {
  const router = useRouter();
  const [gateOpen, setGateOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchDashboard = useCallback(() => {
    fetch('/api/parent/dashboard')
      .then(res => res.json())
      .then(data => setDashboardData(data))
      .catch(console.error);
  }, []);

  const handleGateSuccess = () => {
    setGateOpen(true);
    fetchDashboard();
  };

  if (!gateOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <ParentGate
          isOpen={true}
          onSuccess={handleGateSuccess}
          onCancel={() => router.push('/')}
        />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-gray-500 hover:text-gray-700 text-lg"
        >
          ← Home
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Parent Dashboard</h1>
        <div />
      </div>

      {!dashboardData ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* World Progress */}
          {dashboardData.worlds?.map((world: any) => (
            <motion.div
              key={world.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-3">
                {world.emoji} {world.title}
              </h2>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-sm text-gray-500">
                  {world.completedLevels}/{world.totalLevels} levels
                </span>
                <span className="text-sm text-yellow-600">
                  ⭐ {world.totalStars} stars
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${(world.completedLevels / Math.max(world.totalLevels, 1)) * 100}%`,
                    backgroundColor: world.themeColor,
                  }}
                />
              </div>
            </motion.div>
          ))}

          {/* Item Grid */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">Item Mastery</h2>
            <div className="flex gap-3 mb-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-gray-300 inline-block" /> Not started
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-yellow-400 inline-block" /> Learning
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-green-500 inline-block" /> Mastered
              </span>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-13 gap-2">
              {dashboardData.items?.map((item: any) => (
                <div
                  key={item.id}
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm
                    ${item.status === 'mastered'
                      ? 'bg-green-500'
                      : item.status === 'learning'
                        ? 'bg-yellow-400'
                        : 'bg-gray-300'
                    }
                  `}
                  title={`${item.symbol} - ${item.status}`}
                >
                  {item.symbol}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Needs Practice */}
          {dashboardData.needsPractice?.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Needs Practice</h2>
              <div className="flex flex-wrap gap-2">
                {dashboardData.needsPractice.map((item: any) => (
                  <span key={item.id} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {item.symbol} ({item.totalWrong} wrong)
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Settings link */}
          <div className="text-center">
            <button
              onClick={() => router.push('/parent/settings')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-2xl font-semibold transition-colors"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
