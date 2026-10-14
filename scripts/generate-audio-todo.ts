import fs from 'fs';
import path from 'path';

const contentDir = path.join(process.cwd(), 'content');
const en = JSON.parse(fs.readFileSync(path.join(contentDir, 'english.json'), 'utf-8'));
const num = JSON.parse(fs.readFileSync(path.join(contentDir, 'numbers.json'), 'utf-8'));
const am = JSON.parse(fs.readFileSync(path.join(contentDir, 'amharic.json'), 'utf-8'));

let md = '# Audio Recording Checklist (AUDIO_TODO.md)\n\n';
md += 'Plan for human-recorded audio (a family member\'s voice). Amharic text-to-speech is not suitable for teaching a 5-year-old child.\n';
md += 'Record in high-quality (44.1kHz or 48kHz mono/stereo MP3), warm, encouraging and clear for young ears.\n\n';

md += '## 1. System & Prompt Sounds (`/public/audio/prompts/`)\n\n';
const prompts = [
  ['tap_the.mp3', 'Tap the...'],
  ['find_the.mp3', 'Find the...'],
  ['great_job.mp3', 'Great job!'],
  ['try_again.mp3', 'Try again! Almost there!'],
  ['you_did_it.mp3', 'You did it! Amazing!'],
  ['lets_match.mp3', "Let's match them up!"],
  ['listen_carefully.mp3', 'Listen carefully!'],
  ['goodbye_tomorrow.mp3', 'Great job today! See you tomorrow!'],
  ['see_you_soon.mp3', 'Time for a break! See you soon!']
];
for (const [f, desc] of prompts) {
  md += `- [ ] \`/public/audio/prompts/${f}\` — "${desc}"\n`;
}

md += '\n## 2. English Alphabet & Words (`/public/audio/en/`)\n\n';
for (const item of en.items) {
  md += `- [ ] \`${item.audioPath}\` — Pronounce: "${item.displayName}" (${item.symbol})\n`;
  if (item.pictureWordAudioPath) {
    md += `- [ ] \`${item.pictureWordAudioPath}\` — Word: "${item.pictureWord}"\n`;
  }
}

md += '\n## 3. Numbers & Quantities (`/public/audio/num/`)\n\n';
for (const item of num.items) {
  md += `- [ ] \`${item.audioPath}\` — Number: "${item.displayName}" (${item.symbol})\n`;
  if (item.pictureWordAudioPath) {
    md += `- [ ] \`${item.pictureWordAudioPath}\` — Countable: "${item.pictureWord}"\n`;
  }
}

md += '\n## 4. Amharic Fidel & Words (`/public/audio/am/`)\n\n';
for (const item of am.items) {
  md += `- [ ] \`${item.audioPath}\` — Fidel: "${item.symbol}" (${item.displayName})\n`;
  if (item.pictureWordAudioPath) {
    const amharicWord = item.pictureWordAmharic || item.pictureWord;
    const englishMeaning = item.pictureWordEnglish || '';
    md += `- [ ] \`${item.pictureWordAudioPath}\` — Amharic Word: "${amharicWord}" (${englishMeaning})\n`;
  }
}

fs.writeFileSync(path.join(process.cwd(), 'AUDIO_TODO.md'), md);
console.log('AUDIO_TODO.md generated successfully!');
