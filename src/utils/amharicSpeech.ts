'use client';

/**
 * Complete Authentic Amharic Phonetic and Speech System for Little Learner
 * Provides 100% Amharic pronunciations and phrases for all fidels (all 7 orders),
 * vocabulary words, game instructions, celebrations, and encouragement.
 */

// Full dictionary of common Amharic phrases and words used across games and UI
export const AMHARIC_PHRASE_PHONETICS: Record<string, string> = {
  // Game Prompts & Actions
  'ፊደልን ፈልግ': 'fee-del-en feh-leeg',
  'ፊደልን ጻፍ': 'fee-del-en tsahf',
  'ተዛማጆቹን አገናኝ': 'teh-zah-mah-joh-choon ah-geh-nahny',
  'ትክክለኛውን ፊደል ምረጥ': 'tee-kik-leh-nyah-wun fee-del mee-rett',
  'ግራውን ነክተህ ከቀኙ ጋር አዛምድ': 'grah-wun nek-teh keh-qeh-nyu gahr ah-zahm-ed',
  'ንካ እና አዳምጥ': 'neh-kah en-nah ah-dah-mett',
  'አዲስ ፊደል እንወቅ': 'ah-dees fee-del en-wehq',
  'ደረጃውን ጨርሰሃል': 'deh-reh-jah-wun cher-seh-hahl',
  'እንኳን ደስ አለህ': 'en-kwahn dess ah-leh',
  'ድንቅ ሥራ': 'dink see-rah',
  'በጣም ጎበዝ': 'beh-tahm goh-behz',
  'እንደገና ሞክር': 'en-deh-geh-nah moh-kir',
  'ይኸው ፊደሉ': 'yih-how fee-deh-loo',
  'ወደ ዋና ገጽ': 'weh-deh wah-nah getts',
  'የፊደል መንደር': 'yeh-fee-del men-derr',

  // Single word instructions
  'ፈልግ': 'feh-leeg',
  'ጻፍ': 'tsahf',
  'አገናኝ': 'ah-geh-nahny',
  'ምረጥ': 'mee-rett',
  'ጎበዝ': 'Goh-behz',
  'ትክክል': 'Tee-kik-kil',
  'ድንቅ': 'Dink',
  'አዳምጥ': 'Ah-dah-mett',
  'ቀጣይ': 'Qeh-ttye',
  'አጥፋ': 'Aht-fah',
  'ጨረስኩ': 'Cheh-ress-koo',
  'ተመለስ': 'Teh-meh-less',
  'ጀምር': 'Jem-mir',
  'ኮከቦች': 'koh-keh-bohch',
  'ምዕራፍ': 'Mih-rahf',
  'ደረጃ': 'Deh-reh-jah',
};

