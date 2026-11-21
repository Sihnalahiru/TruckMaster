export type DiagramSectionId =
  | 'all'
  | 'operations'
  | 'driving-safety'
  | 'emergency'
  | 'records-weather'
  | 'cargo-handling'
  | 'hazard-prediction';

export interface DiagramItem {
  id: number;
  filename: string;
  src: string;
  section: Exclude<DiagramSectionId, 'all'>;
  titleEn: string;
  titleJa: string;
}

export const DIAGRAM_SECTIONS: Array<{
  id: DiagramSectionId;
  labelEn: string;
  labelJa: string;
  rangeLabel: string;
}> = [
  { id: 'all', labelEn: 'All Diagrams', labelJa: 'すべての図解', rangeLabel: '0–226' },
  { id: 'operations', labelEn: 'Foundations & Equipment', labelJa: '基礎・機器', rangeLabel: '0–29' },
  { id: 'driving-safety', labelEn: 'Driving Rules & Safety', labelJa: '安全運転規則', rangeLabel: '30–79' },
  { id: 'emergency', labelEn: 'Pre-Trip & Incidents', labelJa: '運行計画・事故対応', rangeLabel: '80–119' },
  { id: 'records-weather', labelEn: 'Weather & Work Records', labelJa: '気象・業務日報', rangeLabel: '120–159' },
  { id: 'cargo-handling', labelEn: 'Cargo & Securement', labelJa: '積載・固縛作業', rangeLabel: '160–194' },
  { id: 'hazard-prediction', labelEn: 'Hazard Prediction (KYT)', labelJa: '危険予知トレーニング', rangeLabel: '195–226' },
];

const RAW_FILENAMES: string[] = [
  '0.jpg', '1.png', '2.png', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg',
  '10.jpg', '12.jpg', '13.jpg', '14.png', '15.png', '16.png', '17.png', '18.png', '19.png', '20.png',
  '21.png', '22.png', '23.png', '24.png', '25.png', '26.png', '27.jpg', '28.jpg', '29.jpg', '30.jpg',
  '31.jpg', '32.jpg', '33.jpg', '34.jpg', '35.png', '36.jpg', '37.jpg', '38.jpg', '39.png', '40.jpg',
  '41.jpg', '42.jpg', '43.jpg', '44.jpg', '45.jpg', '46.jpg', '47.jpg', '48.png', '49.jpg', '50.jpg',
  '51.png', '52.jpg', '53.jpg', '54.jpg', '55.jpg', '56.jpg', '57.jpg', '58.jpg', '59.jpg', '60.png',
  '61.png', '62.png', '63.png', '64.png', '65.jpg', '66.jpg', '67.jpg', '68.jpg', '69.png', '70.png',
  '71.png', '72.jpg', '73.jpg', '74.jpg', '75.jpg', '76.jpg', '77.jpg', '78.jpg', '79.jpg', '80.jpg',
  '81.jpg', '82.jpg', '83.jpg', '84.jpg', '85.jpg', '86.jpg', '87.jpg', '88.jpg', '89.jpg', '90.jpg',
  '91.jpg', '92.jpg', '93.jpg', '94.jpg', '95.jpg', '96.jpg', '97.jpg', '98.jpg', '99.jpg', '100.jpg',
  '101.jpg', '102.jpg', '103.jpg', '104.jpg', '105.jpg', '106.jpg', '107.jpg', '108.jpg', '109.jpg', '110.jpg',
  '111.png', '112.jpg', '113.jpg', '114.jpg', '115.jpg', '116.jpg', '117.png', '118.png', '119.jpg', '120.jpg',
  '121.png', '122.png', '123.jpg', '124.png', '125.png', '126.jpg', '127.jpg', '128.png', '129.jpg', '130.jpg',
  '131.jpg', '132.jpg', '133.jpg', '134.jpg', '135.jpg', '136.jpg', '137.jpg', '138.jpg', '139.jpg', '140.jpg',
  '141.jpg', '142.jpg', '143.jpg', '144.png', '145.jpg', '146.jpg', '147.jpg', '148.png', '149.jpg', '150.jpg',
  '151.jpg', '152.jpg', '153.jpg', '154.jpg', '155.jpg', '156.jpg', '157.jpg', '158.jpg', '159.jpg', '160.jpg',
  '161.jpg', '162.jpg', '163.jpg', '164.jpg', '165.jpg', '166.png', '167.png', '168.jpg', '169.jpg', '170.jpg',
  '171.jpg', '172.jpg', '173.jpg', '174.jpg', '175.png', '176.jpg', '177.jpg', '178.jpg', '179.jpg', '180.jpg',
  '181.jpg', '182.jpg', '183.jpg', '184.jpg', '185.jpg', '186.jpg', '187.jpg', '188.jpg', '189.jpg', '190.png',
  '191.jpg', '192.png', '193.jpg', '194.png', '195.jpg', '196.jpg', '197.jpg', '198.jpg', '199.jpg', '200.png',
  '201.jpg', '202.png', '203.jpg', '204.png', '205.jpg', '206.jpg', '207.jpg', '208.jpg', '209.jpg', '210.png',
  '211.jpg', '212.jpg', '213.jpg', '214.jpg', '215.jpg', '216.png', '217.jpg', '218.png', '219.jpg', '220.png',
  '221.jpg', '222.png', '223.jpg', '224.png', '225.jpg', '226.png',
];

