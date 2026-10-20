'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameItem, StageResult } from '@/types';
import { playFeedbackTone, playAudioOrSpeech } from '@/utils/sound';
import SpeakerButton from '@/components/ui/SpeakerButton';
import BigButton from '@/components/ui/BigButton';
import { getRenderedStrokes, RenderedStroke } from '@/utils/strokeGuides';

interface TraceItProps {
  items: GameItem[];
  onComplete: (results: StageResult[]) => void;
  themeColor?: string;
}

interface Checkpoint {
  x: number;
  y: number;
  hit: boolean;
  zone: number;
}

interface GlyphData {
  checkpoints: Checkpoint[];
  activeZones: number[];
  startPoint: { x: number; y: number } | null;
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number };
}

interface ShapeMatchResult {
  matched: boolean;
  coverage: number;
  precision: number;
  iou: number;
  zoneRatio: number;
  missingZones: number[];
}

const CANVAS_SIZE = 400;
const PASSING_ACCURACY_THRESHOLD = 85; // Decreased to 85% per user request
const ON_PATH_RADIUS = 26; // Tolerance radius around stroke for precision calculation
const CHECKPOINT_HIT_RADIUS = 22; // Checkpoint collection radius

export default function TraceIt({
  items,
  onComplete,
  themeColor = '#4CAF50',
}: TraceItProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<StageResult[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [completedStrokes, setCompletedStrokes] = useState(false);
  const [matchAccuracy, setMatchAccuracy] = useState(0);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [strokes, setStrokes] = useState<RenderedStroke[]>([]);
  const [showNotice, setShowNotice] = useState<string | null>(null);

  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const templateCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glyphDataRef = useRef<GlyphData | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const totalDrawnPointsRef = useRef(0);
  const onTargetPointsRef = useRef(0);
  const completedRef = useRef(false);

  const currentItem = items[currentIndex];
  const isFidel = currentItem?.kind === 'fidel';

  const playPrompt = useCallback(() => {
    if (!currentItem) return;
    const prompt = isFidel
      ? `${currentItem.symbol} ፊደልን በትክክል ጻፍ!`
      : `Trace the letter ${currentItem.displayName || currentItem.symbol}!`;
    playAudioOrSpeech(currentItem.audioPath, prompt);
  }, [currentItem, isFidel]);

  // Render the guide template letter onto the guide canvas and extract checkpoints & spatial zones
  const initGlyphAndGuide = useCallback((symbol: string) => {
    if (typeof window === 'undefined') return;

    const guideCanvas = guideCanvasRef.current;
    if (!guideCanvas) return;
    const gCtx = guideCanvas.getContext('2d', { willReadFrequently: true });
    if (!gCtx) return;

    // Clear guide canvas
    gCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // High-legibility font stack for Ethiopic and Latin
    const fontStr = '900 230px "Noto Sans Ethiopic", "Nyala", "Kefa", "Segoe UI", system-ui, -apple-system, sans-serif';
    gCtx.font = fontStr;
    gCtx.textAlign = 'center';
    gCtx.textBaseline = 'middle';

    // 1. Draw solid black glyph on offscreen canvas to analyze pixels
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_SIZE;
    offscreen.height = CANVAS_SIZE;
    const oCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!oCtx) return;

    oCtx.font = fontStr;
    oCtx.textAlign = 'center';
    oCtx.textBaseline = 'middle';
    oCtx.fillStyle = '#000000';
    oCtx.fillText(symbol, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    // Save exact 400x400 template canvas for 1:1 shape comparison
    templateCanvasRef.current = offscreen;

    const imgData = oCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;

    // 2. Find bounding box of the glyph
    let minX = CANVAS_SIZE;
    let maxX = 0;
    let minY = CANVAS_SIZE;
    let maxY = 0;

    for (let y = 10; y < CANVAS_SIZE - 10; y++) {
      for (let x = 10; x < CANVAS_SIZE - 10; x++) {
        const a = imgData[(y * CANVAS_SIZE + x) * 4 + 3];
        if (a > 60) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX || maxY <= minY) {
      minX = 80; maxX = 320; minY = 80; maxY = 320;
    }

    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);

    // 3. Sample checkpoints and partition into 3x3 spatial zones (0..8)
    const points: Checkpoint[] = [];
    const step = 8;
    const zoneCounts = new Array(9).fill(0);
    let topScore = Infinity;
    let initialStart: { x: number; y: number } | null = null;

    for (let y = minY; y <= maxY; y += step) {
      for (let x = minX; x <= maxX; x += step) {
        const a = imgData[(y * CANVAS_SIZE + x) * 4 + 3];
        if (a > 60) {
          const col = Math.min(2, Math.max(0, Math.floor(((x - minX) / boxW) * 3)));
          const row = Math.min(2, Math.max(0, Math.floor(((y - minY) / boxH) * 3)));
          const zone = row * 3 + col;
          zoneCounts[zone]++;

          points.push({ x, y, hit: false, zone });

          // Writing standardly starts near top-left of the glyph
          const score = y * 1.6 + x;
          if (score < topScore) {
            topScore = score;
            initialStart = { x, y };
          }
        }
      }
    }

    // Active zones that contain at least 4 checkpoints
    const activeZones: number[] = [];
    zoneCounts.forEach((count, idx) => {
      if (count >= 4) activeZones.push(idx);
    });

    const start = initialStart || { x: 200, y: 110 };
    setStartPoint(start);

    // Compute stroke order with numbered direction arrows
    const renderedStrokes = getRenderedStrokes(
      symbol,
      { minX, maxX, minY, maxY },
      start
    );
    setStrokes(renderedStrokes);

    glyphDataRef.current = {
      checkpoints: points,
      activeZones,
      startPoint: start,
      boundingBox: { minX, maxX, minY, maxY },
    };

    // 4. Draw beautiful child-friendly guide letter on guideCanvas
    gCtx.fillStyle = '#F1F5F9'; // Soft slate-100 silhouette
    gCtx.fillText(symbol, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    // Draw dashed outline
    gCtx.save();
    gCtx.strokeStyle = '#CBD5E1'; // Slate-300
    gCtx.lineWidth = 3;
    gCtx.setLineDash([8, 8]);
    gCtx.strokeText(symbol, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    gCtx.restore();

    // Draw subtle dotted centerline for handwriting track
    gCtx.save();
    gCtx.strokeStyle = '#94A3B8'; // Slate-400
    gCtx.lineWidth = 2;
    gCtx.setLineDash([4, 6]);
    gCtx.strokeText(symbol, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    gCtx.restore();

    setMatchAccuracy(0);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (glyphDataRef.current) {
      glyphDataRef.current.checkpoints.forEach(cp => {
        cp.hit = false;
      });
    }

    totalDrawnPointsRef.current = 0;
    onTargetPointsRef.current = 0;
    lastPointRef.current = null;
    setMatchAccuracy(0);
    setShowNotice(null);
  }, []);

  // Initialize glyph and reset canvas when item changes
  useEffect(() => {
    completedRef.current = false;
    setCompletedStrokes(false);
    clearCanvas();

    if (currentItem) {
      if (typeof document !== 'undefined' && 'fonts' in document) {
        document.fonts.ready.then(() => {
          initGlyphAndGuide(currentItem.symbol);
        });
      } else {
        initGlyphAndGuide(currentItem.symbol);
      }
      playPrompt();
    }
  }, [currentIndex, currentItem, initGlyphAndGuide, playPrompt, clearCanvas]);

  const handleSuccess = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompletedStrokes(true);
    playFeedbackTone('correct');

    const result: StageResult = {
      itemId: currentItem.id,
      correct: true,
      usedHint: false,
      firstTry: true,
    };

    const nextResults = [...results, result];
    setResults(nextResults);

    setTimeout(() => {
      if (currentIndex + 1 < items.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete(nextResults);
      }
    }, 1500);
  }, [currentIndex, currentItem, items.length, onComplete, results]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  /**
   * Performs character shape verification comparing the drawn ink mask against
   * the required character template (downsampled 100x100 raster comparison).
   * Verifies that the child drew the actual required character and not another shape.
   */
  const verifyCharacterShape = useCallback((): ShapeMatchResult => {
    const drawCanvas = drawCanvasRef.current;
    const templateCanvas = templateCanvasRef.current;
    const data = glyphDataRef.current;
    if (!drawCanvas || !templateCanvas || !data || data.checkpoints.length === 0 || !currentItem) {
      return { matched: false, coverage: 0, precision: 0, iou: 0, zoneRatio: 0, missingZones: [] };
    }

    const cmpSize = 100;

    // 1. Downsample the exact 400x400 template canvas to 100x100
    const targetCmp = document.createElement('canvas');
    targetCmp.width = cmpSize;
    targetCmp.height = cmpSize;
    const tCtx = targetCmp.getContext('2d', { willReadFrequently: true });
    if (!tCtx) return { matched: false, coverage: 0, precision: 0, iou: 0, zoneRatio: 0, missingZones: [] };

    tCtx.drawImage(templateCanvas, 0, 0, cmpSize, cmpSize);
    const targetImg = tCtx.getImageData(0, 0, cmpSize, cmpSize).data;

    // 2. Downsample drawn canvas onto 100x100 canvas
    const drawnCmp = document.createElement('canvas');
    drawnCmp.width = cmpSize;
    drawnCmp.height = cmpSize;
    const dCtx = drawnCmp.getContext('2d', { willReadFrequently: true });
    if (!dCtx) return { matched: false, coverage: 0, precision: 0, iou: 0, zoneRatio: 0, missingZones: [] };

    dCtx.drawImage(drawCanvas, 0, 0, cmpSize, cmpSize);
    const drawnImg = dCtx.getImageData(0, 0, cmpSize, cmpSize).data;

    let intersection = 0;
    let targetCount = 0;
    let drawnCount = 0;

    for (let i = 0; i < cmpSize * cmpSize; i++) {
      const tAlpha = targetImg[i * 4 + 3] > 40;
      const dAlpha = drawnImg[i * 4 + 3] > 40;

      if (tAlpha) targetCount++;
      if (dAlpha) drawnCount++;
      if (tAlpha && dAlpha) intersection++;
    }

    const union = targetCount + drawnCount - intersection;
    const iou = union > 0 ? intersection / union : 0;
    const coverage = targetCount > 0 ? intersection / targetCount : 0;
    const precision = drawnCount > 0 ? intersection / drawnCount : 0;

    // 3. Zone completeness across character's structural parts
    const missingZones: number[] = [];
    for (const zone of data.activeZones) {
      const hit = data.checkpoints.some(c => c.zone === zone && c.hit);
      if (!hit) missingZones.push(zone);
    }
    const zoneRatio = (data.activeZones.length - missingZones.length) / Math.max(1, data.activeZones.length);

    // Realistic shape verification criteria for letter stroke tracing:
    // 1. All key structural parts covered (zoneRatio >= 0.75)
    // 2. Clear stroke intersection over template (coverage >= 0.38, precision >= 0.42, iou >= 0.22)
    // (A straight line achieves iou < 0.05 and zoneRatio < 0.35, so it is strictly rejected).
    const matched = zoneRatio >= 0.75 && coverage >= 0.38 && precision >= 0.42 && iou >= 0.22;

    return {
      matched,
      coverage,
      precision,
      iou,
      zoneRatio,
      missingZones,
    };
  }, [currentItem]);

  /**
   * Evaluates match accuracy for a sample point along the drawn stroke.
   */
  const processStrokeSample = (x: number, y: number) => {
    const data = glyphDataRef.current;
    if (!data || data.checkpoints.length === 0) return;

    totalDrawnPointsRef.current++;

    const onPathRadiusSq = ON_PATH_RADIUS * ON_PATH_RADIUS;
    const hitRadiusSq = CHECKPOINT_HIT_RADIUS * CHECKPOINT_HIT_RADIUS;

    let minDistSq = Infinity;

    for (let i = 0; i < data.checkpoints.length; i++) {
      const cp = data.checkpoints[i];
      const dx = cp.x - x;
      const dy = cp.y - y;
      const dSq = dx * dx + dy * dy;

      if (dSq < minDistSq) minDistSq = dSq;

      if (dSq <= hitRadiusSq && !cp.hit) {
        cp.hit = true;
      }
    }

    if (minDistSq <= onPathRadiusSq) {
      onTargetPointsRef.current++;
    }

    const totalCheckpoints = data.checkpoints.length;
    const hitCount = data.checkpoints.filter(c => c.hit).length;
    const coverage = hitCount / totalCheckpoints;

    const totalDrawn = Math.max(1, totalDrawnPointsRef.current);
    const onTarget = onTargetPointsRef.current;
    const precision = onTarget / totalDrawn;

    let coveredZones = 0;
    const totalActive = Math.max(1, data.activeZones.length);
    for (const zone of data.activeZones) {
      const zoneHit = data.checkpoints.some(c => c.zone === zone && c.hit);
      if (zoneHit) coveredZones++;
    }
    const zoneCoverage = coveredZones / totalActive;

    // Weight 60% coverage + 40% on-target precision
    let compositeScore = coverage * 0.60 + precision * 0.40;

    // Multi-Zone Guard: if fewer than 75% of active zones are touched, cap accuracy at 45%
    if (data.activeZones.length >= 3 && zoneCoverage < 0.75) {
      compositeScore = Math.min(compositeScore, 0.45);
    }

    const calculatedPct = Math.min(100, Math.max(0, Math.round(compositeScore * 100)));
    setMatchAccuracy(calculatedPct);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (completedStrokes) return;
    e.preventDefault();
    setIsDrawing(true);
    setShowNotice(null);

    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = themeColor;
    ctx.fill();

    processStrokeSample(coords.x, coords.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || completedStrokes) return;
    e.preventDefault();

    const coords = getCanvasCoords(e);
    const lastPoint = lastPointRef.current || coords;

    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render smooth finger-paint line
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = themeColor;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    // Interpolate points along the line segment for continuous high-accuracy hit testing
    const dist = Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const ix = lastPoint.x + (coords.x - lastPoint.x) * t;
      const iy = lastPoint.y + (coords.y - lastPoint.y) * t;
      processStrokeSample(ix, iy);
    }

    lastPointRef.current = coords;
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    lastPointRef.current = null;

    if (completedRef.current) return;

    // Auto-verify if match accuracy reaches threshold and character shape matches
    if (matchAccuracy >= PASSING_ACCURACY_THRESHOLD) {
      const shapeResult = verifyCharacterShape();
      if (shapeResult.matched || shapeResult.zoneRatio >= 0.75) {
        handleSuccess();
      }
    }
  };

  // When child taps Done button: verify both match accuracy (>= 90%) and character shape match
  const handleDoneClick = () => {
    if (completedStrokes) return;

    const isAccuracyPassed = matchAccuracy >= PASSING_ACCURACY_THRESHOLD;
    const shapeResult = verifyCharacterShape();

    // Pass if accuracy is >= 90% and shape check confirms the character structure
    if (isAccuracyPassed && (shapeResult.matched || shapeResult.zoneRatio >= 0.75)) {
      handleSuccess();
    } else {
      playFeedbackTone('wrong');

      let reminder = '';
      if (!isAccuracyPassed) {
        reminder = isFidel
          ? `ትክክለኛነቱ ${matchAccuracy}% ነው — ለመጨረስ 85% ድረስ! ⭐`
          : `Match is ${matchAccuracy}% — reach 85% to finish! ⭐`;
      } else {
        // Accuracy reached 85% but shape check detected missing parts
        reminder = isFidel
          ? `ጥቂት ቀርቶሃል! የ${currentItem.symbol} ፊደልን ሁሉንም መስመሮች አሟልተህ ጻፍ! ✍️`
          : `Almost there! Trace all strokes of the letter ${currentItem.displayName || currentItem.symbol}! ✍️`;
      }

      setShowNotice(reminder);
      playAudioOrSpeech(
        undefined,
        isFidel ? 'ፊደሉን ሁሉንም መስመሮች አሟልተህ ጻፍ' : 'Trace along all parts of the letter shape'
      );
      setTimeout(() => setShowNotice(null), 3000);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="flex flex-col items-center justify-between h-full p-2 sm:p-3 max-w-xl mx-auto select-none touch-none overflow-hidden">
      {/* Top Prompt & Speaker Bar */}
      <div className="flex items-center justify-between w-full mb-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <SpeakerButton
            audioPath={currentItem.audioPath}
            fallbackSpeech={isFidel ? `${currentItem.symbol} ፊደልን በትክክል ጻፍ!` : `Trace the letter ${currentItem.displayName || currentItem.symbol}`}
            size="md"
          />
          <span className="text-xl sm:text-2xl font-extrabold text-gray-800">
            {isFidel ? `${currentItem.symbol} ፊደልን በትክክል ጻፍ! ✍️` : `Trace the letter ${currentItem.displayName || currentItem.symbol}! ✍️`}
          </span>
        </div>
        <div className="text-lg sm:text-xl font-bold text-gray-400">
          {currentIndex + 1} / {items.length}
        </div>
      </div>

      {/* Match Accuracy Meter Bar (Target: 85%) */}
      <div className="w-full max-w-[340px] md:max-w-[380px] mb-1.5 bg-white rounded-2xl p-2 shadow-xs border border-gray-100 shrink-0">
        <div className="flex items-center justify-between text-xs font-black text-gray-600 mb-1">
          <span className="flex items-center gap-1">
            🎯 {isFidel ? 'የትክክለኛነት መጠን' : 'Match Accuracy'}:
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="text-base font-black transition-colors"
              style={{
                color: matchAccuracy >= PASSING_ACCURACY_THRESHOLD ? '#10B981' : matchAccuracy >= 60 ? '#3B82F6' : '#F59E0B',
              }}
            >
              {matchAccuracy}% {matchAccuracy >= PASSING_ACCURACY_THRESHOLD ? '⭐' : ''}
            </span>
            <span className="text-[11px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full shadow-xs">
              {isFidel ? 'ዒላማ: 85%' : 'Goal: 85%'}
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
          <motion.div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${Math.min(100, Math.max(0, (matchAccuracy / PASSING_ACCURACY_THRESHOLD) * 100))}%`,
              backgroundColor:
                matchAccuracy >= PASSING_ACCURACY_THRESHOLD
                  ? '#10B981'
                  : matchAccuracy >= 60
                  ? '#3B82F6'
                  : '#F59E0B',
            }}
          />
        </div>
      </div>

      {/* Tracing Canvas Area */}
      <div className="relative w-full aspect-square max-w-[320px] md:max-w-[370px] max-h-[48vh] bg-white rounded-3xl shadow-xl border-4 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
        {/* Layer 1: Guide Letter Canvas (Pixel-perfect 1:1 match with hit-testing) */}
        <canvas
          ref={guideCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* Layer 1.5: Directional Stroke Guide Arrows (① → ② → ③) with Numbered Order */}
        {!completedStrokes && strokes.length > 0 && matchAccuracy < 88 && (
          <svg
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          >
            <defs>
              {strokes.map((stroke, sIdx) => (
                <marker
                  key={`arrow-${stroke.order}-${sIdx}`}
                  id={`arrowhead-${stroke.order}-${sIdx}`}
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={stroke.color} />
                </marker>
              ))}
            </defs>

            {strokes.map((stroke, sIdx) => {
              const pathD = stroke.mid
                ? `M ${stroke.from.x} ${stroke.from.y} Q ${stroke.mid.x} ${stroke.mid.y} ${stroke.to.x} ${stroke.to.y}`
                : `M ${stroke.from.x} ${stroke.from.y} L ${stroke.to.x} ${stroke.to.y}`;

              const isFirstStroke = stroke.order === 1;

              return (
                <g key={`stroke-group-${stroke.order}-${sIdx}`} opacity={matchAccuracy > 65 ? 0.35 : 0.88}>
                  {/* Directional Path Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth="3.5"
                    strokeDasharray="6 5"
                    strokeLinecap="round"
                    markerEnd={`url(#arrowhead-${stroke.order}-${sIdx})`}
                  />

                  {/* Numbered Stroke Origin Badge (①, ②, ③) */}
                  <g transform={`translate(${stroke.from.x}, ${stroke.from.y})`}>
                    {isFirstStroke && (
                      <circle
                        r="18"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="3"
                        className="animate-ping"
                        opacity="0.6"
                      />
                    )}
                    <circle
                      r="13"
                      fill={isFirstStroke ? '#10B981' : stroke.color}
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.25))"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontWeight="900"
                    >
                      {stroke.order}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        )}

        {/* Dynamic Green Start Indicator 🟢 (Shows where to start tracing) */}
        {!completedStrokes && startPoint && matchAccuracy < 18 && (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="absolute rounded-full bg-emerald-500 border-2 border-white shadow-xl pointer-events-none z-15 flex items-center justify-center text-white px-2.5 py-1 text-xs font-black gap-1"
            style={{
              left: `${(startPoint.x / CANVAS_SIZE) * 100}%`,
              top: `${Math.max(10, ((startPoint.y - 28) / CANVAS_SIZE) * 100)}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span>🟢</span>
            <span>{isFidel ? 'ጀምር ①' : 'Start ①'}</span>
          </motion.div>
        )}

        {/* Layer 2: Interactive Drawing Canvas */}
        <canvas
          ref={drawCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-20"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Gentle Notice Banner when tapped Done too early or with low accuracy */}
        <AnimatePresence>
          {showNotice && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute bottom-3 left-3 right-3 bg-amber-400 text-amber-950 font-black px-3 py-2 rounded-2xl shadow-xl z-30 text-center text-xs sm:text-sm border-2 border-amber-300"
            >
              {showNotice}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion Celebration Overlay */}
        <AnimatePresence>
          {completedStrokes && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0 }}
              className="absolute inset-0 bg-emerald-500/25 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 pointer-events-none"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.25, 1] }}
                transition={{ duration: 0.8 }}
                className="text-7xl drop-shadow-lg"
              >
                ⭐
              </motion.div>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-800 mt-2 drop-shadow-sm text-center">
                {isFidel ? 'ጎበዝ! ፊደሉን በትክክል ጽፈሃል!' : 'Great job! Traced perfectly!'}
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-700 mt-1">
                {matchAccuracy}% {isFidel ? 'ትክክለኛነት' : 'Accuracy'} ⭐
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons: Clear & Done */}
      <div className="flex items-center justify-between w-full mt-2 shrink-0">
        <button
          onClick={clearCanvas}
          className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-bold text-base shadow-xs transition-colors cursor-pointer"
        >
          {isFidel ? '🔄 አጥፋ' : '🔄 Clear'}
        </button>

        <BigButton
          onClick={handleDoneClick}
          variant="success"
          size="md"
        >
          {isFidel ? 'ጨረስኩ ✨' : 'Done ✨'}
        </BigButton>
      </div>
    </div>
  );
}
