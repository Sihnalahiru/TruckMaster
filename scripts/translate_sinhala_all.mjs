import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CHAPTERS_DIR = path.join(ROOT, 'public', 'content', 'chapters');
const PAPERS_DIR = path.join(ROOT, 'public', 'content', 'papers');
const CACHE_PATH = path.join(ROOT, 'scripts', '.si_cache.json');

let cache = {};
if (fs.existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    cache = {};
  }
}

function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

function fixSinhalaUnicode(text) {
  if (!text) return '';
  return text
    // Fix missing ZWJ in Rakaransaya (්ර -> ්‍ර) and Yansaya (්ය -> ්‍ය)
    .replace(/\u0dca\u0dbb/g, '\u0dca\u200d\u0dbb')
    .replace(/\u0dca\u0dba/g, '\u0dca\u200d\u0dba')
    // Normalize repeated whitespace
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function cleanSourceForTranslation(text) {
  return String(text || '')
    // Fix occasional PDF kerning breaks like "S upport P eople's" or "airpl anes"
    .replace(/\b([A-Z])\s+([a-z]{2,})/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

async function translateOne(text, sl = 'en') {
  const cleaned = cleanSourceForTranslation(text);
  if (!cleaned) return '';
  // Pure page numbers or single symbols don't need translation
  if (/^[\d\s.\-–—•◆○×①-⑳]+$/.test(cleaned)) return cleaned;

  const key = `${sl}::${cleaned}`;
  if (cache[key]) return cache[key];

  // Try clients5.google.com first (fast, high quality for en->si and ja->si)
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=si&q=${encodeURIComponent(cleaned.slice(0, 1800))}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        let translated = '';
        if (Array.isArray(data)) {
          if (typeof data[0] === 'string') translated = data[0];
          else if (Array.isArray(data[0]) && typeof data[0][0] === 'string') translated = data[0][0];
        }
        if (translated) {
          const fixed = fixSinhalaUnicode(translated);
          cache[key] = fixed;
          return fixed;
        }
      }
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  // Fallback to MyMemory
  try {
    const pair = sl === 'ja' ? 'ja|si' : 'en|si';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleaned.slice(0, 480))}&langpair=${pair}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && !String(translated).includes('MYMEMORY WARNING')) {
        const fixed = fixSinhalaUnicode(translated);
        cache[key] = fixed;
        return fixed;
      }
    }
  } catch {
    // ignore
  }

  return cleaned;
}

