'use client';

/**
 * Parent Audio Voice Studio Storage
 * IndexedDB storage for human-recorded voice clips.
 * Provides instant in-memory Blob URL resolution so children hear their
 * family's voice with 0ms network latency, while allowing parents to toggle
 * freely between their recorded voice and the default computer voice.
 */

export interface VoiceRecording {
  audioPath: string; // Primary key, e.g. "/audio/en/upper_A.mp3"
  blob: Blob;
  mimeType: string;
  durationSec: number;
  recordedAt: number;
  label: string;
}

const DB_NAME = 'little_learner_voice_studio';
const DB_VERSION = 1;
const STORE_NAME = 'voice_recordings';

const DISABLED_VOICES_STORAGE_KEY = 'little_learner_disabled_voices';
const GLOBAL_VOICE_PREF_KEY = 'little_learner_voice_pref';

// In-memory cache for synchronous, zero-latency resolution
const blobUrlCache = new Map<string, string>();
const recordedKeys = new Set<string>();
const disabledVoiceKeys = new Set<string>();
const textToPathMap = new Map<string, string>();
let globalVoicePref: 'parent' | 'computer' = 'parent';
let isInitialized = false;

/**
 * Normalizes text, symbols, or display names for fuzzy cross-check lookup
 */
export function normalizeTextKey(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'!’]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// Built-in cross-check registry mapping standard symbols, display names, vocabulary words, and prompts to audioPaths
const BUILTIN_CROSS_CHECK_MAP: Record<string, string> = {
  // English Capital Letters (A-Z)
  'a': '/audio/en/upper_A.mp3',
  'capital a': '/audio/en/upper_A.mp3',
  'letter a': '/audio/en/upper_A.mp3',
  'b': '/audio/en/upper_B.mp3',
  'capital b': '/audio/en/upper_B.mp3',
  'letter b': '/audio/en/upper_B.mp3',
  'c': '/audio/en/upper_C.mp3',
  'capital c': '/audio/en/upper_C.mp3',
  'letter c': '/audio/en/upper_C.mp3',
  'd': '/audio/en/upper_D.mp3',
  'capital d': '/audio/en/upper_D.mp3',
  'letter d': '/audio/en/upper_D.mp3',
  'e': '/audio/en/upper_E.mp3',
  'capital e': '/audio/en/upper_E.mp3',
  'letter e': '/audio/en/upper_E.mp3',
  'f': '/audio/en/upper_F.mp3',
  'capital f': '/audio/en/upper_F.mp3',
  'letter f': '/audio/en/upper_F.mp3',
  'g': '/audio/en/upper_G.mp3',
  'capital g': '/audio/en/upper_G.mp3',
  'letter g': '/audio/en/upper_G.mp3',
  'h': '/audio/en/upper_H.mp3',
  'capital h': '/audio/en/upper_H.mp3',
  'letter h': '/audio/en/upper_H.mp3',
  'i': '/audio/en/upper_I.mp3',
  'capital i': '/audio/en/upper_I.mp3',
  'letter i': '/audio/en/upper_I.mp3',
  'j': '/audio/en/upper_J.mp3',
  'capital j': '/audio/en/upper_J.mp3',
  'letter j': '/audio/en/upper_J.mp3',
  'k': '/audio/en/upper_K.mp3',
  'capital k': '/audio/en/upper_K.mp3',
  'letter k': '/audio/en/upper_K.mp3',
  'l': '/audio/en/upper_L.mp3',
  'capital l': '/audio/en/upper_L.mp3',
  'letter l': '/audio/en/upper_L.mp3',
  'm': '/audio/en/upper_M.mp3',
  'capital m': '/audio/en/upper_M.mp3',
  'letter m': '/audio/en/upper_M.mp3',
  'n': '/audio/en/upper_N.mp3',
  'capital n': '/audio/en/upper_N.mp3',
  'letter n': '/audio/en/upper_N.mp3',
  'o': '/audio/en/upper_O.mp3',
  'capital o': '/audio/en/upper_O.mp3',
  'letter o': '/audio/en/upper_O.mp3',
  'p': '/audio/en/upper_P.mp3',
  'capital p': '/audio/en/upper_P.mp3',
  'letter p': '/audio/en/upper_P.mp3',
  'q': '/audio/en/upper_Q.mp3',
  'capital q': '/audio/en/upper_Q.mp3',
  'letter q': '/audio/en/upper_Q.mp3',
  'r': '/audio/en/upper_R.mp3',
  'capital r': '/audio/en/upper_R.mp3',
  'letter r': '/audio/en/upper_R.mp3',
  's': '/audio/en/upper_S.mp3',
  'capital s': '/audio/en/upper_S.mp3',
  'letter s': '/audio/en/upper_S.mp3',
  't': '/audio/en/upper_T.mp3',
  'capital t': '/audio/en/upper_T.mp3',
  'letter t': '/audio/en/upper_T.mp3',
  'u': '/audio/en/upper_U.mp3',
  'capital u': '/audio/en/upper_U.mp3',
  'letter u': '/audio/en/upper_U.mp3',
  'v': '/audio/en/upper_V.mp3',
  'capital v': '/audio/en/upper_V.mp3',
  'letter v': '/audio/en/upper_V.mp3',
  'w': '/audio/en/upper_W.mp3',
  'capital w': '/audio/en/upper_W.mp3',
  'letter w': '/audio/en/upper_W.mp3',
  'x': '/audio/en/upper_X.mp3',
  'capital x': '/audio/en/upper_X.mp3',
  'letter x': '/audio/en/upper_X.mp3',
  'y': '/audio/en/upper_Y.mp3',
  'capital y': '/audio/en/upper_Y.mp3',
  'letter y': '/audio/en/upper_Y.mp3',
  'z': '/audio/en/upper_Z.mp3',
  'capital z': '/audio/en/upper_Z.mp3',
  'letter z': '/audio/en/upper_Z.mp3',

  // English Small Letters
  'small a': '/audio/en/lower_a.mp3',
  'small b': '/audio/en/lower_b.mp3',
  'small c': '/audio/en/lower_c.mp3',
  'small d': '/audio/en/lower_d.mp3',
  'small e': '/audio/en/lower_e.mp3',
  'small f': '/audio/en/lower_f.mp3',
  'small g': '/audio/en/lower_g.mp3',
  'small h': '/audio/en/lower_h.mp3',
  'small i': '/audio/en/lower_i.mp3',
  'small j': '/audio/en/lower_j.mp3',
  'small k': '/audio/en/lower_k.mp3',
  'small l': '/audio/en/lower_l.mp3',
  'small m': '/audio/en/lower_m.mp3',
  'small n': '/audio/en/lower_n.mp3',
  'small o': '/audio/en/lower_o.mp3',
  'small p': '/audio/en/lower_p.mp3',
  'small q': '/audio/en/lower_q.mp3',
  'small r': '/audio/en/lower_r.mp3',
  'small s': '/audio/en/lower_s.mp3',
  'small t': '/audio/en/lower_t.mp3',
  'small u': '/audio/en/lower_u.mp3',
  'small v': '/audio/en/lower_v.mp3',
  'small w': '/audio/en/lower_w.mp3',
  'small x': '/audio/en/lower_x.mp3',
  'small y': '/audio/en/lower_y.mp3',
  'small z': '/audio/en/lower_z.mp3',

  // English Vocabulary Words
  'apple': '/audio/en/word_apple.mp3',
  'ball': '/audio/en/word_ball.mp3',
  'cat': '/audio/en/word_cat.mp3',
  'dog': '/audio/en/word_dog.mp3',
  'egg': '/audio/en/word_egg.mp3',
  'fish': '/audio/en/word_fish.mp3',
  'goat': '/audio/en/word_goat.mp3',
  'house': '/audio/en/word_house.mp3',
  'injera': '/audio/en/word_injera.mp3',
  'jebena': '/audio/en/word_jebena.mp3',
  'kite': '/audio/en/word_kite.mp3',
  'lion': '/audio/en/word_lion.mp3',
  'mango': '/audio/en/word_mango.mp3',
  'nest': '/audio/en/word_nest.mp3',
  'orange': '/audio/en/word_orange.mp3',
  'pencil': '/audio/en/word_pencil.mp3',
  'queen': '/audio/en/word_queen.mp3',
  'rabbit': '/audio/en/word_rabbit.mp3',
  'sun': '/audio/en/word_sun.mp3',
  'tree': '/audio/en/word_tree.mp3',
  'umbrella': '/audio/en/word_umbrella.mp3',
  'van': '/audio/en/word_van.mp3',
  'water': '/audio/en/word_water.mp3',
  'xray': '/audio/en/word_xray.mp3',
  'x-ray': '/audio/en/word_xray.mp3',
  'yellow': '/audio/en/word_yellow.mp3',
  'zebra': '/audio/en/word_zebra.mp3',

  // Numbers 0-20
  '0': '/audio/num/0.mp3',
  'zero': '/audio/num/0.mp3',
  '1': '/audio/num/1.mp3',
  'one': '/audio/num/1.mp3',
  '2': '/audio/num/2.mp3',
  'two': '/audio/num/2.mp3',
  '3': '/audio/num/3.mp3',
  'three': '/audio/num/3.mp3',
  '4': '/audio/num/4.mp3',
  'four': '/audio/num/4.mp3',
  '5': '/audio/num/5.mp3',
  'five': '/audio/num/5.mp3',
  '6': '/audio/num/6.mp3',
  'six': '/audio/num/6.mp3',
  '7': '/audio/num/7.mp3',
  'seven': '/audio/num/7.mp3',
  '8': '/audio/num/8.mp3',
  'eight': '/audio/num/8.mp3',
  '9': '/audio/num/9.mp3',
  'nine': '/audio/num/9.mp3',
  '10': '/audio/num/10.mp3',
  'ten': '/audio/num/10.mp3',
  '11': '/audio/num/11.mp3',
  'eleven': '/audio/num/11.mp3',
  '12': '/audio/num/12.mp3',
  'twelve': '/audio/num/12.mp3',
  '13': '/audio/num/13.mp3',
  'thirteen': '/audio/num/13.mp3',
  '14': '/audio/num/14.mp3',
  'fourteen': '/audio/num/14.mp3',
  '15': '/audio/num/15.mp3',
  'fifteen': '/audio/num/15.mp3',
  '16': '/audio/num/16.mp3',
  'sixteen': '/audio/num/16.mp3',
  '17': '/audio/num/17.mp3',
  'seventeen': '/audio/num/17.mp3',
  '18': '/audio/num/18.mp3',
  'eighteen': '/audio/num/18.mp3',
  '19': '/audio/num/19.mp3',
  'nineteen': '/audio/num/19.mp3',
  '20': '/audio/num/20.mp3',
  'twenty': '/audio/num/20.mp3',

  // Number vocabulary words
  'mangoes': '/audio/num/word_mangoes.mp3',
  'cows': '/audio/num/word_cows.mp3',
  'eggs': '/audio/num/word_eggs.mp3',
  'balls': '/audio/num/word_balls.mp3',
  'trees': '/audio/num/word_trees.mp3',
  'stars': '/audio/num/word_stars.mp3',
  'birds': '/audio/num/word_birds.mp3',
  'houses': '/audio/num/word_houses.mp3',
  'carrots': '/audio/num/word_carrots.mp3',
  'lions': '/audio/num/word_lions.mp3',

  // 33 Base Fidels
  'ሀ': '/audio/am/ha_1.mp3',
  'ለ': '/audio/am/le_1.mp3',
  'ሐ': '/audio/am/hha_1.mp3',
  'መ': '/audio/am/me_1.mp3',
  'ሠ': '/audio/am/sze_1.mp3',
  'ረ': '/audio/am/re_1.mp3',
  'ሰ': '/audio/am/se_1.mp3',
  'ሸ': '/audio/am/she_1.mp3',
  'ቀ': '/audio/am/qe_1.mp3',
  'በ': '/audio/am/be_1.mp3',
  'ተ': '/audio/am/te_1.mp3',
  'ቸ': '/audio/am/ce_1.mp3',
  'ኀ': '/audio/am/hxe_1.mp3',
  'ነ': '/audio/am/ne_1.mp3',
  'ኘ': '/audio/am/nye_1.mp3',
  'አ': '/audio/am/a_1.mp3',
  'ከ': '/audio/am/ke_1.mp3',
  'ኸ': '/audio/am/khe_1.mp3',
  'ወ': '/audio/am/we_1.mp3',
  'ዐ': '/audio/am/aa_1.mp3',
  'ዘ': '/audio/am/ze_1.mp3',
  'ዠ': '/audio/am/zhe_1.mp3',
  'የ': '/audio/am/ye_1.mp3',
  'ደ': '/audio/am/de_1.mp3',
  'ጀ': '/audio/am/je_1.mp3',
  'ገ': '/audio/am/ge_1.mp3',
  'ጠ': '/audio/am/tte_1.mp3',
  'ጨ': '/audio/am/cce_1.mp3',
  'ጰ': '/audio/am/ppe_1.mp3',
  'ጸ': '/audio/am/tse_1.mp3',
  'ፀ': '/audio/am/tsze_1.mp3',
  'ፈ': '/audio/am/fe_1.mp3',
  'ፐ': '/audio/am/pe_1.mp3',

  // Amharic Vocabulary Words
  'ሀብሐብ': '/audio/am/word_habhab.mp3',
  'ለውዝ': '/audio/am/word_lewuz.mp3',
  'ሐር': '/audio/am/word_hhar.mp3',
  'መኪና': '/audio/am/word_mekina.mp3',
  'ሠረገላ': '/audio/am/word_seregela.mp3',
  'ረቡዕ': '/audio/am/word_rebu.mp3',
  'ሰዓት': '/audio/am/word_seat.mp3',
  'ሸሚዝ': '/audio/am/word_shemiz.mp3',
  'ቀበሮ': '/audio/am/word_qebero.mp3',
  'በግ': '/audio/am/word_beg.mp3',
  'ተራራ': '/audio/am/word_terara.mp3',
  'ቸኮሌት': '/audio/am/word_chocolate.mp3',
  'ኀይል': '/audio/am/word_hayl.mp3',
  'ኃይል': '/audio/am/word_hayl.mp3',
  'ነብር': '/audio/am/word_nebr.mp3',
  'ኘው': '/audio/am/word_nyaw.mp3',
  'አናናስ': '/audio/am/word_ananas.mp3',
  'ከበሮ': '/audio/am/word_kebero.mp3',
  'ኸሚስ': '/audio/am/word_khemis.mp3',
  'ወተት': '/audio/am/word_wetet.mp3',
  'ዐይብ': '/audio/am/word_ayb.mp3',
  'አይብ': '/audio/am/word_ayb.mp3',
  'ዘንዶ': '/audio/am/word_zendo.mp3',
  'ዠራፍ': '/audio/am/word_zheraf.mp3',
  'የመንደር': '/audio/am/word_yemender.mp3',
  'ደብተር': '/audio/am/word_debter.mp3',
  'ጀልባ': '/audio/am/word_jelba.mp3',
  'ገመድ': '/audio/am/word_gemed.mp3',
  'ጠረጴዛ': '/audio/am/word_terepheza.mp3',
  'ጨረቃ': '/audio/am/word_chereqa.mp3',
  'ጰራቅሊጦስ': '/audio/am/word_pparaqlitos.mp3',
  'ጸጉር': '/audio/am/word_tsegur.mp3',
  'ፀሐይ': '/audio/am/word_tsehay.mp3',
  'ፈረስ': '/audio/am/word_feres.mp3',
  'ፖስታ': '/audio/am/word_posta.mp3',

  // Teaching / System Prompts
  'tap the': '/audio/prompts/tap_the.mp3',
  'find the': '/audio/prompts/find_the.mp3',
  'great job': '/audio/prompts/great_job.mp3',
  'try again': '/audio/prompts/try_again.mp3',
  'almost there': '/audio/prompts/try_again.mp3',
  'you did it': '/audio/prompts/you_did_it.mp3',
  'lets match': '/audio/prompts/lets_match.mp3',
  'match the pairs': '/audio/prompts/lets_match.mp3',
  'listen carefully': '/audio/prompts/listen_carefully.mp3',
  'great job today': '/audio/prompts/goodbye_tomorrow.mp3',
  'see you tomorrow': '/audio/prompts/goodbye_tomorrow.mp3',
  'time for a break': '/audio/prompts/see_you_soon.mp3',
  'see you soon': '/audio/prompts/see_you_soon.mp3',
};

// Populate the 10 Fidel families (all 7 vowel orders)
const FIDEL_FAMILIES: Record<string, string[]> = {
  'le': ['ለ', 'ሉ', 'ሊ', 'ላ', 'ሌ', 'ል', 'ሎ'],
  'me': ['መ', 'ሙ', 'ሚ', 'ማ', 'ሜ', 'ም', 'ሞ'],
  'se': ['ሰ', 'ሱ', 'ሲ', 'ሳ', 'ሴ', 'ስ', 'ሶ'],
  'be': ['በ', 'ቡ', 'ቢ', 'ባ', 'ቤ', 'ብ', 'ቦ'],
  'te': ['ተ', 'ቱ', 'ቲ', 'ታ', 'ቴ', 'ት', 'ቶ'],
  'ne': ['ነ', 'ኑ', 'ኒ', 'ና', 'ኔ', 'ን', 'ኖ'],
  'ke': ['ከ', 'ኩ', 'ኪ', 'ካ', 'ኬ', 'ክ', 'ኮ'],
  'we': ['ወ', 'ዉ', 'ዊ', 'ዋ', 'ዌ', 'ው', 'ዎ'],
  'de': ['ደ', 'ዱ', 'ዲ', 'ዳ', 'ዴ', 'ድ', 'ዶ'],
  'ge': ['ገ', 'ጉ', 'ጊ', 'ጋ', 'ጌ', 'ግ', 'ጎ'],
};

for (const [prefix, orders] of Object.entries(FIDEL_FAMILIES)) {
  orders.forEach((sym, idx) => {
    BUILTIN_CROSS_CHECK_MAP[sym] = `/audio/am/${prefix}_${idx + 1}.mp3`;
  });
}

function loadPreferences(): void {
  if (typeof window === 'undefined') return;
  try {
    const rawPref = localStorage.getItem(GLOBAL_VOICE_PREF_KEY);
    if (rawPref === 'computer' || rawPref === 'parent') {
      globalVoicePref = rawPref;
    }
    const rawDisabled = localStorage.getItem(DISABLED_VOICES_STORAGE_KEY);
    if (rawDisabled) {
      const arr = JSON.parse(rawDisabled);
      if (Array.isArray(arr)) {
        disabledVoiceKeys.clear();
        arr.forEach((k: string) => disabledVoiceKeys.add(k));
      }
    }
  } catch {}
}

function saveDisabledPreferences(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      DISABLED_VOICES_STORAGE_KEY,
      JSON.stringify(Array.from(disabledVoiceKeys))
    );
  } catch {}
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'audioPath' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Initializes the voice storage, warms up Blob URLs in memory,
 * populates the cross-check dictionary, and loads parent voice preferences.
 */
