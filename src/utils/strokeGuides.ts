/**
 * Directional Stroke Guide Arrows for TraceIt
 * Provides stroke order data (①, ②, ③), direction vectors,
 * and animated arrow indicators for handwriting practice.
 */

export interface NormalizedStroke {
  order: number;
  // Normalized 0..1 coordinates relative to glyph bounding box
  from: { x: number; y: number };
  to: { x: number; y: number };
  mid?: { x: number; y: number };
  type?: 'line' | 'curve' | 'loop';
}

export interface RenderedStroke {
  order: number;
  badge: string; // ①, ②, ③, ④
  from: { x: number; y: number };
  to: { x: number; y: number };
  mid?: { x: number; y: number };
  angleDeg: number;
  color: string;
}

const NUMBER_BADGES = ['①', '②', '③', '④', '⑤', '⑥'];
const STROKE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

// Stroke guides for English uppercase letters (A-Z)
const UPPER_STROKES: Record<string, NormalizedStroke[]> = {
  A: [
    { order: 1, from: { x: 0.5, y: 0.05 }, to: { x: 0.1, y: 0.95 } },
    { order: 2, from: { x: 0.5, y: 0.05 }, to: { x: 0.9, y: 0.95 } },
    { order: 3, from: { x: 0.25, y: 0.62 }, to: { x: 0.75, y: 0.62 } },
  ],
  B: [
    { order: 1, from: { x: 0.18, y: 0.05 }, to: { x: 0.18, y: 0.95 } },
    { order: 2, from: { x: 0.18, y: 0.12 }, mid: { x: 0.78, y: 0.28 }, to: { x: 0.22, y: 0.5 }, type: 'curve' },
    { order: 3, from: { x: 0.22, y: 0.5 }, mid: { x: 0.85, y: 0.72 }, to: { x: 0.18, y: 0.9 }, type: 'curve' },
  ],
  C: [
    { order: 1, from: { x: 0.85, y: 0.18 }, mid: { x: 0.12, y: 0.5 }, to: { x: 0.85, y: 0.82 }, type: 'curve' },
  ],
  D: [
    { order: 1, from: { x: 0.18, y: 0.05 }, to: { x: 0.18, y: 0.95 } },
    { order: 2, from: { x: 0.18, y: 0.1 }, mid: { x: 0.88, y: 0.5 }, to: { x: 0.18, y: 0.9 }, type: 'curve' },
  ],
  E: [
    { order: 1, from: { x: 0.18, y: 0.05 }, to: { x: 0.18, y: 0.95 } },
    { order: 2, from: { x: 0.18, y: 0.08 }, to: { x: 0.82, y: 0.08 } },
    { order: 3, from: { x: 0.18, y: 0.5 }, to: { x: 0.68, y: 0.5 } },
    { order: 4, from: { x: 0.18, y: 0.92 }, to: { x: 0.82, y: 0.92 } },
  ],
  F: [
    { order: 1, from: { x: 0.18, y: 0.05 }, to: { x: 0.18, y: 0.95 } },
    { order: 2, from: { x: 0.18, y: 0.08 }, to: { x: 0.82, y: 0.08 } },
    { order: 3, from: { x: 0.18, y: 0.5 }, to: { x: 0.65, y: 0.5 } },
  ],
  G: [
    { order: 1, from: { x: 0.85, y: 0.18 }, mid: { x: 0.12, y: 0.5 }, to: { x: 0.85, y: 0.82 }, type: 'curve' },
    { order: 2, from: { x: 0.85, y: 0.65 }, to: { x: 0.52, y: 0.65 } },
  ],
  H: [
    { order: 1, from: { x: 0.18, y: 0.05 }, to: { x: 0.18, y: 0.95 } },
    { order: 2, from: { x: 0.82, y: 0.05 }, to: { x: 0.82, y: 0.95 } },
    { order: 3, from: { x: 0.18, y: 0.5 }, to: { x: 0.82, y: 0.5 } },
  ],
  I: [
    { order: 1, from: { x: 0.5, y: 0.08 }, to: { x: 0.5, y: 0.92 } },
    { order: 2, from: { x: 0.22, y: 0.08 }, to: { x: 0.78, y: 0.08 } },
    { order: 3, from: { x: 0.22, y: 0.92 }, to: { x: 0.78, y: 0.92 } },
  ],
  J: [
    { order: 1, from: { x: 0.68, y: 0.08 }, mid: { x: 0.68, y: 0.75 }, to: { x: 0.22, y: 0.75 }, type: 'curve' },
    { order: 2, from: { x: 0.38, y: 0.08 }, to: { x: 0.88, y: 0.08 } },
  ],
  K: [
    { order: 1, from: { x: 0.18, y: 0.05 }, to: { x: 0.18, y: 0.95 } },
    { order: 2, from: { x: 0.82, y: 0.1 }, to: { x: 0.22, y: 0.55 } },
    { order: 3, from: { x: 0.32, y: 0.48 }, to: { x: 0.85, y: 0.95 } },
  ],
  L: [
    { order: 1, from: { x: 0.2, y: 0.05 }, to: { x: 0.2, y: 0.92 } },
    { order: 2, from: { x: 0.2, y: 0.92 }, to: { x: 0.82, y: 0.92 } },
  ],
  M: [
    { order: 1, from: { x: 0.15, y: 0.05 }, to: { x: 0.15, y: 0.95 } },
    { order: 2, from: { x: 0.15, y: 0.08 }, to: { x: 0.5, y: 0.68 } },
    { order: 3, from: { x: 0.5, y: 0.68 }, to: { x: 0.85, y: 0.08 } },
    { order: 4, from: { x: 0.85, y: 0.05 }, to: { x: 0.85, y: 0.95 } },
  ],
  N: [
    { order: 1, from: { x: 0.18, y: 0.05 }, to: { x: 0.18, y: 0.95 } },
    { order: 2, from: { x: 0.18, y: 0.08 }, to: { x: 0.82, y: 0.92 } },
    { order: 3, from: { x: 0.82, y: 0.05 }, to: { x: 0.82, y: 0.95 } },
  ],
  O: [
    { order: 1, from: { x: 0.5, y: 0.05 }, mid: { x: 0.1, y: 0.5 }, to: { x: 0.5, y: 0.95 }, type: 'curve' },
    { order: 2, from: { x: 0.5, y: 0.95 }, mid: { x: 0.9, y: 0.5 }, to: { x: 0.5, y: 0.05 }, type: 'curve' },
  ],
  P: [
    { order: 1, from: { x: 0.18, y: 0.05 }, to: { x: 0.18, y: 0.95 } },
    { order: 2, from: { x: 0.18, y: 0.1 }, mid: { x: 0.85, y: 0.32 }, to: { x: 0.2, y: 0.55 }, type: 'curve' },
  ],
  Q: [
    { order: 1, from: { x: 0.5, y: 0.05 }, mid: { x: 0.1, y: 0.5 }, to: { x: 0.5, y: 0.95 }, type: 'curve' },
    { order: 2, from: { x: 0.55, y: 0.65 }, to: { x: 0.88, y: 0.95 } },
  ],
  R: [
    { order: 1, from: { x: 0.18, y: 0.05 }, to: { x: 0.18, y: 0.95 } },
    { order: 2, from: { x: 0.18, y: 0.1 }, mid: { x: 0.82, y: 0.32 }, to: { x: 0.22, y: 0.55 }, type: 'curve' },
    { order: 3, from: { x: 0.35, y: 0.55 }, to: { x: 0.85, y: 0.95 } },
  ],
  S: [
    { order: 1, from: { x: 0.82, y: 0.18 }, mid: { x: 0.18, y: 0.38 }, to: { x: 0.5, y: 0.5 }, type: 'curve' },
    { order: 2, from: { x: 0.5, y: 0.5 }, mid: { x: 0.85, y: 0.65 }, to: { x: 0.18, y: 0.85 }, type: 'curve' },
  ],
  T: [
    { order: 1, from: { x: 0.12, y: 0.08 }, to: { x: 0.88, y: 0.08 } },
    { order: 2, from: { x: 0.5, y: 0.08 }, to: { x: 0.5, y: 0.92 } },
  ],
  U: [
    { order: 1, from: { x: 0.18, y: 0.08 }, mid: { x: 0.5, y: 0.95 }, to: { x: 0.82, y: 0.08 }, type: 'curve' },
  ],
  V: [
    { order: 1, from: { x: 0.12, y: 0.08 }, to: { x: 0.5, y: 0.92 } },
    { order: 2, from: { x: 0.5, y: 0.92 }, to: { x: 0.88, y: 0.08 } },
  ],
  W: [
    { order: 1, from: { x: 0.12, y: 0.08 }, to: { x: 0.32, y: 0.92 } },
    { order: 2, from: { x: 0.32, y: 0.92 }, to: { x: 0.5, y: 0.35 } },
    { order: 3, from: { x: 0.5, y: 0.35 }, to: { x: 0.68, y: 0.92 } },
    { order: 4, from: { x: 0.68, y: 0.92 }, to: { x: 0.88, y: 0.08 } },
  ],
  X: [
    { order: 1, from: { x: 0.15, y: 0.08 }, to: { x: 0.85, y: 0.92 } },
    { order: 2, from: { x: 0.85, y: 0.08 }, to: { x: 0.15, y: 0.92 } },
  ],
  Y: [
    { order: 1, from: { x: 0.15, y: 0.08 }, to: { x: 0.5, y: 0.52 } },
    { order: 2, from: { x: 0.85, y: 0.08 }, to: { x: 0.5, y: 0.52 } },
    { order: 3, from: { x: 0.5, y: 0.52 }, to: { x: 0.5, y: 0.95 } },
  ],
  Z: [
    { order: 1, from: { x: 0.15, y: 0.1 }, to: { x: 0.85, y: 0.1 } },
    { order: 2, from: { x: 0.85, y: 0.1 }, to: { x: 0.15, y: 0.9 } },
    { order: 3, from: { x: 0.15, y: 0.9 }, to: { x: 0.85, y: 0.9 } },
  ],
};