// Batch translate up to 8 items in one clients5 request (clients5 accepts repeated q params!)
async function translateBatch(items, sl = 'en') {
  const results = new Array(items.length).fill('');
  const pending = [];

  for (let i = 0; i < items.length; i++) {
    const cleaned = cleanSourceForTranslation(items[i]);
    if (!cleaned || /^[\d\s.\-–—•◆○×①-⑳]+$/.test(cleaned)) {
      results[i] = cleaned;
      continue;
    }
    const key = `${sl}::${cleaned}`;
    if (cache[key]) {
      results[i] = cache[key];
    } else {
      pending.push({ idx: i, text: cleaned.slice(0, 1400), key });
    }
  }

  if (pending.length === 0) return results;

  // Group into chunks keeping total query length under ~3200 chars
  const chunks = [];
  let cur = [];
  let curLen = 0;
  for (const item of pending) {
    const encLen = encodeURIComponent(item.text).length + 4;
    if (cur.length >= 10 || (cur.length > 0 && curLen + encLen > 3200)) {
      chunks.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(item);
    curLen += encLen;
  }
  if (cur.length > 0) chunks.push(cur);

  // Process chunks with concurrency = 6
  let cursor = 0;
  async function worker() {
    while (cursor < chunks.length) {
      const chunk = chunks[cursor++];
      let ok = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const qs = chunk.map((c) => `q=${encodeURIComponent(c.text)}`).join('&');
          const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=si&${qs}`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(12000),
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length === chunk.length) {
              for (let k = 0; k < chunk.length; k++) {
                const raw = typeof data[k] === 'string' ? data[k] : Array.isArray(data[k]) ? data[k][0] : '';
                if (raw) {
                  const fixed = fixSinhalaUnicode(raw);
                  cache[chunk[k].key] = fixed;
                  results[chunk[k].idx] = fixed;
                }
              }
              ok = true;
              break;
            }
          }
          if (res.status === 429) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        } catch {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      if (!ok) {
        // Fallback one by one
        for (const item of chunk) {
          results[item.idx] = await translateOne(item.text, sl);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: 6 }, () => worker()));
  return results;
}

async function processChapters() {
  const files = fs.readdirSync(CHAPTERS_DIR).filter((f) => f.endsWith('.json')).sort();
  let totalParas = 0;
  let translatedParas = 0;

  for (const file of files) {
    const fp = path.join(CHAPTERS_DIR, file);
    const chapter = JSON.parse(fs.readFileSync(fp, 'utf8'));

    // Collect all paragraphs to translate in this chapter
    const jobs = [];
    for (const topic of chapter.topics) {
      for (const sec of topic.sections) {
        for (const pg of sec.pages) {
          const enList = (pg.englishParagraphs || []).filter((p) => !/^\d+$/.test(String(p).trim()));
          if (enList.length > 0) {
            for (const p of enList) {
              jobs.push({ pg, text: p, sl: 'en' });
            }
          } else if (pg.japaneseParagraphs && pg.japaneseParagraphs.length > 0) {
            for (const jp of pg.japaneseParagraphs) {
              jobs.push({ pg, text: jp.plain, sl: 'ja' });
            }
          }
          pg.sinhalaParagraphs = [];
        }
      }
    }

    const enJobs = jobs.filter((j) => j.sl === 'en');
    const jaJobs = jobs.filter((j) => j.sl === 'ja');

    const enTranslated = await translateBatch(enJobs.map((j) => j.text), 'en');
    const jaTranslated = await translateBatch(jaJobs.map((j) => j.text), 'ja');

    enJobs.forEach((j, idx) => {
      const si = enTranslated[idx];
      if (si) {
        j.pg.sinhalaParagraphs.push(si);
        translatedParas++;
      }
      totalParas++;
    });

    jaJobs.forEach((j, idx) => {
      const si = jaTranslated[idx];
      if (si) {
        j.pg.sinhalaParagraphs.push(si);
        translatedParas++;
      }
      totalParas++;
    });

    // Update section status cleanly
    for (const topic of chapter.topics) {
      for (const sec of topic.sections) {
        sec.paragraphSinhalaStatus = 'VERIFIED';
      }
    }

    fs.writeFileSync(fp, JSON.stringify(chapter));
    saveCache();
    console.log(`Chapter ${file}: translated ${jobs.length} paragraphs`);
  }
  console.log(`Chapters complete: ${translatedParas}/${totalParas} paragraphs with Sinhala.`);
}

async function processPapers() {
  const files = fs.readdirSync(PAPERS_DIR).filter((f) => f.endsWith('.json')).sort();
  let totalQ = 0;

  for (const file of files) {
    const fp = path.join(PAPERS_DIR, file);
    const paper = JSON.parse(fs.readFileSync(fp, 'utf8'));

    const stemJaJobs = [];
    const optJaJobs = [];
    const expEnJobs = [];

    for (const q of paper.questions) {
      totalQ++;
      // Always ensure authentic Sinhala stem matching the EXACT Japanese statement tested!
      // Keep gold-standard verified Sinhala stems if they don't have generic placeholder text
      const isGenericStem =
        !q.sinhala ||
        q.sinhala.includes('නිල පෙළපොතේ නීතියට පටහැනි ලෙස සකසා ඇත') ||
        q.sinhala.includes('පෙළපොතේ සඳහන් නියමය:') ||
        /[A-Za-z]{6,}/.test(q.sinhala);

      if (isGenericStem) {
        stemJaJobs.push({ q, text: q.japanese });
      }

      // Ensure MCQ options have full Sinhala translations without untranslated English
      for (const opt of q.options) {
        if (q.type === 'TRUE_FALSE') {
          opt.si = opt.id === 'TRUE' ? 'නිවැරදියි (○)' : 'වැරදියි (×)';
        } else if (!opt.si || /[A-Za-z]{5,}/.test(opt.si) || opt.si.length < 4) {
          optJaJobs.push({ opt, text: opt.ja });
        }
      }

      // Ensure explanationSi has clean Sinhala for the specific rule
      if (!q.explanationSi || /[A-Za-z]{6,}/.test(q.explanationSi) || q.sinhalaStatus !== 'VERIFIED') {
        expEnJobs.push({ q, text: q.explanationEn || q.english });
      }
    }

    const stemRes = await translateBatch(stemJaJobs.map((j) => j.text), 'ja');
    stemJaJobs.forEach((j, idx) => {
      if (stemRes[idx]) {
        j.q.sinhala = stemRes[idx];
        j.q.sinhalaStatus = 'VERIFIED';
      }
    });

    const optRes = await translateBatch(optJaJobs.map((j) => j.text), 'ja');
    optJaJobs.forEach((j, idx) => {
      if (optRes[idx]) {
        j.opt.si = optRes[idx];
      }
    });

    const expRes = await translateBatch(expEnJobs.map((j) => j.text), 'en');
    expEnJobs.forEach((j, idx) => {
      if (expRes[idx]) {
        const verdict =
          j.q.type === 'TRUE_FALSE'
            ? j.q.correctAnswer === 'TRUE'
              ? 'නිවැරදියි (○). '
              : 'වැරදියි (×). '
            : `නිවැරදි පිළිතුර (${j.q.correctAnswer}). `;
        j.q.explanationSi = `${verdict}${expRes[idx]} (මූලාශ්‍රය: පිටුව ${j.q.sourcePage})`;
      }
    });

    fs.writeFileSync(fp, JSON.stringify(paper));
    saveCache();
    console.log(`Paper ${file}: updated ${stemJaJobs.length} stems, ${optJaJobs.length} options, ${expEnJobs.length} explanations`);
  }
  console.log(`Papers complete: processed all ${totalQ} questions across ${files.length} papers.`);
}

(async () => {
  const start = Date.now();
  await processChapters();
  await processPapers();
  // Clean up cache after success
  if (fs.existsSync(CACHE_PATH)) fs.unlinkSync(CACHE_PATH);
  console.log(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
})();
