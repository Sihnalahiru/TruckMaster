import type {
  AuditSummaryPayload,
  CbtPaper,
  ChapterData,
  ContentManifest,
  KanjiItem,
  VocabItem,
} from '../types/truckmaster';

const cache = new Map<string, unknown>();

async function fetchJson<T>(url: string): Promise<T> {
  if (cache.has(url)) return cache.get(url) as T;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (${res.status})`);
  }
  const data = (await res.json()) as T;
  cache.set(url, data);
  return data;
}

export function loadManifest(): Promise<ContentManifest> {
  return fetchJson<ContentManifest>('/content/manifest.json');
}

export function loadChapter(chapterId: string): Promise<ChapterData> {
  return fetchJson<ChapterData>(`/content/chapters/${chapterId}.json`);
}

export function loadVocabulary(): Promise<VocabItem[]> {
  return fetchJson<VocabItem[]>('/content/vocabulary.json');
}

export function loadKanji(): Promise<KanjiItem[]> {
  return fetchJson<KanjiItem[]>('/content/kanji.json');
}

export function loadPaper(paperId: string): Promise<CbtPaper> {
  return fetchJson<CbtPaper>(`/content/papers/${paperId}.json`);
}

export function loadAuditSummary(): Promise<AuditSummaryPayload> {
  return fetchJson<AuditSummaryPayload>('/content/audit-summary.json');
}