export async function initVoiceStudioStorage(): Promise<void> {
  if (typeof window === 'undefined') return;
  loadPreferences();

  // Populate built-in cross-check map
  for (const [key, path] of Object.entries(BUILTIN_CROSS_CHECK_MAP)) {
    textToPathMap.set(normalizeTextKey(key), path);
  }

  if (isInitialized) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getAllReq = store.getAll();

    await new Promise<void>((resolve, reject) => {
      getAllReq.onsuccess = () => {
        const records: VoiceRecording[] = getAllReq.result || [];
        records.forEach((record) => {
          if (record.blob && record.audioPath) {
            try {
              const url = URL.createObjectURL(record.blob);
              blobUrlCache.set(record.audioPath, url);
              recordedKeys.add(record.audioPath);
              if (record.label) {
                textToPathMap.set(normalizeTextKey(record.label), record.audioPath);
              }
            } catch (err) {
              console.warn('Failed to create Blob URL for', record.audioPath, err);
            }
          }
        });
        isInitialized = true;
        resolve();
      };
      getAllReq.onerror = () => reject(getAllReq.error);
    });
  } catch (err) {
    console.warn('Voice studio storage init error:', err);
  }
}

/**
 * Global Preference: Should the app prefer parent voice or computer voice?
 */
export function getGlobalVoicePreference(): 'parent' | 'computer' {
  loadPreferences();
  return globalVoicePref;
}