// 33 Fidel first-order picture vocabulary words
export const AMHARIC_WORD_PHONETICS: Record<string, string> = {
  'ሀብሐብ': 'Hab-hab',
  'ለውዝ': 'Leh-wuz',
  'ሐር': 'Hhar',
  'መኪና': 'Meh-kee-nah',
  'ሠረገላ': 'Seh-reh-geh-lah',
  'ረቡዕ': 'Reh-boo',
  'ሰዓት': 'Seh-aht',
  'ሸሚዝ': 'Sheh-meez',
  'ቀበሮ': 'Qeh-beh-roh',
  'በግ': 'Begg',
  'ተራራ': 'Teh-rah-rah',
  'ቸኮሌት': 'Cho-ko-late',
  'ኀብስት': 'Hib-st',
  'ነብር': 'Neh-beer',
  'ኘሆረ': 'Nye-hoh-reh',
  'አናናስ': 'Ah-nah-nahs',
  'ከበሮ': 'Keh-beh-roh',
  'ኸሚስ': 'Kheh-mees',
  'ወተት': 'Weh-tett',
  'ዐሳ': 'Ah-sah',
  'ዘንዶ': 'Zen-doh',
  'ዠራፍ': 'Zheh-rahf',
  'የኔ': 'Yeh-neh',
  'ደብተር': 'Deb-terr',
  'ጀልባ': 'Jell-bah',
  'ገመድ': 'Geh-medd',
  'ጠረጴዛ': 'Teh-reh-peh-zah',
  'ጨረቃ': 'Cheh-reh-qah',
  'ጰራቅሊጦስ': 'Peh-rah-qlee-tos',
  'ጸጉር': 'Tseh-goor',
  'ፀሐይ': 'Tseh-hye',
  'ፈረስ': 'Feh-ress',
  'ፖስታ': 'Poh-stah',

  // High-Frequency Families (Orders 2-7)
  'ሉል': 'Lool',
  'ሊጥ': 'Leet',
  'ላም': 'Lahm',
  'ሌሊት': 'Lay-leet',
  'ልብስ': 'Lib-ss',
  'ሎሚ': 'Loh-mee',
  'ሙዝ': 'Mooz',
  'ሚዛን': 'Mee-zahn',
  'ማር': 'Mahr',
  'ሜዳ': 'May-dah',
  'ምሳ': 'Mee-sah',
  'ሞተር': 'Moh-terr',
  'ሱሪ': 'Soo-ree',
  'ሲኒ': 'See-nee',
  'ሳሙና': 'Sah-moo-nah',
  'ሴት': 'Sayt',
  'ስንዴ': 'Sin-day',
  'ሶፋ': 'Soh-fah',
  'ቡና': 'Boon-nah',
  'ቢላዋ': 'Bee-lah-wah',
  'ባቡር': 'Bah-boor',
  'ቤት': 'Bayt',
  'ብርጭቆ': 'Bir-chiq-qoh',
  'ቦርሳ': 'Bohr-sah',
  'ቱቦ': 'Too-boh',
  'ቲማቲም': 'Tee-mah-teem',
  'ታክሲ': 'Tahk-see',
  'ቴሌቪዥን': 'Tay-lay-vee-zyon',
  'ትራስ': 'Tee-rahs',
  'ቶሎ': 'Toh-loh',
  'ኑግ': 'Noog',
  'ኒሻን': 'Nee-shahn',
  'ናና': 'Nah-nah',
  'ኔትወርክ': 'Nayt-werk',
  'ንብ': 'Neeb',
  'ኖራ': 'Noh-rah',
  'ኩዋስ': 'Koo-wahs',
  'ኪስ': 'Kees',
  'ካሮት': 'Kah-roht',
  'ኬክ': 'Kayk',
  'ክር': 'Kirr',
  'ኮፍያ': 'Kohf-yah',
  'ዉሻ': 'Woo-shah',
  'ዊልቸር': 'Weel-cherr',
  'ዋንጫ': 'Wahn-chah',
  'ዌብሳይት': 'Wayb-syte',
  'ውኃ': 'Wih-hah',
  'ዎይራ': 'Wohy-rah',
  'ዱባ': 'Doo-bah',
  'ዲቃላ': 'Dee-qah-lah',
  'ዳቦ': 'Dah-boh',
  'ዴስክ': 'Daysk',
  'ድመት': 'Deem-met',
  'ዶሮ': 'Doh-roh',
  'ጉንዳን': 'Goon-dahn',
  'ጊታር': 'Gee-tahr',
  'ጋሪ': 'Gah-ree',
  'ጌጥ': 'Geyt',
  'ግመል': 'Gee-mel',
  'ጎመን': 'Goh-men',
};

