/**
 * Visual Icon & Emoji Mapping for Little Learner
 * Provides vibrant, child-friendly icons and emojis for all vocabulary words across:
 * 1. Worldly English Alphabet (A: Apple 🍎 ... Z: Zebra 🦓)
 * 2. Number Quantities & Countables (1: Sun ☀️, 2: Shoes 👟 ... 20: Cows 🐄)
 * 3. Amharic Fidel Words (በ: በግ 🐑, መ: መኪና 🚗, ወ: ወተት 🥛, etc.)
 */

export const VOCABULARY_EMOJIS: Record<string, string> = {
  // English Alphabet (Worldly common words requested by user)
  apple: '🍎',
  ball: '⚽',
  balls: '⚽',
  cat: '🐱',
  dog: '🐶',
  elephant: '🐘',
  egg: '🥚',
  eggs: '🥚',
  food: '🍕',
  grapes: '🍇',
  grape: '🍇',
  hat: '🎩',
  icecream: '🍦',
  'ice cream': '🍦',
  'ice-cream': '🍦',
  jeep: '🚙',
  key: '🔑',
  lion: '🦁',
  motorbike: '🏍️',
  motorcycle: '🏍️',
  nest: '🪺',
  orange: '🍊',
  parrot: '🦜',
  queen: '👑',
  quill: '🪶',
  ring: '💍',
  shoes: '👟',
  shoe: '👟',
  shose: '👟',
  tea: '🍵',
  umbrella: '☂️',
  violin: '🎻',
  watch: '⌚',
  xylophone: '🎵',
  xmas: '🎄',
  'x-ray': '🩻',
  yellow: '💛',
  yak: '🐂',
  zebra: '🦓',

  // Other common English words & legacy fallbacks
  kite: '🪁',
  house: '🏠',
  mango: '🥭',
  mangoes: '🥭',
  pencil: '✏️',
  pencils: '✏️',
  rabbit: '🐰',
  sun: '☀️',
  tree: '🌳',
  trees: '🌳',
  van: '🚐',
  water: '💧',
  fish: '🐟',
  goat: '🐐',

  // Phase 2: CVC Words, Rhyme Families & Sight Words
  bat: '🦇',
  rat: '🐀',
  pan: '🍳',
  fan: '🪭',
  can: '🥫',
  map: '🗺️',
  log: '🪵',
  frog: '🐸',
  hop: '🦘',
  mop: '🧹',
  hen: '🐔',
  pen: '🖊️',
  ten: '🔟',
  pig: '🐷',
  big: '🐘',
  dig: '⛏️',
  bug: '🐛',
  mug: '☕',
  hug: '🤗',
  run: '🏃',
  bun: '🍞',
  pot: '🍯',
  bed: '🛏️',
  red: '🔴',
  i: '🙋',
  see: '👀',
  the: '📖',
  go: '🚦',

  // Number farm countables & quantities
  'empty basket': '🧺',
  basket: '🧺',
  bottle: '🍼',
  bottles: '🍼',
  '1 apple': '🍎',
  '2 oranges': '🍊',
  '3 mangoes': '🥭',
  '4 flowers': '🌸',
  '5 bottles': '🍼',
  '6 balloons': '🎈',
  '7 stars': '⭐',
  '8 candies': '🍬',
  '9 butterflies': '🦋',
  '10 pencils': '✏️',
  '11 hearts': '❤️',
  '12 fish': '🐟',
  '13 birds': '🐦',
  '14 eggs': '🥚',
  '15 leaves': '🍃',
  '16 trees': '🌳',
  '17 books': '📚',
  '18 cups': '🥛',
  '19 buttons': '🔘',
  '20 cows': '🐄',
  stars: '⭐',
  star: '⭐',
  flowers: '🌸',
  flower: '🌸',
  butterflies: '🦋',
  butterfly: '🦋',
  birds: '🐦',
  bird: '🐦',
  candies: '🍬',
  candy: '🍬',
  balloons: '🎈',
  balloon: '🎈',
  leaves: '🍃',
  leaf: '🍃',
  hearts: '❤️',
  heart: '❤️',
  books: '📚',
  book: '📚',
  cups: '🥛',
  cup: '🥛',
  buttons: '🔘',
  button: '🔘',
  cows: '🐄',
  cow: '🐄',

  // Amharic Fidel Words (Amharic keys & English translations)
  // High-frequency Fidel Families (Orders 2-7)
  ሉል: '🔮', pearl: '🔮',
  ሊጥ: '🥣', dough: '🥣',
  ላም: '🐄',
  ሌሊት: '🌙', night: '🌙',
  ልብስ: '👕', clothes: '👕',
  ሎሚ: '🍋', lemon: '🍋',
  ሙዝ: '🍌', banana: '🍌',
  ሚዛን: '⚖️', scale: '⚖️',
  ማር: '🍯', honey: '🍯',
  ሜዳ: '🏞️', field: '🏞️',
  ምሳ: '🍲', lunch: '🍲',
  ሞተር: '🏍️', motor: '🏍️',
  ሱሪ: '👖', trousers: '👖',
  ሲኒ: '☕', 'coffee cup': '☕',
  ሳሙና: '🧼', soap: '🧼',
  ሴት: '👩', woman: '👩',
  ስንዴ: '🌾', wheat: '🌾',
  ሶፋ: '🛋️', sofa: '🛋️',
  ቡና: '☕', coffee: '☕',
  ቢላዋ: '🔪', knife: '🔪',
  ባቡር: '🚆', train: '🚆',
  ቤት: '🏠',
  ብርጭቆ: '🥛', glass: '🥛',
  ቦርሳ: '🎒', bag: '🎒',
  ቱቦ: '🚰', pipe: '🚰',
  ቲማቲም: '🍅', tomato: '🍅',
  ታክሲ: '🚕', taxi: '🚕',
  ቴሌቪዥን: '📺', television: '📺', tv: '📺',
  ትራስ: '🛏️', pillow: '🛏️',
  ቶሎ: '⚡', fast: '⚡',
  ኑግ: '🌱', 'niger seed': '🌱',
  ኒሻን: '🏅', medal: '🏅',
  ናና: '🌿', mint: '🌿',
  ኔትወርክ: '🌐', network: '🌐',
  ንብ: '🐝', bee: '🐝',
  ኖራ: '🖍️', chalk: '🖍️',
  ኩዋስ: '⚽',
  ኪስ: '👛', pocket: '👛',
  ካሮት: '🥕', carrot: '🥕',
  ኬክ: '🎂', cake: '🎂',
  ክር: '🧵', thread: '🧵',
  ኮፍያ: '🧢', cap: '🧢',
  ዉሻ: '🐶',
  ዊልቸር: '🧑‍🦽', wheelchair: '🧑‍🦽',
  ዋንጫ: '🏆', trophy: '🏆',
  ዌብሳይት: '💻', website: '💻',
  ውኃ: '💧',
  ዎይራ: '🫒', 'olive tree': '🫒',
  ዱባ: '🎃', pumpkin: '🎃',
  ዲቃላ: '🍈', melon: '🍈',
  ዳቦ: '🍞', bread: '🍞',
  ዴስክ: '🪑', desk: '🪑',
  ድመት: '🐱',
  ዶሮ: '🐔', chicken: '🐔',
  ጉንዳን: '🐜', ant: '🐜',
  ጊታር: '🎸', guitar: '🎸',
  ጋሪ: '🛒', cart: '🛒',
  ጌጥ: '💍', jewelry: '💍',
  ግመል: '🐪', camel: '🐪',
  ጎመን: '🥬', 'collard greens': '🥬',

  // 1st-order fidels
  ሀብሐብ: '🍉',
  watermelon: '🍉',
  ለውዝ: '🥜',
  peanut: '🥜',
  ሐር: '🧵',
  silk: '🧵',
  መኪና: '🚗',
  car: '🚗',
  ሠረገላ: '🛒',
  chariot: '🛒',
  ረቡዕ: '📅',
  wednesday: '📅',
  ሰዓት: '⏰',
  clock: '⏰',
  ሸሚዝ: '👕',
  shirt: '👕',
  ቀበሮ: '🦊',
  fox: '🦊',
  በግ: '🐑',
  sheep: '🐑',
  ተራራ: '⛰️',
  mountain: '⛰️',
  ቸኮሌት: '🍫',
  chocolate: '🍫',
  ኀይል: '⚡',
  ኃይል: '⚡',
  power: '⚡',
  ነብር: '🐆',
  leopard: '🐆',
  tiger: '🐆',
  ኘው: '🐱',
  kitten: '🐱',
  አውሮፕላን: '✈️',
  airplane: '✈️',
  ከበሮ: '🥁',
  drum: '🥁',
  ኸሚስ: '🗓️',
  thursday: '🗓️',
  ወተት: '🥛',
  milk: '🥛',
  'ዐይነ እርግብ': '🕊️',
  ዐይን: '👁️',
  eye: '👁️',
  ዘንዶ: '🐉',
  dragon: '🐉',
  ዠምናስቲክ: '🤸',
  gymnastics: '🤸',
  'የዶሮ ወጥ': '🍗',
  ደብተር: '📓',
  notebook: '📓',
  ጀልባ: '⛵',
  boat: '⛵',
  ገመድ: '🪢',
  rope: '🪢',
  ጠረጴዛ: '🪑',
  table: '🪑',
  ጨረቃ: '🌙',
  moon: '🌙',
  ጰንጤቆስጤ: '🕊️',
  dove: '🕊️',
  ጸሐይ: '☀️',
  ፀሐይ: '☀️',
  ፀጉር: '💇',
  hair: '💇',
  ፈረስ: '🐎',
  horse: '🐎',
  ፐስታ: '✉️',
  envelope: '✉️',
};