export function setGlobalVoicePreference(pref: 'parent' | 'computer'): void {
  globalVoicePref = pref;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(GLOBAL_VOICE_PREF_KEY, pref);
    } catch {}
    window.dispatchEvent(
      new CustomEvent('voice_recordings_changed', {
        detail: { action: 'pref_changed', pref },
      })
    );
  }
}

/**
 * Checks which voice source is chosen for a specific item ('parent' vs 'computer').
 */
export function getItemVoiceChoice(audioPath: string): 'parent' | 'computer' {
  loadPreferences();
  if (!recordedKeys.has(audioPath)) return 'computer';
  return disabledVoiceKeys.has(audioPath) ? 'computer' : 'parent';
}

/**
 * Sets which voice source to use for a specific item ('parent' or 'computer').
 */
export function setItemVoiceChoice(audioPath: string, choice: 'parent' | 'computer'): void {
  loadPreferences();
  if (choice === 'computer') {
    disabledVoiceKeys.add(audioPath);
  } else {
    disabledVoiceKeys.delete(audioPath);
  }
  saveDisabledPreferences();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('voice_recordings_changed', {
        detail: { audioPath, action: 'choice_changed', choice },
      })
    );
  }
}

/**
 * Checks if a custom parent voice is both recorded AND actively enabled for playback.
 */
