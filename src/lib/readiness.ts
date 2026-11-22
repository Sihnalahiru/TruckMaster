import type { ContentManifest, LearnerProgressState } from '../types/truckmaster';

export interface WeakTopicItem {
  id: string;
  labelEn: string;
  labelSi: string;
  scorePct: number;
  targetRoute: 'study' | 'kyt' | 'simulator' | 'review' | 'vocabulary';
  chapterId?: string;
  sectionId?: string;
  reasonEn: string;
}

export interface ReadinessBreakdown {
  overallIndex: number;
  theoryReadiness: number;
  practicalReadiness: number;
  kytReadiness: number;
  vocabKanjiMastery: number;
  levelLabelEn: string;
  levelLabelSi: string;
  weakestTopics: WeakTopicItem[];
  disclaimerEn: string;
  disclaimerSi: string;
}

export function computeReadinessBreakdown(
  manifest: ContentManifest,
  progress: LearnerProgressState,
  totalKytScenarios = 12,
  totalSimulatorScenarios = 12,
): ReadinessBreakdown {
  const chById = Object.fromEntries(manifest.chapters.map((c) => [c.id, c]));
  const sectionIdsFor = (chapterIds: string[]) =>
    chapterIds.flatMap((cid) =>
      (chById[cid]?.topics || []).flatMap((t) => t.sections.map((s) => s.sectionId)),
    );

  // 1. Theory Readiness (Ch.1 & Ch.2 sections + CBT Section A accuracy)
  const theorySecIds = sectionIdsFor(['ch-01', 'ch-02']);
  const theoryDone = theorySecIds.filter((id) => progress.completedSectionIds.includes(id)).length;
  const theoryStudyPct = theorySecIds.length ? (theoryDone / theorySecIds.length) * 100 : 0;

  const theoryCbtPct =
    progress.examAttempts.length > 0
      ? (progress.examAttempts.reduce((s, a) => s + a.theoryCorrect / Math.max(1, a.theoryTotal), 0) /
          progress.examAttempts.length) *
        100
      : null;

  const theoryReadiness = Math.round(
    theoryCbtPct !== null ? theoryStudyPct * 0.45 + theoryCbtPct * 0.55 : theoryStudyPct * 0.75,
  );

  // 2. Practical Readiness (Ch.3 cargo handling + Simulator safe rate + CBT Section B accuracy)
  const ch3SecIds = sectionIdsFor(['ch-03']);
  const ch3Done = ch3SecIds.filter((id) => progress.completedSectionIds.includes(id)).length;
  const ch3Pct = ch3SecIds.length ? (ch3Done / ch3SecIds.length) * 100 : 0;

  const simValues = Object.values(progress.simulatorResults || {});
  const simSafe = simValues.filter((r) => r.bestOutcome === 'safe').length;
  const simPct = totalSimulatorScenarios > 0 ? (simSafe / totalSimulatorScenarios) * 100 : 0;

  const practicalCbtPct =
    progress.examAttempts.length > 0
      ? (progress.examAttempts.reduce(
          (s, a) => s + a.practicalCorrect / Math.max(1, a.practicalTotal),
          0,
        ) /
          progress.examAttempts.length) *
        100
      : null;

  const practicalReadiness = Math.round(
    practicalCbtPct !== null
      ? ch3Pct * 0.3 + simPct * 0.3 + practicalCbtPct * 0.4
      : ch3Pct * 0.45 + simPct * 0.55,
  );

  // 3. KYT Readiness (Ch.4 completion + KYT Interactive Lab hotspot/countermeasure mastery)
  const ch4SecIds = sectionIdsFor(['ch-04']);
  const ch4Done = ch4SecIds.filter((id) => progress.completedSectionIds.includes(id)).length;
  const ch4Pct = ch4SecIds.length ? (ch4Done / ch4SecIds.length) * 100 : 0;

  const kytValues = Object.values(progress.kytResults || {});
  const kytLabPct =
    totalKytScenarios > 0
      ? (kytValues.reduce((sum, r) => sum + r.bestScorePct / 100, 0) / totalKytScenarios) * 100
      : 0;

  const kytReadiness = Math.round(ch4Pct * 0.4 + kytLabPct * 0.6);

  // 4. Vocabulary & Kanji Mastery (Mastered Vocab + Kanji + SRS accuracy + Audio recognition)
  const totalLex = Math.max(1, manifest.counts.vocabulary + manifest.counts.kanji);
  const lexMasteredPct =
    ((progress.masteredVocabIds.length + progress.masteredKanjiIds.length) / totalLex) * 100;

  const fcVals = Object.values(progress.flashcards);
  const fcRight = fcVals.reduce((s, c) => s + c.correctCount, 0);
  const fcAll = fcVals.reduce((s, c) => s + c.correctCount + c.incorrectCount, 0);
  const fcAcc = fcAll > 0 ? (fcRight / fcAll) * 100 : null;

  const audioAcc =
    (progress.audioVocabTotal || 0) > 0
      ? ((progress.audioVocabCorrect || 0) / Math.max(1, progress.audioVocabTotal || 1)) * 100
      : null;

  const vocabKanjiMastery = Math.round(
    fcAcc !== null && audioAcc !== null
      ? lexMasteredPct * 0.5 + fcAcc * 0.25 + audioAcc * 0.25
      : fcAcc !== null
        ? lexMasteredPct * 0.65 + fcAcc * 0.35
        : lexMasteredPct,
  );

  // Overall Preparation Index
  const overallIndex = Math.round(
    theoryReadiness * 0.3 +
      practicalReadiness * 0.25 +
      kytReadiness * 0.25 +
      vocabKanjiMastery * 0.2,
  );

  let levelLabelEn = 'Early Preparation';
  let levelLabelSi = 'මූලික සූදානම් වීමේ අදියර';
  if (overallIndex >= 80) {
    levelLabelEn = 'Strong Preparation Indicator';
    levelLabelSi = 'ඉහළ සූදානම් වීමේ මට්ටම';
  } else if (overallIndex >= 60) {
    levelLabelEn = 'Steady Progress';
    levelLabelSi = 'හොඳ ප්‍රගතියක් පවතී';
  } else if (overallIndex >= 30) {
    levelLabelEn = 'Building Foundation';
    levelLabelSi = 'මූලික පදනම ගොඩනඟමින්';
  }

  // Compute weakest topics list (actionable)
  const candidates: WeakTopicItem[] = manifest.chapters.map((ch) => {
    const secIds = ch.topics.flatMap((t) => t.sections.map((s) => s.sectionId));
    const done = secIds.filter((id) => progress.completedSectionIds.includes(id)).length;
    const compPct = Math.round((done / Math.max(1, secIds.length)) * 100);
    let cbtRight = 0;
    let cbtAll = 0;
    for (const att of progress.examAttempts) {
      const st = att.chapterStats[ch.id];
      if (st) {
        cbtRight += st.correct;
        cbtAll += st.total;
      }
    }
    const scorePct = cbtAll > 0 ? Math.round((cbtRight / cbtAll) * 60 + compPct * 0.4) : compPct;
    return {
      id: ch.id,
      labelEn: `Ch.${ch.number}: ${ch.titleEn}`,
      labelSi: ch.titleSi,
      scorePct,
      targetRoute: ch.id === 'ch-04' ? 'kyt' : 'study',
      chapterId: ch.id,
      sectionId: secIds[0],
      reasonEn:
        cbtAll > 0
          ? `CBT ${Math.round((cbtRight / cbtAll) * 100)}% · Study ${compPct}%`
          : `Study completion ${compPct}%`,
    };
  });

  // Add Simulator & Audio/Vocab candidates
  candidates.push({
    id: 'sim-practical',
    labelEn: 'Road & Cargo Decision Simulator',
    labelSi: 'මාර්ග සහ භාණ්ඩ ආරක්ෂිත තීරණ පුහුණුව',
    scorePct: Math.round(simPct),
    targetRoute: 'simulator',
    reasonEn: `${simSafe}/${totalSimulatorScenarios} safe scenario completions`,
  });

  candidates.push({
    id: 'vocab-kanji',
    labelEn: 'Japanese Trucking Vocabulary & Kanji',
    labelSi: 'ජපන් ට්‍රක් වචන මාලාව සහ කන්ජි',
    scorePct: vocabKanjiMastery,
    targetRoute: 'vocabulary',
    reasonEn: `${progress.masteredVocabIds.length + progress.masteredKanjiIds.length}/${totalLex} mastered`,
  });

  const weakestTopics = candidates.sort((a, b) => a.scorePct - b.scorePct).slice(0, 3);

  return {
    overallIndex,
    theoryReadiness,
    practicalReadiness,
    kytReadiness,
    vocabKanjiMastery,
    levelLabelEn,
    levelLabelSi,
    weakestTopics,
    disclaimerEn:
      'Preparation Indicator Only — tracks study coverage, practice accuracy, and KYT drills. It is NOT an official SSW exam pass prediction or guarantee.',
    disclaimerSi:
      'මෙය ඔබේ සූදානම් වීමේ මට්ටම පෙන්වන දර්ශකයක් පමණි. මෙය නිල SSW විභාගයේ සමත් වීමේ සහතිකයක් හෝ අනාවැකියක් ලෙස නොසලකන්න.',
  };
}
