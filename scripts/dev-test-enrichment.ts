// Dev test: real-content enrichment pipeline against LIVE German sources.
// Run from the repo root:  npx tsx scripts/dev-test-enrichment.ts
import { enrichLearningContent } from '../server/transcripts.js';

async function main() {
  console.log('=== 1) Article: full body from the real publisher page ===');
  const article = await enrichLearningContent({
    contentType: 'article',
    title: 'Schweitzer zu Rentenplänen',
    currentText: 'Kurzer Teaser des Artikels.',
    sourceUrl: 'https://www.tagesschau.de/inland/innenpolitik/schweitzer-interview-100.html',
    ai: null,
    model: 'gemini-4-hydrogen',
  });
  console.log(
    article
      ? `OK: ${article.textDe.length} chars — sample: ${article.textDe.slice(0, 140)}…`
      : 'FAIL: null'
  );

  console.log('\n=== 2) Real tagesschau video → captions best-effort → official story fallback ===');
  const video = await enrichLearningContent({
    contentType: 'video',
    title: 'Arbeitsminister zur Rentenreform: „Gemeinsamkeiten größer als Unterschiede“',
    currentText: '',
    sourceName: 'tagesschau',
    videoId: '0DPhYGy6p2o',
    ai: null,
    model: 'gemini-4-hydrogen',
  });
  console.log(
    video
      ? `OK: ${video.textDe.length} chars | segments: ${video.segments?.length ?? 0} | ${video.sourceKindAr.slice(0, 90)}…`
      : 'NULL (both caption and story paths failed from this IP)'
  );

  console.log('\n=== 3) Podcast WITHOUT Gemini key → must stay null (honest partial) ===');
  const podcast = await enrichLearningContent({
    contentType: 'podcast',
    title: 'Test',
    currentText: '',
    audioUrl: 'https://example.test/audio.mp3',
    ai: null,
    model: 'gemini-4-hydrogen',
  });
  console.log(podcast === null ? 'OK: null (expected — needs GEMINI_API_KEY)' : 'UNEXPECTED RESULT');
}

void main();