// Stroke guides for Numbers (0-9)
const NUMBER_STROKES: Record<string, NormalizedStroke[]> = {
  '0': [
    { order: 1, from: { x: 0.5, y: 0.05 }, mid: { x: 0.15, y: 0.5 }, to: { x: 0.5, y: 0.95 }, type: 'curve' },
    { order: 2, from: { x: 0.5, y: 0.95 }, mid: { x: 0.85, y: 0.5 }, to: { x: 0.5, y: 0.05 }, type: 'curve' },
  ],
  '1': [
    { order: 1, from: { x: 0.3, y: 0.22 }, to: { x: 0.5, y: 0.05 } },
    { order: 2, from: { x: 0.5, y: 0.05 }, to: { x: 0.5, y: 0.95 } },
  ],
  '2': [
    { order: 1, from: { x: 0.2, y: 0.25 }, mid: { x: 0.82, y: 0.25 }, to: { x: 0.2, y: 0.9 }, type: 'curve' },
    { order: 2, from: { x: 0.2, y: 0.9 }, to: { x: 0.85, y: 0.9 } },
  ],
  '3': [
    { order: 1, from: { x: 0.2, y: 0.15 }, mid: { x: 0.8, y: 0.32 }, to: { x: 0.45, y: 0.5 }, type: 'curve' },
    { order: 2, from: { x: 0.45, y: 0.5 }, mid: { x: 0.85, y: 0.72 }, to: { x: 0.2, y: 0.88 }, type: 'curve' },
  ],
  '4': [
    { order: 1, from: { x: 0.68, y: 0.08 }, to: { x: 0.15, y: 0.65 } },
    { order: 2, from: { x: 0.15, y: 0.65 }, to: { x: 0.88, y: 0.65 } },
    { order: 3, from: { x: 0.68, y: 0.35 }, to: { x: 0.68, y: 0.95 } },
  ],
  '5': [
    { order: 1, from: { x: 0.75, y: 0.1 }, to: { x: 0.28, y: 0.1 } },
    { order: 2, from: { x: 0.28, y: 0.1 }, to: { x: 0.25, y: 0.45 } },
    { order: 3, from: { x: 0.25, y: 0.45 }, mid: { x: 0.85, y: 0.65 }, to: { x: 0.22, y: 0.9 }, type: 'curve' },
  ],
  '6': [
    { order: 1, from: { x: 0.75, y: 0.1 }, mid: { x: 0.18, y: 0.55 }, to: { x: 0.5, y: 0.95 }, type: 'curve' },
    { order: 2, from: { x: 0.5, y: 0.95 }, mid: { x: 0.82, y: 0.75 }, to: { x: 0.22, y: 0.65 }, type: 'curve' },
  ],
  '7': [
    { order: 1, from: { x: 0.15, y: 0.1 }, to: { x: 0.85, y: 0.1 } },
    { order: 2, from: { x: 0.85, y: 0.1 }, to: { x: 0.35, y: 0.95 } },
  ],
  '8': [
    { order: 1, from: { x: 0.5, y: 0.5 }, mid: { x: 0.2, y: 0.28 }, to: { x: 0.5, y: 0.08 }, type: 'curve' },
    { order: 2, from: { x: 0.5, y: 0.08 }, mid: { x: 0.8, y: 0.28 }, to: { x: 0.5, y: 0.5 }, type: 'curve' },
    { order: 3, from: { x: 0.5, y: 0.5 }, mid: { x: 0.18, y: 0.75 }, to: { x: 0.5, y: 0.95 }, type: 'curve' },
    { order: 4, from: { x: 0.5, y: 0.95 }, mid: { x: 0.82, y: 0.75 }, to: { x: 0.5, y: 0.5 }, type: 'curve' },
  ],
  '9': [
    { order: 1, from: { x: 0.5, y: 0.08 }, mid: { x: 0.18, y: 0.3 }, to: { x: 0.5, y: 0.52 }, type: 'curve' },
    { order: 2, from: { x: 0.82, y: 0.1 }, to: { x: 0.82, y: 0.75 } },
    { order: 3, from: { x: 0.82, y: 0.75 }, to: { x: 0.35, y: 0.95 } },
  ],
};