export function isCustomVoiceActive(audioPath?: string): boolean {
  if (!audioPath) return false;
  loadPreferences();
  if (globalVoicePref === 'computer') return false;
  return recordedKeys.has(audioPath) && !disabledVoiceKeys.has(audioPath);
}

/**
 * Synchronously resolves an audio path to a custom parent recording Blob URL if active.
 * If disabled or no recording exists, returns the original audio path (computer voice).
 */
export function resolveAudioPath(audioPath?: string): string | undefined {
  if (!audioPath) return undefined;
  if (!isCustomVoiceActive(audioPath)) return audioPath;
  const customUrl = blobUrlCache.get(audioPath);
  return customUrl || audioPath;
}

/**
 * Cross-checks whether a parent voiceover recording exists and is active for:
 * 1. The direct audioPath (e.g. "/audio/en/upper_A.mp3")
 * 2. The text / symbol / word (e.g. "A", "apple", "ሀ", "በግ", "Find the A!", "Great job!")
 * Returns the parent Blob URL if found and active, or undefined if no parent voice exists.
 */
export function findCustomVoiceForTextOrItem(
  audioPath?: string,
  textOrSymbol?: string
): string | undefined {
  loadPreferences();

  // 1. Direct audioPath check
  if (audioPath && isCustomVoiceActive(audioPath)) {
    const url = blobUrlCache.get(audioPath);
    if (url) return url;
  }

  // 2. Text / Symbol / Word cross-check
  if (textOrSymbol && textOrSymbol.trim().length > 0) {
    const raw = textOrSymbol.trim();
    const normalized = normalizeTextKey(raw);

    // Exact match in dynamic or built-in registry
    const mappedPath = textToPathMap.get(normalized);
    if (mappedPath && isCustomVoiceActive(mappedPath)) {
      const url = blobUrlCache.get(mappedPath);
      if (url) return url;
    }

    // Try individual sentences or phrase parts (e.g. "Capital A. Apple" -> "Capital A" or "Apple" or "A")
    const parts = raw.split(/[.,\n]/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      const partNorm = normalizeTextKey(part);
      const partPath = textToPathMap.get(partNorm);
      if (partPath && isCustomVoiceActive(partPath)) {
        const url = blobUrlCache.get(partPath);
        if (url) return url;
      }
    }

    // Single character lookup (e.g. fidel "ሀ" or letter "A" or number "5")
    for (const char of raw) {
      const charNorm = normalizeTextKey(char);
      if (charNorm) {
        const charPath = textToPathMap.get(charNorm);
        if (charPath && isCustomVoiceActive(charPath)) {
          const url = blobUrlCache.get(charPath);
          if (url) return url;
        }
      }
    }
  }

  return undefined;
}

