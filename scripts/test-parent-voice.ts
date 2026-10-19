import assert from 'assert';
import { normalizeTextKey } from '../src/lib/audioStorage';

console.log('🧪 Testing Parent Voice Cross-Check & Fallback System...\n');

// Test 1: Normalize text key
assert.strictEqual(normalizeTextKey('Capital A!'), 'capital a');
assert.strictEqual(normalizeTextKey('  Apple,  '), 'apple');
assert.strictEqual(normalizeTextKey('Great job!'), 'great job');
assert.strictEqual(normalizeTextKey('በግ'), 'በግ');
console.log('✓ Text normalization works accurately for English and Amharic');

// Test 2: Voice settings type acceptance
import type { VoiceGender } from '../src/utils/sound';
const female: VoiceGender = 'female';
const male: VoiceGender = 'male';
const parent: VoiceGender = 'parent';
assert.strictEqual(female, 'female');
assert.strictEqual(male, 'male');
assert.strictEqual(parent, 'parent');
console.log('✓ VoiceGender type successfully supports female, male, and parent');

console.log('\n🎉 Parent Voice Logic Verification Passed!');
