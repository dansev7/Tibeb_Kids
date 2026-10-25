export interface GameItem {
  id: string;
  symbol: string;
  displayName: string;
  audioPath: string;
  picturePath: string;
  pictureWord: string;
  pictureWordAmharic?: string;
  pictureWordEnglish?: string;
  pictureWordAudioPath: string;
  kind: 'letter_upper' | 'letter_lower' | 'number' | 'fidel';
  confusableWith?: string[];
}


export interface StageResult {
  itemId: string;
  correct: boolean;
  usedHint: boolean;
  firstTry: boolean;
  /** Stage/game that produced this result — attached by the play page. */
  gameType?: string;
}

export type StageType =
  | 'meet'
  | 'find'
  | 'match'
  | 'count'
  | 'trace'
  | 'whatsNext'
  | 'spotDifference'
  | 'listen'
  | 'quiz'
  | 'celebrate'
  | string;

export interface Stage {
  type: StageType;
  items: GameItem[];
  distractors?: GameItem[];
}