/**
 * Returns the parent's recorded Blob URL if present, regardless of whether it's
 * currently toggled to computer voice. Useful for previewing in Voice Studio.
 */
export function getCustomVoiceBlobUrl(audioPath?: string): string | undefined {
  if (!audioPath) return undefined;
  return blobUrlCache.get(audioPath);
}

/**
 * Checks whether an audioPath has a custom parent voice recording saved in IndexedDB.
 */
export function hasCustomVoice(audioPath?: string): boolean {
  if (!audioPath) return false;
  return recordedKeys.has(audioPath);
}

/**
 * Returns the current total count of custom voice recordings.
 */
export function getCustomVoiceCount(): number {
  return recordedKeys.size;
}

/**
 * Returns a cloned Set of all audio paths that have custom recordings.
 */
export function getAllCustomVoiceKeys(): Set<string> {
  return new Set(recordedKeys);
}

/**
 * Saves a new voice recording to IndexedDB and activates it.
 */
export async function saveVoiceRecording(
  audioPath: string,
  blob: Blob,
  durationSec: number,
  label: string,
  activeChoice: 'parent' | 'computer' = 'parent'
): Promise<void> {
  if (!audioPath || !blob) return;

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const record: VoiceRecording = {
    audioPath,
    blob,
    mimeType: blob.type || 'audio/webm',
    durationSec: Math.round(durationSec * 10) / 10,
    recordedAt: Date.now(),
    label,
  };

  await new Promise<void>((resolve, reject) => {
    const putReq = store.put(record);
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });

  // Revoke previous blob URL if any
  const previousUrl = blobUrlCache.get(audioPath);
  if (previousUrl) {
    try {
      URL.revokeObjectURL(previousUrl);
    } catch {}
  }

  // Create and cache new object URL
  try {
    const newUrl = URL.createObjectURL(blob);
    blobUrlCache.set(audioPath, newUrl);
    recordedKeys.add(audioPath);
    if (label) {
      textToPathMap.set(normalizeTextKey(label), audioPath);
    }
  } catch (err) {
    console.warn('Failed to update URL cache for', audioPath, err);
  }

  // Update choice preference for this item
  setItemVoiceChoice(audioPath, activeChoice);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('voice_recordings_changed', {
        detail: { audioPath, action: 'save' },
      })
    );
  }
}