// Fallback letter-to-icon mapping for English alphabet
export const LETTER_DEFAULT_EMOJI: Record<string, string> = {
  A: '🍎',
  B: '⚽',
  C: '🐱',
  D: '🐶',
  E: '🐘',
  F: '🍕',
  G: '🍇',
  H: '🎩',
  I: '🍦',
  J: '🚙',
  K: '🔑',
  L: '🦁',
  M: '🏍️',
  N: '🪺',
  O: '🍊',
  P: '🦜',
  Q: '👑',
  R: '💍',
  S: '👟',
  T: '🍵',
  U: '☂️',
  V: '🎻',
  W: '⌚',
  X: '🎵',
  Y: '💛',
  Z: '🦓',
};

/**
 * Returns the best matching visual emoji icon for any learning item.
 */
export function getItemEmoji(item?: {
  pictureWord?: string | null;
  pictureWordEnglish?: string | null;
  pictureWordAmharic?: string | null;
  symbol?: string | null;
  displayName?: string | null;
  kind?: string | null;
} | null): string {
  if (!item) return '✨';

  // 1. Check pictureWord
  if (item.pictureWord) {
    const cleanWord = item.pictureWord.toLowerCase().trim().replace(/[^a-z0-9\s-]/gi, '');
    if (VOCABULARY_EMOJIS[cleanWord]) {
      return VOCABULARY_EMOJIS[cleanWord];
    }
    // Direct exact match
    if (VOCABULARY_EMOJIS[item.pictureWord.trim()]) {
      return VOCABULARY_EMOJIS[item.pictureWord.trim()];
    }
  }

  // 2. Check pictureWordEnglish
  if (item.pictureWordEnglish) {
    const cleanEnglish = item.pictureWordEnglish.toLowerCase().trim();
    if (VOCABULARY_EMOJIS[cleanEnglish]) {
      return VOCABULARY_EMOJIS[cleanEnglish];
    }
  }

  // 3. Check pictureWordAmharic
  if (item.pictureWordAmharic && VOCABULARY_EMOJIS[item.pictureWordAmharic.trim()]) {
    return VOCABULARY_EMOJIS[item.pictureWordAmharic.trim()];
  }

  // 4. Check symbol (uppercase letter fallback)
  if (item.symbol) {
    const upperSym = item.symbol.toUpperCase();
    if (LETTER_DEFAULT_EMOJI[upperSym]) {
      return LETTER_DEFAULT_EMOJI[upperSym];
    }
  }

  // 5. Theme / kind fallback
  if (item.kind === 'number') return '🔢';
  if (item.kind === 'fidel') return '🇪🇹';
  return '⭐';
}

/**
 * Returns the single unit emoji to repeat when rendering a quantity for numbers (e.g. 🍎 for "1 Apple", 🍊 for "2 Oranges").
 */
export function getNumberUnitEmoji(item?: {
  pictureWord?: string | null;
  symbol?: string | null;
} | null): string {
  if (!item?.pictureWord) return '🍎';
  const clean = item.pictureWord.toLowerCase().replace(/^[0-9]+\s*/, '').trim();
  if (VOCABULARY_EMOJIS[clean]) return VOCABULARY_EMOJIS[clean];
  if (clean.endsWith('es') && VOCABULARY_EMOJIS[clean.slice(0, -2)]) return VOCABULARY_EMOJIS[clean.slice(0, -2)];
  if (clean.endsWith('s') && VOCABULARY_EMOJIS[clean.slice(0, -1)]) return VOCABULARY_EMOJIS[clean.slice(0, -1)];
  return getItemEmoji(item);
}

