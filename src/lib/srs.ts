/**
 * Leitner Spaced Repetition System (SRS) for Little Learner
 *
 * Designed for early childhood learning:
 * - 5 Leitner boxes
 * - Box 1: review every session (interval 0 days)
 * - Box 2: review every 2 days
 * - Box 3: review every 4 days
 * - Box 4: review every 8 days
 * - Box 5: review every 16 days
 * - Correct answer moves item to next box (up to box 5)
 * - Wrong answer moves item back to box 1
 * - Item is "mastered" when correct_days >= 3
 */

export const LEITNER_INTERVALS_DAYS: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
};

export const MAX_LEITNER_BOX = 5;
export const MIN_LEITNER_BOX = 1;
export const MASTERED_CORRECT_DAYS_THRESHOLD = 3;

/**
 * Checks whether an item is considered mastered based on correctDays count.
 */
export function isItemMastered(correctDays: number): boolean {
  return correctDays >= MASTERED_CORRECT_DAYS_THRESHOLD;
}

/**
 * Calculates the next review date for a given Leitner box.
 * Returns an ISO date string (e.g. "2026-10-14T19:00:00.000Z").
 */
export function getNextReviewDate(box: number, fromDate: Date | string = new Date()): string {
  const date = typeof fromDate === 'string' ? new Date(fromDate) : new Date(fromDate.getTime());
  const clampedBox = Math.max(MIN_LEITNER_BOX, Math.min(MAX_LEITNER_BOX, box));
  const daysToAdd = LEITNER_INTERVALS_DAYS[clampedBox] ?? 0;

  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString();
}

export interface MasteryUpdateResult {
  nextBox: number;
  correctDays: number;
  nextReviewAt: string;
  isMastered: boolean;
}

/**
 * Updates mastery state after a child's answer.
 * - Correct answer: moves item up one box (max 5) and increments correct_days.
 * - Wrong answer: moves item back to box 1 and resets correct_days streak.
 */
export function updateMastery(
  correct: boolean,
  currentBox: number = 1,
  currentCorrectDays: number = 0
): MasteryUpdateResult {
  let nextBox: number;
  let correctDays: number;

  if (correct) {
    nextBox = Math.min(MAX_LEITNER_BOX, Math.max(MIN_LEITNER_BOX, currentBox) + 1);
    correctDays = currentCorrectDays + 1;
  } else {
    nextBox = 1;
    correctDays = 0;
  }

  const nextReviewAt = getNextReviewDate(nextBox);
  const mastered = isItemMastered(correctDays);

  return {
    nextBox,
    correctDays,
    nextReviewAt,
    isMastered: mastered,
  };
}

/**
 * Generic item shape for review checking.
 * Supports camelCase and snake_case properties.
 */
export interface ItemWithReviewDate {
  id?: string | number;
  nextReviewAt?: string | null;
  next_review_at?: string | null;
  leitnerBox?: number | null;
  leitner_box?: number | null;
  [key: string]: any;
}

/**
 * Filters items that are due for review on or before currentDate.
 * Items in Box 1 or items with no review date are reviewed every session.
 */
export function getItemsDueForReview<T extends ItemWithReviewDate>(
  items: T[],
  currentDate: Date | string = new Date()
): T[] {
  const current = typeof currentDate === 'string' ? new Date(currentDate) : currentDate;
  const currentTimestamp = current.getTime();

  return items.filter((item) => {
    const box = item.leitnerBox ?? item.leitner_box ?? 1;
    // Box 1 items are reviewed every session
    if (box <= 1) {
      return true;
    }

    const reviewDateStr = item.nextReviewAt ?? item.next_review_at;
    if (!reviewDateStr) {
      return true;
    }

    const reviewTimestamp = new Date(reviewDateStr).getTime();
    if (isNaN(reviewTimestamp)) {
      return true;
    }

    return reviewTimestamp <= currentTimestamp;
  });
}