/**
 * Deletes a voice recording from IndexedDB and revokes its Blob URL.
 */
export async function deleteVoiceRecording(audioPath: string): Promise<void> {
  if (!audioPath) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const delReq = store.delete(audioPath);
      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    });

    const previousUrl = blobUrlCache.get(audioPath);
    if (previousUrl) {
      try {
        URL.revokeObjectURL(previousUrl);
      } catch {}
      blobUrlCache.delete(audioPath);
    }
    recordedKeys.delete(audioPath);
    disabledVoiceKeys.delete(audioPath);
    saveDisabledPreferences();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('voice_recordings_changed', {
          detail: { audioPath, action: 'delete' },
        })
      );
    }
  } catch (err) {
    console.warn('Failed to delete recording:', err);
  }
}

/**
 * Retrieves a single voice recording metadata and blob from IndexedDB.
 */
export async function getVoiceRecording(audioPath: string): Promise<VoiceRecording | null> {
  if (!audioPath) return null;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return await new Promise<VoiceRecording | null>((resolve, reject) => {
      const getReq = store.get(audioPath);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieves all voice recordings from IndexedDB.
 */
export async function getAllVoiceRecordings(): Promise<VoiceRecording[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return await new Promise<VoiceRecording[]>((resolve, reject) => {
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => resolve(getAllReq.result || []);
      getAllReq.onerror = () => reject(getAllReq.error);
    });
  } catch {
    return [];
  }
}
