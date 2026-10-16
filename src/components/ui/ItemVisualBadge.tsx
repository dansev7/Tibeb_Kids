'use client';

import React, { useState } from 'react';
import { getItemEmoji } from '@/utils/itemVisuals';

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