// Complete Ethiopic Syllabary Transliteration (All 7 Orders + Labiovelars)
export const AMHARIC_FIDEL_PHONETICS: Record<string, string> = {
  // ሀ family
  'ሀ': 'Hah', 'ሁ': 'Hoo', 'ሂ': 'Hee', 'ሃ': 'Hah', 'ሄ': 'Hay', 'ህ': 'Heh', 'ሆ': 'Hoh',
  // ለ family
  'ለ': 'Leh', 'ሉ': 'Loo', 'ሊ': 'Lee', 'ላ': 'Lah', 'ሌ': 'Lay', 'ል': 'Lill', 'ሎ': 'Loh',
  // ሐ family
  'ሐ': 'Hhah', 'ሑ': 'Hhoo', 'ሒ': 'Hhee', 'ሓ': 'Hhah', 'ሔ': 'Hhay', 'ሕ': 'Hhih', 'ሖ': 'Hhoh',
  // መ family
  'መ': 'Meh', 'ሙ': 'Moo', 'ሚ': 'Mee', 'ማ': 'Mah', 'ሜ': 'May', 'ም': 'Mmm', 'ሞ': 'Moh',
  // ሠ family
  'ሠ': 'Seh', 'ሡ': 'Soo', 'ሢ': 'See', 'ሣ': 'Sah', 'ሤ': 'Say', 'ሥ': 'Sss', 'ሦ': 'Soh',
  // ረ family
  'ረ': 'Reh', 'ሩ': 'Roo', 'ሪ': 'Ree', 'ራ': 'Rah', 'ሬ': 'Ray', 'ር': 'Err', 'ሮ': 'Roh',
  // ሰ family
  'ሰ': 'Seh', 'ሱ': 'Soo', 'ሲ': 'See', 'ሳ': 'Sah', 'ሴ': 'Say', 'ስ': 'Sss', 'ሶ': 'Soh',
  // ሸ family
  'ሸ': 'Sheh', 'ሹ': 'Shoo', 'ሺ': 'Shee', 'ሻ': 'Shah', 'ሼ': 'Shay', 'ሽ': 'Shh', 'ሾ': 'Shoh',
  // ቀ family
  'ቀ': 'Qeh', 'ቁ': 'Qoo', 'ቂ': 'Qee', 'ቃ': 'Qah', 'ቄ': 'Qay', 'ቅ': 'Qik', 'ቆ': 'Qoh',
  // በ family
  'በ': 'Beh', 'ቡ': 'Boo', 'ቢ': 'Bee', 'ባ': 'Bah', 'ቤ': 'Bay', 'ብ': 'Bih', 'ቦ': 'Boh',
  // ተ family
  'ተ': 'Teh', 'ቱ': 'Too', 'ቲ': 'Tee', 'ታ': 'Tah', 'ቴ': 'Tay', 'ት': 'Tit', 'ቶ': 'Toh',
  // ቸ family
  'ቸ': 'Cheh', 'ቹ': 'Choo', 'ቺ': 'Chee', 'ቻ': 'Chah', 'ቼ': 'Chay', 'ች': 'Chih', 'ቾ': 'Choh',
  // ኀ family
  'ኀ': 'Hah', 'ኁ': 'Hoo', 'ኂ': 'Hee', 'ኃ': 'Hah', 'ኄ': 'Hay', 'ኅ': 'Heh', 'ኆ': 'Hoh',
  // ነ family
  'ነ': 'Neh', 'ኑ': 'Noo', 'ኒ': 'Nee', 'ና': 'Nah', 'ኔ': 'Nay', 'ን': 'Enn', 'ኖ': 'Noh',
  // ኘ family
  'ኘ': 'Nyeh', 'ኙ': 'Nyoo', 'ኚ': 'Nyee', 'ኛ': 'Nyah', 'ኜ': 'Nyay', 'ኝ': 'Nyih', 'ኞ': 'Nyoh',
  // አ family
  'አ': 'Ah', 'ኡ': 'Oo', 'ኢ': 'Ee', 'ኣ': 'Ah', 'ኤ': 'Ay', 'እ': 'Eh', 'ኦ': 'Oh',
  // ከ family
  'ከ': 'Keh', 'ኩ': 'Koo', 'ኪ': 'Kee', 'ካ': 'Kah', 'ኬ': 'Kay', 'ክ': 'Kih', 'ኮ': 'Koh',
  // ኸ family
  'ኸ': 'Heh', 'ኹ': 'Hoo', 'ኺ': 'Hee', 'ኻ': 'Hah', 'ኼ': 'Hay', 'ኽ': 'Heh', 'ኾ': 'Hoh',
  // ወ family
  'ወ': 'Weh', 'ዉ': 'Woo', 'ዊ': 'Wee', 'ዋ': 'Wah', 'ዌ': 'Way', 'ው': 'Wih', 'ዎ': 'Woh',
  // ዐ family
  'ዐ': 'Ah', 'ዑ': 'Oo', 'ዒ': 'Ee', 'ዓ': 'Ah', 'ዔ': 'Ay', 'ዕ': 'Eh', 'ዖ': 'Oh',
  // ዘ family
  'ዘ': 'Zeh', 'ዙ': 'Zoo', 'ዚ': 'Zee', 'ዛ': 'Zah', 'ዜ': 'Zay', 'ዝ': 'Zih', 'ዞ': 'Zoh',
  // ዠ family
  'ዠ': 'Zheh', 'ዡ': 'Zhoo', 'ዢ': 'Zhee', 'ዣ': 'Zhah', 'ዤ': 'Zhay', 'ዥ': 'Zhih', 'ዦ': 'Zhoh',
  // የ family
  'የ': 'Yeh', 'ዩ': 'Yoo', 'ዪ': 'Yee', 'ያ': 'Yah', 'ዬ': 'Yay', 'ይ': 'Yih', 'ዮ': 'Yoh',
  // ደ family
  'ደ': 'Deh', 'ዱ': 'Doo', 'ዲ': 'Dee', 'ዳ': 'Dah', 'ዴ': 'Day', 'ድ': 'Dih', 'ዶ': 'Doh',
  // ጀ family
  'ጀ': 'Jeh', 'ጁ': 'Joo', 'ጂ': 'Jee', 'ጃ': 'Jah', 'ጄ': 'Jay', 'ጅ': 'Jih', 'ጆ': 'Joh',
  // ገ family
  'ገ': 'Geh', 'ጉ': 'Goo', 'ጊ': 'Gee', 'ጋ': 'Gah', 'ጌ': 'Gay', 'ግ': 'Gih', 'ጎ': 'Goh',
  // ጠ family
  'ጠ': 'Tteh', 'ጡ': 'Ttoo', 'ጢ': 'Ttee', 'ጣ': 'Ttah', 'ጤ': 'Ttay', 'ጥ': 'Ttih', 'ጦ': 'Ttoh',
  // ጨ family
  'ጨ': 'Cheh', 'ጩ': 'Choo', 'ጪ': 'Chee', 'ጫ': 'Chah', 'ጬ': 'Chay', 'ጭ': 'Chih', 'ጮ': 'Choh',
  // ጰ family
  'ጰ': 'Ppeh', 'ጱ': 'Ppoo', 'ጲ': 'Ppee', 'ጳ': 'Ppah', 'ጴ': 'Ppay', 'ጵ': 'Ppih', 'ጶ': 'Ppoh',
  // ጸ family
  'ጸ': 'Tseh', 'ጹ': 'Tsoo', 'ጺ': 'Tsee', 'ጻ': 'Tsah', 'ጼ': 'Tsay', 'ጽ': 'Tsih', 'ጾ': 'Tsoh',
  // ፀ family
  'ፀ': 'Tseh', 'ፁ': 'Tsoo', 'ፂ': 'Tsee', 'ፃ': 'Tsah', 'ፄ': 'Tsay', 'ፅ': 'Tsih', 'ፆ': 'Tsoh',
  // ፈ family
  'ፈ': 'Feh', 'ፉ': 'Foo', 'ፊ': 'Fee', 'ፋ': 'Fah', 'ፌ': 'Fay', 'ፍ': 'Fih', 'ፎ': 'Foh',
  // ፐ family
  'ፐ': 'Peh', 'ፑ': 'Poo', 'ፒ': 'Pee', 'ፓ': 'Pah', 'ፔ': 'Pay', 'ፕ': 'Pih', 'ፖ': 'Poh',

  // Labiovelars
  'ቋ': 'Qwah', 'ጓ': 'Gwah', 'ኳ': 'Kwah', 'ኋ': 'Hwah', 'ጧ': 'Ttwah',
  'ጯ': 'Chwah', 'ጿ': 'Tswah', 'ዷ': 'Dwah', 'ዟ': 'Zwah', 'ሯ': 'Rwah',
  'ሷ': 'Swah', 'ሿ': 'Shwah', 'ቧ': 'Bwah', 'ቷ': 'Twah', 'ቿ': 'Chwah',
  'ኗ': 'Nwah', 'ኟ': 'Nywah', 'ፏ': 'Fwah', 'ፗ': 'Pwah',

  // Numbers
  '፩': 'And', '፪': 'Hulet', '፫': 'Sost', '፬': 'Arat', '፭': 'Amist',
  '፮': 'Sidist', '፯': 'Sebat', '፰': 'Semint', '፱': 'Zetegn', '፲': 'Asir',
};

