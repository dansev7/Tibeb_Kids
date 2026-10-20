'use client';

import React, { useState } from 'react';
import { getItemEmoji, getNumberUnitEmoji } from '@/utils/itemVisuals';

interface ItemVisualBadgeProps {
  item?: {
    picturePath?: string | null;
    pictureWord?: string | null;
    pictureWordEnglish?: string | null;
    pictureWordAmharic?: string | null;
    symbol?: string | null;
    displayName?: string | null;
    kind?: string | null;
  } | null;
  className?: string;
  emojiSize?: string;
}

export default function ItemVisualBadge({
  item,
  className = 'w-24 h-24 sm:w-28 sm:h-28',
  emojiSize = 'text-5xl sm:text-6xl',
}: ItemVisualBadgeProps) {
  const [imgError, setImgError] = useState(false);
  const emoji = getItemEmoji(item);

  // For numbers, render the exact quantity of objects directly on the badge
  const isNumber = item?.kind === 'number';
  const count = isNumber && item?.symbol ? parseInt(item.symbol, 10) : null;

  if (isNumber && count !== null && !isNaN(count)) {
    if (count === 0) {
      return (
        <div
          className={`${className} rounded-2xl bg-amber-50/90 flex flex-col items-center justify-center overflow-hidden border-2 border-amber-200 shadow-inner select-none shrink-0 p-1`}
        >
          <span className="text-4xl sm:text-5xl" role="img" aria-label="Empty Basket">🧺</span>
          <span className="text-[10px] sm:text-xs font-black text-amber-800 mt-0.5">Empty (0)</span>
        </div>
      );
    }

    const unitEmoji = getNumberUnitEmoji(item);
    const fontSize =
      count === 1
        ? 'text-5xl sm:text-6xl'
        : count === 2
        ? 'text-4xl sm:text-5xl'
        : count <= 4
        ? 'text-3xl sm:text-4xl'
        : count <= 6
        ? 'text-2xl sm:text-3xl'
        : count <= 9
        ? 'text-xl sm:text-2xl'
        : count <= 12
        ? 'text-base sm:text-lg'
        : 'text-xs sm:text-sm';

    return (
      <div
        className={`${className} rounded-2xl bg-amber-50/90 flex items-center justify-center overflow-hidden border-2 border-amber-200 shadow-inner select-none shrink-0 p-2`}
      >
        <div className="w-full h-full flex flex-wrap items-center justify-center content-center gap-1">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              className={`${fontSize} leading-none transform transition-transform hover:scale-125 select-none`}
              role="img"
              aria-label={`${count} ${item?.pictureWord || ''}`}
            >
              {unitEmoji}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-2xl bg-amber-50/90 flex items-center justify-center overflow-hidden border-2 border-amber-200 shadow-inner select-none shrink-0`}
    >
      {item?.picturePath && !imgError ? (
        <img
          src={item.picturePath}
          alt={item.pictureWord || item.displayName || item.symbol || ''}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain p-1.5"
        />
      ) : (
        <span
          className={`${emojiSize} w-full h-full flex items-center justify-center text-center select-none leading-none transform transition-transform hover:scale-110`}
          role="img"
          aria-label={item?.pictureWord || ''}
        >
          {emoji}
        </span>
      )}
    </div>
  );
}
