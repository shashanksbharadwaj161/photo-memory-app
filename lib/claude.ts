import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAUDE_API_KEY_STORAGE = 'locket_claude_api_key';
const CLAUDE_ENABLED_STORAGE = 'locket_claude_enabled';
const CAPTION_HISTORY_STORAGE = 'locket_caption_history';

export async function saveClaudeApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  await AsyncStorage.setItem(CLAUDE_API_KEY_STORAGE, trimmed);
  const verify = await AsyncStorage.getItem(CLAUDE_API_KEY_STORAGE);
  console.log('[claude] saveClaudeApiKey:', verify === trimmed ? 'confirmed saved' : 'MISMATCH — save may have failed');
}
export async function clearClaudeApiKey(): Promise<void> {
  await AsyncStorage.multiRemove([CLAUDE_API_KEY_STORAGE, CLAUDE_ENABLED_STORAGE]);
}
export async function getClaudeApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(CLAUDE_API_KEY_STORAGE);
}
export async function setClaudeEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(CLAUDE_ENABLED_STORAGE, enabled ? '1' : '0');
}
export async function isClaudeEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(CLAUDE_ENABLED_STORAGE)) === '1';
}
export function isValidClaudeKey(key: string): boolean {
  return key.trim().startsWith('sk-ant-');
}
export async function isClaudeAvailable(): Promise<boolean> {
  const [enabled, key] = await Promise.all([isClaudeEnabled(), getClaudeApiKey()]);
  return enabled && !!key && isValidClaudeKey(key);
}

export async function saveCaptionToHistory(caption: string): Promise<void> {
  if (!caption.trim()) return;
  const raw = await AsyncStorage.getItem(CAPTION_HISTORY_STORAGE);
  const history: string[] = raw ? JSON.parse(raw) : [];
  history.push(caption);
  if (history.length > 30) history.splice(0, history.length - 30);
  await AsyncStorage.setItem(CAPTION_HISTORY_STORAGE, JSON.stringify(history));
}
export async function getCaptionHistory(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(CAPTION_HISTORY_STORAGE);
  return raw ? JSON.parse(raw) : [];
}

interface ClaudeMessageResponse {
  content?: Array<{ type: string; text?: string }>;
}

async function callClaude(system: string, user: string, maxTokens: number = 300): Promise<string> {
  const key = await getClaudeApiKey();
  if (!key) throw new Error('No API key');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!response.ok) throw new Error('API error ' + response.status);
  const data = (await response.json()) as ClaudeMessageResponse;
  return data.content?.[0]?.text?.trim() ?? '';
}

export async function suggestCaption(
  photoDesc: string,
  timeOfDay: string,
  filterName: string,
  history: string[]
): Promise<string> {
  const voiceExamples =
    history.length >= 5
      ? "Match this person's exact writing voice:\n" +
        history
          .slice(-8)
          .map((c: string) => '"' + c + '"')
          .join('\n')
      : 'Write in a warm, intimate, personal voice — like a private note.';
  return callClaude(
    'You suggest photo captions for a private shared photo book between two people.\n' +
      voiceExamples +
      '\nRules: 1-2 sentences max. Never generic. No hashtags. Return ONLY the caption text.',
    'Suggest a caption. Photo: ' + photoDesc + '. Time: ' + timeOfDay + '. Filter: ' + filterName,
    100
  );
}

export async function finishSentence(partial: string, history: string[]): Promise<string> {
  const examples = history
    .slice(-5)
    .map((c: string) => '"' + c + '"')
    .join(' | ');
  return callClaude(
    "Complete the partial caption in the writer's voice. Examples: " +
      examples +
      '\nReturn ONLY the completed sentence.',
    'Complete: "' + partial + '"',
    80
  );
}

export async function generateMemoryStory(
  caption: string,
  daysAgo: number,
  partnerName: string
): Promise<string> {
  return callClaude(
    "Write a 2-3 sentence warm reflection for a memory that surfaced in a couple's photo book. Past tense. Personal, specific, slightly nostalgic. Return ONLY the reflection.",
    'Caption: "' + caption + '". Days ago: ' + daysAgo + '. Partner: ' + partnerName,
    120
  );
}

export async function suggestPostcardMessage(
  caption: string,
  partnerName: string,
  history: string[]
): Promise<string> {
  const examples = history
    .slice(-5)
    .map((c: string) => '"' + c + '"')
    .join(' | ');
  return callClaude(
    'Write a short postcard message. 2-3 sentences. Warm, specific. Voice examples: ' +
      examples +
      '\nReturn ONLY the message.',
    'Photo caption: "' + caption + '". Write to ' + partnerName,
    100
  );
}

export async function suggestFilter(
  caption: string,
  timeOfDay: string,
  filterNames: string[]
): Promise<string> {
  return callClaude(
    'Suggest ONE filter from this list: ' +
      filterNames.join(', ') +
      '\nReturn ONLY the filter name exactly as written.',
    'Photo: "' + caption + '" at ' + timeOfDay,
    20
  );
}

export async function generateMonthlyNarrative(
  captions: string[],
  month: string,
  names: [string, string]
): Promise<string> {
  return callClaude(
    "Write 3-4 sentences about a couple's month based on photo captions. Warm, observational, diary-like. Extract the feeling, don't list captions. Return ONLY the narrative.",
    'Month: ' +
      month +
      '. People: ' +
      names[0] +
      ' and ' +
      names[1] +
      '.\nCaptions:\n' +
      captions.map((c: string) => '"' + c + '"').join('\n'),
    200
  );
}

export async function transcribeAndBeautifyVoiceLetter(text: string, sender: string): Promise<string> {
  return callClaude(
    'Clean a voice transcription into a handwritten-style letter. Fix filler words. Keep voice intact. Natural paragraphs. Return ONLY the letter text.',
    'From: ' + sender + '\nTranscription: "' + text + '"',
    400
  );
}