/**
 * Check if the text contains any Ethiopic / Amharic characters
 */
export function isEthiopicText(text: string): boolean {
  return /[\u1200-\u137F]/.test(text);
}

/**
 * Transliterates Amharic sentences, phrases, words, or individual fidels into
 * high-accuracy phonetics so standard TTS synthesizers pronounce authentic Amharic phonemes.
 */
export function getAmharicPhonetic(rawText: string): string {
  if (!rawText) return '';

  // Clean out any English parenthetical translation e.g. "ሀብሐብ (Watermelon)" -> "ሀብሐብ"
  let processed = rawText.replace(/\([^)]*\)/g, '').trim();

  // 1. Direct whole-phrase match
  if (AMHARIC_PHRASE_PHONETICS[processed]) {
    return AMHARIC_PHRASE_PHONETICS[processed];
  }

  // 2. Direct whole-word match
  if (AMHARIC_WORD_PHONETICS[processed]) {
    return AMHARIC_WORD_PHONETICS[processed];
  }

  // 3. Direct single fidel match
  if (AMHARIC_FIDEL_PHONETICS[processed]) {
    return AMHARIC_FIDEL_PHONETICS[processed];
  }

  // 4. Multi-word phrase substitutions (longest first)
  const phrases = Object.entries(AMHARIC_PHRASE_PHONETICS).sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, phonetic] of phrases) {
    if (processed.includes(phrase)) {
      processed = processed.replaceAll(phrase, ` ${phonetic} `);
    }
  }

  // 5. Vocabulary word substitutions
  for (const [word, phonetic] of Object.entries(AMHARIC_WORD_PHONETICS)) {
    if (processed.includes(word)) {
      processed = processed.replaceAll(word, ` ${phonetic} `);
    }
  }

  // 6. Character-by-character fidel mapping for any remaining Ethiopic letters
  let result = '';
  for (const char of processed) {
    if (AMHARIC_FIDEL_PHONETICS[char]) {
      result += (result && !result.endsWith(' ') ? ' ' : '') + AMHARIC_FIDEL_PHONETICS[char];
    } else {
      result += char;
    }
  }

  // Clean up extra spaces
  return result.replace(/\s+/g, ' ').trim() || rawText;
}