// Common Amharic Fidels
const FIDEL_STROKES: Record<string, NormalizedStroke[]> = {
  ሀ: [
    { order: 1, from: { x: 0.22, y: 0.1 }, to: { x: 0.22, y: 0.92 } },
    { order: 2, from: { x: 0.78, y: 0.1 }, to: { x: 0.78, y: 0.92 } },
    { order: 3, from: { x: 0.22, y: 0.45 }, to: { x: 0.78, y: 0.45 } },
  ],
  ለ: [
    { order: 1, from: { x: 0.22, y: 0.1 }, to: { x: 0.35, y: 0.92 } },
    { order: 2, from: { x: 0.78, y: 0.1 }, to: { x: 0.65, y: 0.92 } },
  ],
  መ: [
    { order: 1, from: { x: 0.25, y: 0.1 }, to: { x: 0.25, y: 0.82 } },
    { order: 2, from: { x: 0.75, y: 0.1 }, to: { x: 0.75, y: 0.82 } },
    { order: 3, from: { x: 0.25, y: 0.82 }, to: { x: 0.75, y: 0.82 } },
  ],
  በ: [
    { order: 1, from: { x: 0.2, y: 0.1 }, to: { x: 0.2, y: 0.88 } },
    { order: 2, from: { x: 0.2, y: 0.88 }, to: { x: 0.8, y: 0.88 } },
    { order: 3, from: { x: 0.8, y: 0.88 }, to: { x: 0.8, y: 0.1 } },
  ],
  ተ: [
    { order: 1, from: { x: 0.2, y: 0.2 }, to: { x: 0.2, y: 0.9 } },
    { order: 2, from: { x: 0.2, y: 0.9 }, to: { x: 0.8, y: 0.9 } },
    { order: 3, from: { x: 0.8, y: 0.9 }, to: { x: 0.8, y: 0.2 } },
    { order: 4, from: { x: 0.5, y: 0.2 }, to: { x: 0.5, y: 0.05 } },
  ],
  ሰ: [
    { order: 1, from: { x: 0.2, y: 0.1 }, to: { x: 0.2, y: 0.88 } },
    { order: 2, from: { x: 0.8, y: 0.1 }, to: { x: 0.8, y: 0.88 } },
    { order: 3, from: { x: 0.2, y: 0.88 }, to: { x: 0.8, y: 0.88 } },
  ],
  ረ: [
    { order: 1, from: { x: 0.22, y: 0.1 }, to: { x: 0.78, y: 0.1 } },
    { order: 2, from: { x: 0.78, y: 0.1 }, to: { x: 0.55, y: 0.92 } },
  ],
  ቀ: [
    { order: 1, from: { x: 0.5, y: 0.1 }, mid: { x: 0.2, y: 0.35 }, to: { x: 0.5, y: 0.55 }, type: 'curve' },
    { order: 2, from: { x: 0.5, y: 0.55 }, to: { x: 0.5, y: 0.95 } },
  ],
};

