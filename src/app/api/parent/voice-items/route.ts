import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { asc } from 'drizzle-orm';

export interface VoiceItemTarget {
  id: string;
  category: 'prompts' | 'english' | 'numbers' | 'amharic';
  title: string;
  subtitle: string;
  promptText: string;
  audioPath: string;
  symbol?: string;
  kind?: string;
  word?: string;
  wordAudioPath?: string;
}

const SYSTEM_PROMPTS: VoiceItemTarget[] = [
  {
    id: 'prompt_tap_the',
    category: 'prompts',
    title: 'Tap the...',
    subtitle: 'Instruction prompt',
    promptText: 'Tap the...',
    audioPath: '/audio/prompts/tap_the.mp3',
  },
  {
    id: 'prompt_find_the',
    category: 'prompts',
    title: 'Find the...',
    subtitle: 'Recognition prompt',
    promptText: 'Find the...',
    audioPath: '/audio/prompts/find_the.mp3',
  },
  {
    id: 'prompt_great_job',
    category: 'prompts',
    title: 'Great Job!',
    subtitle: 'Positive reinforcement',
    promptText: 'Great job!',
    audioPath: '/audio/prompts/great_job.mp3',
  },
  {
    id: 'prompt_try_again',
    category: 'prompts',
    title: 'Try Again',
    subtitle: 'Gentle encouragement',
    promptText: 'Try again! Almost there!',
    audioPath: '/audio/prompts/try_again.mp3',
  },
  {
    id: 'prompt_you_did_it',
    category: 'prompts',
    title: 'You Did It!',
    subtitle: 'Victory cheer',
    promptText: 'You did it! Amazing!',
    audioPath: '/audio/prompts/you_did_it.mp3',
  },
  {
    id: 'prompt_lets_match',
    category: 'prompts',
    title: "Let's Match",
    subtitle: 'Match game prompt',
    promptText: "Let's match them up!",
    audioPath: '/audio/prompts/lets_match.mp3',
  },
  {
    id: 'prompt_listen_carefully',
    category: 'prompts',
    title: 'Listen Carefully',
    subtitle: 'Audio focus prompt',
    promptText: 'Listen carefully!',
    audioPath: '/audio/prompts/listen_carefully.mp3',
  },
  {
    id: 'prompt_goodbye_tomorrow',
    category: 'prompts',
    title: 'Session Rest Mascot',
    subtitle: 'Daily rest message',
    promptText: 'Great job today! See you tomorrow!',
    audioPath: '/audio/prompts/goodbye_tomorrow.mp3',
  },
  {
    id: 'prompt_see_you_soon',
    category: 'prompts',
    title: 'Break Reminder',
    subtitle: 'Gentle pause prompt',
    promptText: 'Time for a break! See you soon!',
    audioPath: '/audio/prompts/see_you_soon.mp3',
  },
];

export async function GET() {
  try {
    const allItems = db
      .select({
        id: items.id,
        kind: items.kind,
        symbol: items.symbol,
        displayName: items.displayName,
        audioPath: items.audioPath,
        pictureWord: items.pictureWord,
        pictureWordAmharic: items.pictureWordAmharic,
        pictureWordEnglish: items.pictureWordEnglish,
        pictureWordAudioPath: items.pictureWordAudioPath,
      })
      .from(items)
      .orderBy(asc(items.id))
      .all();

    const english: VoiceItemTarget[] = [];
    const numbers: VoiceItemTarget[] = [];
    const amharic: VoiceItemTarget[] = [];

    for (const item of allItems) {
      if (item.kind === 'letter_upper' || item.kind === 'letter_lower') {
        english.push({
          id: item.id,
          category: 'english',
          title: item.displayName || item.symbol,
          subtitle: item.pictureWord ? `Word: ${item.pictureWord}` : '',
          promptText: item.displayName || item.symbol,
          audioPath: item.audioPath || '',
          symbol: item.symbol,
          kind: item.kind,
          word: item.pictureWord || undefined,
          wordAudioPath: item.pictureWordAudioPath || undefined,
        });
      } else if (item.kind === 'number') {
        numbers.push({
          id: item.id,
          category: 'numbers',
          title: `Number ${item.symbol}`,
          subtitle: item.pictureWord ? `${item.pictureWord}` : (item.displayName || ''),
          promptText: item.displayName || item.symbol,
          audioPath: item.audioPath || '',
          symbol: item.symbol,
          kind: item.kind,
          word: item.pictureWord || undefined,
          wordAudioPath: item.pictureWordAudioPath || undefined,
        });
      } else if (item.kind === 'fidel') {
        const amharicWord = item.pictureWordAmharic || item.pictureWord || '';
        const englishTranslation = item.pictureWordEnglish ? ` (${item.pictureWordEnglish})` : '';
        amharic.push({
          id: item.id,
          category: 'amharic',
          title: `ፊደል ${item.symbol}`,
          subtitle: amharicWord ? `ቃል: ${amharicWord}${englishTranslation}` : '',
          promptText: item.symbol,
          audioPath: item.audioPath || '',
          symbol: item.symbol,
          kind: item.kind,
          word: amharicWord || undefined,
          wordAudioPath: item.pictureWordAudioPath || undefined,
        });
      }
    }

    return NextResponse.json({
      prompts: SYSTEM_PROMPTS,
      english,
      numbers,
      amharic,
      stats: {
        totalPrompts: SYSTEM_PROMPTS.length,
        totalEnglish: english.length,
        totalNumbers: numbers.length,
        totalAmharic: amharic.length,
        totalItems: SYSTEM_PROMPTS.length + english.length + numbers.length + amharic.length,
      },
    });
  } catch (error) {
    console.error('Error fetching voice items targets:', error);
    return NextResponse.json(
      { error: 'Failed to load audio targets', prompts: SYSTEM_PROMPTS, english: [], numbers: [], amharic: [] },
      { status: 200 }
    );
  }
}