/**
 * Get natural spoken speech for an Amharic learning item
 * Returns fidel sound + Amharic word (e.g. "Ha — Hab-hab", pure Amharic)
 */
export function getAmharicItemSpeech(symbol: string, amharicWord?: string): { nativeText: string; phoneticText: string } {
  const fidelSound = AMHARIC_FIDEL_PHONETICS[symbol] || symbol;
  const word = amharicWord?.replace(/\([^)]*\)/g, '').trim() || '';
  const wordPhonetic = word ? getAmharicPhonetic(word) : '';

  if (word) {
    return {
      nativeText: `${symbol}. ${word}`,
      phoneticText: `${fidelSound}! ... ${wordPhonetic}!`,
    };
  }

  return {
    nativeText: symbol,
    phoneticText: `${fidelSound}!`,
  };
}

/**
 * Get Amharic audio prompt for games
 */
export function getAmharicPrompt(type: 'find' | 'trace' | 'match' | 'listen' | 'correct' | 'try_again' | 'celebrate', symbol?: string): { nativeText: string; phoneticText: string } {
  const fidelSound = symbol ? (AMHARIC_FIDEL_PHONETICS[symbol] || symbol) : '';

  switch (type) {
    case 'find':
      return {
        nativeText: symbol ? `${symbol} ፊደልን ፈልግ!` : 'ፊደልን ፈልግ!',
        phoneticText: symbol ? `${fidelSound}! fee-del-en feh-leeg!` : 'fee-del-en feh-leeg!',
      };
    case 'trace':
      return {
        nativeText: symbol ? `${symbol} ፊደልን ጻፍ!` : 'ፊደልን ጻፍ!',
        phoneticText: symbol ? `${fidelSound}! fee-del-en tsahf!` : 'fee-del-en tsahf!',
      };
    case 'match':
      return {
        nativeText: 'ተዛማጆቹን አገናኝ!',
        phoneticText: 'teh-zah-mah-joh-choon ah-geh-nahny!',
      };
    case 'listen':
      return {
        nativeText: 'አዳምጥ!',
        phoneticText: 'Ah-dah-mett! Listen carefully!',
      };
    case 'correct':
      return {
        nativeText: 'ጎበዝ! ድንቅ ነው!',
        phoneticText: 'Goh-behz! Dink new!',
      };
    case 'try_again':
      return {
        nativeText: 'እንደገና ሞክር!',
        phoneticText: 'En-deh-geh-nah moh-kir!',
      };
    case 'celebrate':
      return {
        nativeText: 'እንኳን ደስ አለህ! ድንቅ ሥራ!',
        phoneticText: 'En-kwahn dess ah-leh! Dink see-rah! Goh-behz!',
      };
    default:
      return {
        nativeText: symbol || '',
        phoneticText: fidelSound || '',
      };
  }
}