/**
 * Calculates angle in degrees for the arrowhead from (from) to (to)
 */
function calculateAngle(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Converts normalized stroke data into absolute canvas pixel coordinates
 * mapped to the character's bounding box.
 */
export function getRenderedStrokes(
  symbol: string,
  box: { minX: number; maxX: number; minY: number; maxY: number },
  startPoint?: { x: number; y: number }
): RenderedStroke[] {
  const boxW = Math.max(20, box.maxX - box.minX);
  const boxH = Math.max(20, box.maxY - box.minY);

  let normalizedList: NormalizedStroke[] | undefined =
    UPPER_STROKES[symbol] ||
    UPPER_STROKES[symbol.toUpperCase()] ||
    NUMBER_STROKES[symbol] ||
    FIDEL_STROKES[symbol];

  // Procedural fallback if no explicit stroke definition exists
  if (!normalizedList || normalizedList.length === 0) {
    const sX = startPoint ? (startPoint.x - box.minX) / boxW : 0.2;
    const sY = startPoint ? (startPoint.y - box.minY) / boxH : 0.1;

    normalizedList = [
      {
        order: 1,
        from: { x: Math.max(0.05, Math.min(0.95, sX)), y: Math.max(0.05, Math.min(0.95, sY)) },
        to: { x: 0.5, y: 0.5 },
      },
      {
        order: 2,
        from: { x: 0.5, y: 0.5 },
        to: { x: 0.8, y: 0.9 },
      },
    ];
  }

  return normalizedList.map((stroke, index) => {
    const fromX = box.minX + stroke.from.x * boxW;
    const fromY = box.minY + stroke.from.y * boxH;
    const toX = box.minX + stroke.to.x * boxW;
    const toY = box.minY + stroke.to.y * boxH;
    const midX = stroke.mid ? box.minX + stroke.mid.x * boxW : undefined;
    const midY = stroke.mid ? box.minY + stroke.mid.y * boxH : undefined;

    const angleDeg = stroke.mid
      ? calculateAngle({ x: midX!, y: midY! }, { x: toX, y: toY })
      : calculateAngle({ x: fromX, y: fromY }, { x: toX, y: toY });

    return {
      order: stroke.order,
      badge: NUMBER_BADGES[index % NUMBER_BADGES.length],
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY },
      mid: midX != null && midY != null ? { x: midX, y: midY } : undefined,
      angleDeg,
      color: STROKE_COLORS[index % STROKE_COLORS.length],
    };
  });
}
