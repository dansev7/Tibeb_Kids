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
}

export type StageType = 'meet' | 'find' | 'match' | 'quiz' | 'celebrate';

export interface Stage {
  type: StageType;
  items: GameItem[];
  distractors?: GameItem[];
}