const VERIFIED_CAPTIONS: Record<number, { en: string; ja: string }> = {
  0: { en: 'Yielding to children and elderly pedestrians', ja: '子ども・高齢者への思いやり運転' },
  1: { en: 'Japan Trucking Association (JTA) Official Emblem', ja: '公益社団法人 全日本トラック協会' },
  2: { en: 'Driver Training Partner Emblem', ja: '教育教材パートナーロゴ' },
  10: { en: 'Digital Tachograph Operation Recorder', ja: 'デジタル式運行記録計（デジタコ）' },
  40: { en: 'Rear-end collision risk from smartphone distraction', ja: 'スマホながら運転による追突事故の危険' },
  50: { en: 'Using a smoke flare during railway crossing stall', ja: '踏切内立ち往生時の発炎筒による合図' },
  80: { en: 'Pre-trip briefing: route, weather, and high-risk zones', ja: '運行前の経路・気象・事故多発地点の確認' },
  100: { en: 'Mandatory police reporting after a traffic accident', ja: '交通事故発生時の警察への通報義務' },
  120: { en: 'Crosswind rollover hazard on exposed bridges', ja: '橋梁上での横風による横転危険と吹き流し確認' },
  140: { en: 'Completing the Daily Operation Work Record (Gyomu Nippo)', ja: '業務日報（乗務等の記録）の記入方法' },
  160: { en: 'Cargo re-securement intervals: 4h general / 2h highway', ja: '一般道4時間・高速道2時間ごとの荷締め点検' },
  180: { en: 'Balanced loading, lashing belts, and cautious door opening', ja: '偏荷重防止・ラッシングベルト固縛・扉の慎重な開閉' },
  195: { en: 'KYT Scene: Oncoming truck on a narrow urban road', ja: '危険予知：市街地狭路での対向トラック接近' },
  210: { en: 'KYT Diagram: Three sequential intersection hazards', ja: '危険予知図解：交差点付近の3段階危険予測' },
  225: { en: 'KYT Scene: Passing a parked truck with mirror blind spot', ja: '危険予知：停車車両の側方通過と右側ミラーの二輪車' },
};

function classifySection(id: number): Exclude<DiagramSectionId, 'all'> {
  if (id <= 29) return 'operations';
  if (id <= 79) return 'driving-safety';
  if (id <= 119) return 'emergency';
  if (id <= 159) return 'records-weather';
  if (id <= 194) return 'cargo-handling';
  return 'hazard-prediction';
}

function defaultTitle(id: number, section: Exclude<DiagramSectionId, 'all'>): { en: string; ja: string } {
  const verified = VERIFIED_CAPTIONS[id];
  if (verified) return verified;

  switch (section) {
    case 'operations':
      return { en: `Operations & Equipment Reference Fig. ${id}`, ja: `運行基礎・車載機器 図解 ${id}` };
    case 'driving-safety':
      return { en: `Safe Driving & Traffic Rules Fig. ${id}`, ja: `安全運転・交通規則 図解 ${id}` };
    case 'emergency':
      return { en: `Pre-Trip Planning & Incident Response Fig. ${id}`, ja: `運行管理・事故対応 図解 ${id}` };
    case 'records-weather':
      return { en: `Adverse Weather & Logbooks Fig. ${id}`, ja: `悪天候運転・業務記録 図解 ${id}` };
    case 'cargo-handling':
      return { en: `Cargo Loading & Securement Fig. ${id}`, ja: `積載方法・荷崩れ防止 図解 ${id}` };
    case 'hazard-prediction':
      return { en: `Hazard Prediction Training (KYT) Fig. ${id}`, ja: `危険予知トレーニング（KYT）図解 ${id}` };
  }
}

export const ALL_DIAGRAMS: DiagramItem[] = RAW_FILENAMES.map((filename) => {
  const id = parseInt(filename.split('.')[0], 10);
  const section = classifySection(id);
  const titles = defaultTitle(id, section);
  return {
    id,
    filename,
    src: `/data/images/${filename}`,
    section,
    titleEn: titles.en,
    titleJa: titles.ja,
  };
});

export const PDF_BOOKS = [
  {
    id: 'en' as const,
    titleEn: 'SSW Truck Driving Test Book (English)',
    titleJa: '特定技能トラック運転 試験対策テキスト（英語版）',
    subtitleEn: 'Complete official study text translated into English for SSW Category 1 candidates.',
    subtitleJa: '特定技能1号（自動車運送業・トラック）英語受験者向けの公式学習テキスト。',
    url: '/data/ssw_truck%20driving%20English%20test%20book.pdf',
    filename: 'ssw_truck driving English test book.pdf',
    sizeLabel: '8.9 MB',
  },
  {
    id: 'ja' as const,
    titleEn: 'SSW Truck Driving Test Book (Japanese)',
    titleJa: '特定技能トラック運転 試験対策テキスト（日本語版）',
    subtitleEn: 'Original Japanese reference manual covering traffic rules, cargo work, and KYT.',
    subtitleJa: '交通法規・荷役作業・危険予知を網羅した日本語版の公式テキスト。',
    url: '/data/ssw_truck%20driving%20japnese%20test%20book.pdf',
    filename: 'ssw_truck driving japnese test book.pdf',
    sizeLabel: '8.6 MB',
  },
];
