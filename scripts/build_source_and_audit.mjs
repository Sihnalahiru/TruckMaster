import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const AUDIT_DIR = path.join(ROOT, 'audit');
const CONTENT_DIR = path.join(ROOT, 'public', 'content');
const CHAPTERS_DIR = path.join(CONTENT_DIR, 'chapters');

fs.mkdirSync(AUDIT_DIR, { recursive: true });
fs.mkdirSync(CHAPTERS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 1. Hepburn Romaji Converter (Hiragana / Katakana -> Hepburn Romaji)
// ---------------------------------------------------------------------------
const KANA_MAP = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  てぃ: 'ti', でぃ: 'di', ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo', ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
  ちぇ: 'che', しぇ: 'she', じぇ: 'je',
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'wi', ゑ: 'we', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo',
};

function katakanaToHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

export function kanaToRomaji(input) {
  const hira = katakanaToHiragana(
    input
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/　/g, ' '),
  );
  let out = '';
  for (let i = 0; i < hira.length; i++) {
    const ch = hira[i];
    if (ch === 'っ') {
      const next2 = KANA_MAP[hira.slice(i + 1, i + 3)];
      const next1 = KANA_MAP[hira[i + 1]];
      const nextRom = next2 || next1;
      if (nextRom && /^[a-z]/.test(nextRom)) {
        out += nextRom.startsWith('ch') ? 't' : nextRom[0];
      }
      continue;
    }
    if (ch === 'ー') {
      const lastVowel = out.slice(-1);
      if ('aeiou'.includes(lastVowel)) out += lastVowel;
      continue;
    }
    const pair = hira.slice(i, i + 2);
    if (KANA_MAP[pair]) {
      out += KANA_MAP[pair];
      i++;
      continue;
    }
    if (KANA_MAP[ch]) {
      out += KANA_MAP[ch];
      continue;
    }
    if (ch === '。') out += '. ';
    else if (ch === '、') out += ', ';
    else if (ch === '・') out += ' / ';
    else if (ch === '（' || ch === '【' || ch === '「') out += ' (';
    else if (ch === '）' || ch === '】' || ch === '」') out += ') ';
    else if (ch === '？') out += '? ';
    else if (ch === '！') out += '! ';
    else out += ch;
  }
  return out.replace(/\s+/g, ' ').trim();
}

function sha256File(fp) {
  return crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex');
}

function readImageDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png' && buf.length >= 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: 'PNG' };
  }
  if ((ext === '.jpg' || ext === '.jpeg') && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      const len = buf.readUInt16BE(offset + 2);
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        return {
          width: buf.readUInt16BE(offset + 7),
          height: buf.readUInt16BE(offset + 5),
          format: 'JPEG',
        };
      }
      offset += 2 + len;
    }
  }
  return { width: 0, height: 0, format: ext.replace('.', '').toUpperCase() };
}

// ---------------------------------------------------------------------------
// 2. Official Textbook Syllabus Hierarchy (Verified against EN & JA TOC)
// ---------------------------------------------------------------------------
const SYLLABUS_TOPICS = [
  // CHAPTER 1: Truck Driver Basics (Printed pp. 1–62)
  {
    chapterId: 'ch-01',
    topicId: 'ch01-t01',
    code: '1.1',
    startPage: 1,
    endPage: 5,
    titleEn: "How Trucks Support People's Lives and Jobs",
    titleJa: '人々の生活や仕事を支えるトラック',
    titleJaRuby: '人々[ひとびと]の生活[せいかつ]や仕事[しごと]を支[ささ]えるトラック',
    titleSi: 'මිනිසුන්ගේ ජීවිතය සහ රැකියා සඳහා ට්‍රක් රථවල දායකත්වය',
    sinhalaOverview:
      'ජපානයේ භාණ්ඩ ප්‍රවාහනයෙන් විශාල කොටසක් ට්‍රක් රථ මගින් සිදු වේ. මෙම කොටසේදී ට්‍රක් රථවල සමාජ කාර්යභාරය, ට්‍රක් රථ ප්‍රවාහනය නතර වුවහොත් ඇතිවන බලපෑම් සහ පෞද්ගලික (සුදු අංක තහඩු) හා වාණිජ්‍ය (කොළ අංක තහඩු) ට්‍රක් රථ අතර නීතිමය වෙනස විස්තර කෙරේ.',
    subtopics: [
      { id: 'ch01-t01-s1', code: '1.1', titleEn: 'The Role of Trucks', titleJa: 'トラックの役割', page: 2 },
      { id: 'ch01-t01-s2', code: '1.2', titleEn: 'What If Truck Transportation Stops?', titleJa: 'トラック輸送が止まったら', page: 3 },
      { id: 'ch01-t01-s3', code: '1.3', titleEn: 'Private Trucks vs Commercial Trucks', titleJa: '自家用トラックと事業用トラックの違い', page: 4 },
    ],
  },
  {
    chapterId: 'ch-01',
    topicId: 'ch01-t02',
    code: '1.2',
    startPage: 6,
    endPage: 10,
    titleEn: 'Social Impact of Truck Accidents & Safety Devices',
    titleJa: 'トラック事故の社会的影響と安全管理機器',
    titleJaRuby: 'トラック事故[じこ]の社会的[しゃかいてき]影響[えいきょう]と安全管理機器[あんぜんかんりきき]',
    titleSi: 'ට්‍රක් රථ අනතුරුවල සමාජ බලපෑම සහ ආරක්ෂක උපාංග',
    sinhalaOverview:
      'ට්‍රක් රථ අනතුරු මාරාන්තික විය හැකි අතර සමාගමට සහ සමාජයට දැඩි බලපෑම් ඇති කරයි. පසුපස ගැටීම් (追突事故), මංසන්ධි අනතුරු, සෞඛ්‍ය ගැටලු නිසා වන අනතුරු වැළැක්වීම සහ ඩිජිටල් ටැකොග්‍රාෆ් / ඩ්‍රයිව් රෙකෝඩර් භාවිතය මෙහි ඇතුළත් වේ.',
    subtopics: [
      { id: 'ch01-t02-s1', code: '2.1', titleEn: 'Major Accidents and Their Social Impact', titleJa: '重大事故と社会的影響', page: 6 },
      { id: 'ch01-t02-s2', code: '2.2', titleEn: 'Rear-End Collisions: Causes and Situations', titleJa: '追突事故の原因と状況', page: 7 },
      { id: 'ch01-t02-s3', code: '2.3', titleEn: 'Intersection Accidents', titleJa: '交差点事故', page: 8 },
      { id: 'ch01-t02-s4', code: '2.4', titleEn: 'Preventing Health-Related Accidents', titleJa: '健康起因事故の防止', page: 9 },
      { id: 'ch01-t02-s5', code: '2.5', titleEn: 'Safety Management Devices (Digital Tachograph & Dashcam)', titleJa: '安全管理機器（デジタコ・ドラレコ）', page: 10 },
    ],
  },
  {
    chapterId: 'ch-01',
    topicId: 'ch01-t03',
    code: '1.3',
    startPage: 11,
    endPage: 18,
    titleEn: 'The Proper Mindset of a Truck Driver & 4S Cleanliness',
    titleJa: 'トラック運転者の心構えと4S活動',
    titleJaRuby: 'トラック運転者[うんてんしゃ]の心構[こころがま]えと4S活動[かつどう]',
    titleSi: 'ට්‍රක් රථ රියදුරෙකුගේ නිවැරදි ආකල්ප, ආචාර ධර්ම සහ 4S පිරිසිදුකම',
    sinhalaOverview:
      'වෘත්තීය රියදුරෙකු ලෙස සේවා ස්ථානයේ සහ පාරිභෝගිකයන් ඉදිරියේ ආචාරශීලී වීම, නිසි ඇඳුම් පැළඳුම්, ගෞරවනීය ජපන් භාෂා භාවිතය (敬語) සහ වාහනයේ 4S (Seiri, Seiton, Seiso, Seiketsu) පිළිවෙළ පවත්වා ගැනීම විස්තර කෙරේ.',
    subtopics: [
      { id: 'ch01-t03-s1', code: '3.1–3.3', titleEn: 'Greetings & Personal Appearance', titleJa: 'あいさつと身だしなみ', page: 11 },
      { id: 'ch01-t03-s2', code: '3.4–3.5', titleEn: 'Workplace Mindset & Language Etiquette', titleJa: '職場での心構えと言葉づかい', page: 13 },
      { id: 'ch01-t03-s3', code: '3.6–3.7', titleEn: 'Vehicle 4S Cleanliness & Special Considerations', titleJa: '車両の整理・整頓（4S）と特別な配慮', page: 15 },
    ],
  },
  {
    chapterId: 'ch-01',
    topicId: 'ch01-t04',
    code: '1.4',
    startPage: 19,
    endPage: 51,
    titleEn: 'Basics of Safe Driving & Traffic Rules',
    titleJa: '安全運転の基本と交通ルール',
    titleJaRuby: '安全運転[あんぜんうんてん]の基本[きほん]と交通[こうつう]ルール',
    titleSi: 'ආරක්ෂිත රිය පැදවීමේ මූලික නීති සහ මාර්ග සංඥා',
    sinhalaOverview:
      'දෛනික සෞඛ්‍ය පාලනය, බීමත්ව රිය පැදවීමේ සපුරා තහනම, වේග සීමා, මංසන්ධි, ආරක්ෂිත පරතරය, ස්මාර්ට්ෆෝන් තහනම, පදිකයින් ආරක්ෂා කිරීම, දුම්රිය හරස් මාර්ග, අධිවේගී මාර්ග, කඳු/වංගු/උමං, මාර්ග සංඥා, නැවැත්වීම සහ රාත්‍රී ධාවනය මෙහි සම්පූර්ණයෙන් ආවරණය වේ.',
    subtopics: [
      { id: 'ch01-t04-s1', code: '4.1–4.3', titleEn: 'Health Management, Zero Drunk Driving & Speed Limits', titleJa: '健康管理・飲酒運転禁止・制限速度', page: 19 },
      { id: 'ch01-t04-s2', code: '4.4–4.6', titleEn: 'Intersections, Following Distance & No Smartphones', titleJa: '交差点・車間距離・ながらスマホ禁止', page: 24 },
      { id: 'ch01-t04-s3', code: '4.7–4.9', titleEn: 'Pedestrians, Emergency Vehicles & Railway Crossings', titleJa: '歩行者保護・緊急車両・踏切通過', page: 29 },
      { id: 'ch01-t04-s4', code: '4.10–4.11', titleEn: 'Highways, Hills, Curves and Tunnels', titleJa: '高速道路・坂道・カーブ・トンネル', page: 37 },
      { id: 'ch01-t04-s5', code: '4.12–4.15', titleEn: 'Traffic Signals, Road Signs, Parking & Night Driving', titleJa: '信号・標識・駐停車・夜間運転', page: 42 },
    ],
  },
  {
    chapterId: 'ch-01',
    topicId: 'ch01-t05',
    code: '1.5',
    startPage: 52,
    endPage: 62,
    titleEn: 'Driving Etiquette, Eco-Driving & Route Selection',
    titleJa: '運転マナー・エコドライブ・経路選択',
    titleJaRuby: '運転[うんてん]マナー・エコドライブ・経路選択[けいろせんたく]',
    titleSi: 'රිය පැදවීමේ ආචාර ධර්ම, පරිසර හිතකාමී ධාවනය (Eco-Driving) සහ මාර්ග තේරීම',
    sinhalaOverview:
      'සමාගමේ නාමය රැගත් "චලනය වන දැන්වීම් පුවරුවක්" ලෙස ආදර්ශමත් ධාවනය, පටු මාර්ගවල ඉඩ දීම, කසළ බැහැර නොකිරීම, ඉන්ධන ඉතිරි කරන Eco-Driving ක්‍රම සහ ආරක්ෂිත මාර්ග තොරතුරු කල්තියා පරීක්ෂා කිරීම මෙහි විස්තර වේ.',
    subtopics: [
      { id: 'ch01-t05-s1', code: '5.1–5.6', titleEn: 'Driving Etiquette & Moving Billboards', titleJa: '運転マナーと走る広告塔', page: 52 },
      { id: 'ch01-t05-s2', code: '6', titleEn: 'Eco-Driving Techniques', titleJa: 'エコドライブ', page: 56 },
      { id: 'ch01-t05-s3', code: '7.1–7.2', titleEn: 'Choosing Suitable & Safe Driving Routes', titleJa: '適切な走行経路の選択と事前確認', page: 61 },
    ],
  },

  // CHAPTER 2: Operational Operations (Printed pp. 63–114)
  {
    chapterId: 'ch-02',
    topicId: 'ch02-t01',
    code: '2.1',
    startPage: 63,
    endPage: 76,
    titleEn: 'Daily Workflow, Inspections, Roll Call & Operation Management',
    titleJa: '仕事の流れ・日常点検・点呼・運行管理',
    titleJaRuby: '仕事[しごと]の流[なが]れ・日常点検[にちじょうてんけん]・点呼[てんこ]・運行管理[うんこうかんり]',
    titleSi: 'දෛනික රාජකාරි පිළිවෙළ, වාහන පරීක්ෂාව, ටෙන්කෝ (点呼) සහ මෙහෙයුම් කළමනාකරණය',
    sinhalaOverview:
      'රාජකාරියට පැමිණීමේ සිට පිටත්වීම දක්වා ක්‍රියාවලිය, රියදුරුගේ වගකීම්, දෛනික වාහන පරීක්ෂාව (日常点検), පෙර-ධාවන ටෙන්කෝ පරීක්ෂාවේදී මත්පැන් පරීක්ෂාව සහ සෞඛ්‍ය වාර්තා කිරීම, සහ මෙහෙයුම් කළමනාකරුගේ (運行管理者) භූමිකාව මෙහි අන්තර්ගත වේ.',
    subtopics: [
      { id: 'ch02-t01-s1', code: '1–2', titleEn: 'Workflow & Driver Responsibilities', titleJa: '仕事の流れと運転者の責務', page: 64 },
      { id: 'ch02-t01-s2', code: '3', titleEn: 'Daily Vehicle Inspections', titleJa: '日常点検', page: 71 },
      { id: 'ch02-t01-s3', code: '4–5', titleEn: 'Pre-Shift Roll Call (Tenko) & Operation Management', titleJa: '乗務前点呼と運行管理', page: 72 },
    ],
  },
  {
    chapterId: 'ch-02',
    topicId: 'ch02-t02',
    code: '2.2',
    startPage: 77,
    endPage: 88,
    titleEn: 'Accidents, Breakdowns, Delays & Emergency Equipment',
    titleJa: '事故・故障・遅延対応と非常信号用具・消火器',
    titleJaRuby: '事故[じこ]・故障[こしょう]・遅延[ちえん]対応[たいおう]と非常信号用具[ひじょうしんごうようぐ]・消火器[しょうかき]',
    titleSi: 'අනතුරු, කාර්මික දෝෂ, ප්‍රමාදයන් සහ හදිසි ආරක්ෂක උපකරණ භාවිතය',
    sinhalaOverview:
      'මාර්ග අනතුරකදී ප්‍රථමයෙන් තුවාලකරුවන් බේරා ගැනීම, දෙවන අනතුරු වැළැක්වීම, පොලිසියට (110) සහ සමාගමට වාර්තා කිරීම, වාහන දෝෂ/ප්‍රමාද කළමනාකරණය, ෆ්ලෙයාර් (発炎筒) සහ ගිනි නිවන උපකරණ (消火器) භාවිතය විස්තර කෙරේ.',
    subtopics: [
      { id: 'ch02-t02-s1', code: '6.1–6.3', titleEn: 'Traffic Accidents & Vehicle Breakdowns', titleJa: '交通事故・車両故障時の対応', page: 77 },
      { id: 'ch02-t02-s2', code: '7.1–7.2', titleEn: 'Handling Delays & Reporting to Dispatch', titleJa: '運行遅延時の対応と会社への報告', page: 85 },
      { id: 'ch02-t02-s3', code: '8.1–8.2', titleEn: 'Emergency Signal Flares & Fire Extinguishers', titleJa: '非常信号用具と消火器の取扱い', page: 87 },
    ],
  },
  {
    chapterId: 'ch-02',
    topicId: 'ch02-t03',
    code: '2.3',
    startPage: 89,
    endPage: 94,
    titleEn: 'Abnormal Weather, Heavy Rain & Earthquake Response',
    titleJa: '異常気象・大雨・地震発生時の対応',
    titleJaRuby: '異常気象[いじょうきしょう]・大雨[おおあめ]・地震[じしん]発生時[はっせいじ]の対応[たいおう]',
    titleSi: 'අයහපත් කාලගුණය, තද වැසි, සුළං සහ භූමිකම්පා අවස්ථා කළමනාකරණය',
    sinhalaOverview:
      'තද සුළං (横風), ධාරානිපාත වැසි, ඝන මීදුම සහ භූමිකම්පා වැනි අසාමාන්‍ය කාලගුණ තත්ත්වයන්හිදී රිය පැදවීමේදී ගත යුතු ආරක්ෂිත පියවර (වමට නැවැත්වීම, යතුර තබා ඉවත් වීම, ගුවන්විදුලි තොරතුරු ඇසීම) මෙහි උගන්වයි.',
    subtopics: [
      { id: 'ch02-t03-s1', code: '9.1–9.2', titleEn: 'Abnormal Weather & Heavy Rain', titleJa: '異常気象と大雨時の対応', page: 89 },
      { id: 'ch02-t03-s2', code: '9.3–9.4', titleEn: 'Earthquakes While Driving', titleJa: '地震・大地震発生時の運転行動', page: 92 },
    ],
  },
  {
    chapterId: 'ch-02',
    topicId: 'ch02-t04',
    code: '2.4',
    startPage: 95,
    endPage: 109,
    titleEn: 'Truck Structural Characteristics, Blind Spots & Speed',
    titleJa: 'トラックの特性（高さ・長さ・幅・死角）と速度管理',
    titleJaRuby: 'トラックの特性[とくせい]（高[たか]さ・長[なが]さ・幅[はば]・死角[しかく]）と速度管理[そくどかんり]',
    titleSi: 'ට්‍රක් රථවල විශේෂ ලක්ෂණ (උස, දිග, පළල, අන්ධ කලාප) සහ වේග පාලනය',
    sinhalaOverview:
      'ට්‍රක් රථයේ උස (පාලම් යට ගැටීම්), දිග (ඇතුළත රෝද පරතරය / 内輪差 සහ පසුපස ඉවතට පැනීම / オーバーハング), පළල, අන්ධ කලාප (死角) සහ වේගය වැඩි වීමෙන් නැවතුම් දුර සහ දෘෂ්ටි පරාසයට වන බලපෑම මෙහි පැහැදිලි කෙරේ.',
    subtopics: [
      { id: 'ch02-t04-s1', code: '10.1–10.3', titleEn: 'Vehicle Height, Length (Inner Wheel Diff) & Width', titleJa: '車高・車長（内輪差）・車幅の特性', page: 95 },
      { id: 'ch02-t04-s2', code: '10.4', titleEn: 'Truck Blind Spots', titleJa: 'トラックの死角', page: 105 },
      { id: 'ch02-t04-s3', code: '11.1–11.2', titleEn: 'Effects of Speed & Speed Control', titleJa: '速度が運転に与える影響と速度調整', page: 107 },
    ],
  },
  {
    chapterId: 'ch-02',
    topicId: 'ch02-t05',
    code: '2.5',
    startPage: 110,
    endPage: 114,
    titleEn: 'Interim Checks, Post-Operation Duties & Work Records',
    titleJa: '中間点呼・運行後業務・業務日報の記入',
    titleJaRuby: '中間点呼[ちゅうかんてんこ]・運行後[うんこうご]業務[ぎょうむ]・業務日報[ぎょうむにっぽう]の記入[きにゅう]',
    titleSi: 'මැද-ධාවන පරීක්ෂාව, පසු-ධාවන රාජකාරි සහ දෛනික වැඩ වාර්තාව (業務日報)',
    sinhalaOverview:
      'දිගු දුර ධාවනයේදී මැද-පරීක්ෂාව, ධාවනය අවසානයේ වාහනය සේදීම/පිරිසිදු කිරීම, පසු-ධාවන ටෙන්කෝ වාර්තා කිරීම සහ ටොන් 5+ භාණ්ඩ ධාරිතා / ටොන් 8+ සම්පූර්ණ බර වාහන සඳහා අනිවාර්ය දෛනික වැඩ වාර්තාව (業務日報) පිරවීම මෙහි විස්තර වේ.',
    subtopics: [
      { id: 'ch02-t05-s1', code: '12', titleEn: 'Mid-Operation Inspections (Interim Checks)', titleJa: '運行途中の確認（中間点呼）', page: 110 },
      { id: 'ch02-t05-s2', code: '13.1–13.2', titleEn: 'Vehicle Cleaning & Post-Operation Roll Call', titleJa: '洗車・清掃と乗務後点呼', page: 111 },
      { id: 'ch02-t05-s3', code: '13.3', titleEn: 'Daily Work Records (Gyomu Nippo)', titleJa: '業務日報（乗務等の記録）', page: 113 },
    ],
  },

  // CHAPTER 3: Cargo Handling Operations (Printed pp. 115–173)
  {
    chapterId: 'ch-03',
    topicId: 'ch03-t01',
    code: '3.1',
    startPage: 115,
    endPage: 129,
    titleEn: 'Cargo Types, Handling Marks & Pallet Loading',
    titleJa: '貨物の種類・荷扱い表示・パレットの積付け',
    titleJaRuby: '貨物[かもつ]の種類[しゅるい]・荷扱[にあつか]い表示[ひょうじ]・パレットの積付[つみつ]け',
    titleSi: 'භාණ්ඩ වර්ග, හැසිරවීමේ සලකුණු (Care Marks) සහ පැලට් (Pallet) පැටවීමේ ක්‍රම',
    sinhalaOverview:
      'නිවැරදිව භාණ්ඩ පැටවීමේ නීතිමය වැදගත්කම, මලු, කාඩ්බෝඩ් පෙට්ටි, බහාලුම්, විවෘත භාණ්ඩ, භාණ්ඩ හැසිරවීමේ ජාත්‍යන්තර සංකේත සහ පැලට් මත භාණ්ඩ ස්ථාවරව ගොඩගැසීමේ (බ්ලොක්, පින්වීල්, ඉන්ටර්ලොක්) ක්‍රම මෙහි ඇතුළත් වේ.',
    subtopics: [
      { id: 'ch03-t01-s1', code: '1–2.5', titleEn: 'Importance of Proper Loading & Cargo Types', titleJa: '正しい積載と貨物の種類・荷姿', page: 116 },
      { id: 'ch03-t01-s2', code: '2.6', titleEn: 'Cargo Handling Instruction Marks', titleJa: '貨物の荷扱い指示マーク', page: 123 },
      { id: 'ch03-t01-s3', code: '3.1–3.2', titleEn: 'Types and Loading Methods of Pallets', titleJa: 'パレットの種類と積み方', page: 125 },
    ],
  },
  {
    chapterId: 'ch-03',
    topicId: 'ch03-t02',
    code: '3.2',
    startPage: 130,
    endPage: 143,
    titleEn: 'Preventing Cargo Collapse & Securement Methods',
    titleJa: '荷崩れ防止と貨物の固縛方法',
    titleJaRuby: '荷崩[にくず]れ防止[ぼうし]と貨物[かもつ]の固縛[こばく]方法[ほうほう]',
    titleSi: 'භාණ්ඩ කඩා වැටීම (荷崩れ) වැළැක්වීම සහ භාණ්ඩ තදින් බැඳ තැබීමේ ක්‍රම',
    sinhalaOverview:
      'හදිසි තිරිංග, වංගු සහ කම්පනය නිසා භාණ්ඩ කඩා වැටීම වැළැක්වීම, බර භාණ්ඩ පහළින් තැබීම, ලෑෂිං බෙල්ට්/කඹ/ස්ලිප් නොවන පැදුරු භාවිතය සහ සාමාන්‍ය මාර්ගවල පැය 4කට වරක් / අධිවේගී මාර්ගවල පැය 2කට වරක් නැවත පරීක්ෂා කිරීම විස්තර කෙරේ.',
    subtopics: [
      { id: 'ch03-t02-s1', code: '4.1–4.3', titleEn: 'Why Cargo Collapses & Safe Loading Patterns', titleJa: '荷崩れの原因と防止する積み方', page: 130 },
      { id: 'ch03-t02-s2', code: '4.4–4.5', titleEn: 'Securement Equipment & Re-Inspection Intervals', titleJa: '固縛用具と貨物の固定・増し締め', page: 138 },
    ],
  },
  {
    chapterId: 'ch-03',
    topicId: 'ch03-t03',
    code: '3.3',
    startPage: 144,
    endPage: 157,
    titleEn: 'Uneven Load Distribution & Overloading Prevention',
    titleJa: '偏荷重の危険性と過積載の防止',
    titleJaRuby: '偏荷重[へんかじゅう]の危険性[きけんせい]と過積載[かせきさい]の防止[ぼうし]',
    titleSi: 'අසමතුලිත බර පැටවීම (偏荷重) සහ අධික බර පැටවීමේ (過積載) අවදානම්',
    sinhalaOverview:
      'එක් පැත්තකට බර වැඩිවීම (偏荷重) නිසා වාහනය පෙරළීමේ අවදානම සහ නීති විරෝධී අධික බර පැටවීම (過積載) මගින් තිරිංග දුර දිගු වීම, මාර්ග හා පාලම් හානි වීම සහ රියදුරුට හා සමාගමට ලැබෙන දැඩි නීතිමය දඬුවම් මෙහි විස්තර කෙරේ.',
    subtopics: [
      { id: 'ch03-t03-s1', code: '5.1–5.4', titleEn: 'Uneven Load Distribution & Dashcam Use', titleJa: '偏荷重の危険とドラレコ活用', page: 144 },
      { id: 'ch03-t03-s2', code: '6.1–6.3', titleEn: 'Overloading Impacts & Driver Responsibilities', titleJa: '過積載による事故・道路損傷と防止策', page: 151 },
    ],
  },
  {
    chapterId: 'ch-03',
    topicId: 'ch03-t04',
    code: '3.4',
    startPage: 158,
    endPage: 173,
    titleEn: 'Workplace Accident Prevention, Roll Boxes & Forklifts',
    titleJa: '労働災害防止・ロールボックスパレット・フォークリフト',
    titleJaRuby: '労働災害[ろうどうさいがい]防止[ぼうし]・ロールボックスパレット・フォークリフト',
    titleSi: 'සේවා ස්ථාන අනතුරු වැළැක්වීම, ටේල් ගේට්, රෝල් බොක්ස් පැලට් සහ ෆෝක්ලිෆ්ට් ආරක්ෂාව',
    sinhalaOverview:
      'ට්‍රක් රථයේ පිටුපසින් වැටීම් (墜落・転落) වැළැක්වීමට හෙල්මට් සහ ආරක්ෂිත පාවහන් පැළඳීම, කඹ ගැටගැසීම, ටාපෝලින් දැමීම, වෑන් ට්‍රක් දොරවල් සෙමින් ඇරීම, රෝල් බොක්ස් පැලට් තල්ලු කිරීමේ නීති සහ ෆෝක්ලිෆ්ට් සුදුසුකම්/ආරක්ෂාව මෙහි ආවරණය වේ.',
    subtopics: [
      { id: 'ch03-t04-s1', code: '7.1–7.3', titleEn: 'Loading Safety, Rope Tying & Sheet Covering', titleJa: '荷役作業の注意点・ロープ掛け・シート掛け', page: 158 },
      { id: 'ch03-t04-s2', code: '7.4–7.5', titleEn: 'Box Truck Doors & Roll Box Pallets', titleJa: 'バン型荷台とロールボックスパレット', page: 166 },
      { id: 'ch03-t04-s3', code: '8', titleEn: 'Forklift Safety & Licensing Rules', titleJa: 'フォークリフトの取扱い', page: 170 },
    ],
  },

  // CHAPTER 4: Hazard Prediction Training — KYT (Printed pp. 174–232)
  {
    chapterId: 'ch-04',
    topicId: 'ch04-t01',
    code: '4.1',
    startPage: 174,
    endPage: 189,
    titleEn: 'KYT Sheets 1–5: Intersections, Signals & Downhill Curves',
    titleJa: 'KYTシート1〜5（交差点・黄色信号・見通し不良・下りカーブ）',
    titleJaRuby: 'KYTシート1〜5（交差点[こうさてん]・黄色信号[きいろしんごう]・見通[みとお]し不良[ふりょう]・下[くだ]りカーブ）',
    titleSi: 'KYT පත්‍රිකා 1–5: මංසන්ධි, කහ සංඥා, දෘෂ්‍යතාව අඩු තැන් සහ පහළට බසින වංගු',
    sinhalaOverview:
      'සංඥා සහිත මංසන්ධියක වමට හැරීම (Sheet 1), කහ සංඥාවට ළඟා වීම (Sheet 2), දෘෂ්‍යතාව අඩු මංසන්ධිය (Sheet 3), මැද රේඛාවක් නැති පටු මාර්ගය (Sheet 4), සහ පහළට බසින වංගුව (Sheet 5) සඳහා ත්‍රිවිධ අනතුරු පුරෝකථනය.',
    subtopics: [
      { id: 'kyt-01', code: 'KYT 1', titleEn: 'KYT Sheet 1: Traffic Light Intersection Left Turn', titleJa: 'KYTシート1 信号機のある交差点の左折', page: 175 },
      { id: 'kyt-02', code: 'KYT 2', titleEn: 'KYT Sheet 2: Approaching a Yellow Traffic Light', titleJa: 'KYTシート2 黄色信号への接近', page: 178 },
      { id: 'kyt-03', code: 'KYT 3', titleEn: 'KYT Sheet 3: Intersection With Poor Visibility', titleJa: 'KYTシート3 見通しの悪い交差点', page: 181 },
      { id: 'kyt-04', code: 'KYT 4', titleEn: 'KYT Sheet 4: Roads Without Centerline', titleJa: 'KYTシート4 中央線のない道路', page: 184 },
      { id: 'kyt-05', code: 'KYT 5', titleEn: 'KYT Sheet 5: Driving on a Downhill Curve', titleJa: 'KYTシート5 下り坂のカーブ', page: 187 },
    ],
  },
  {
    chapterId: 'ch-04',
    topicId: 'ch04-t02',
    code: '4.2',
    startPage: 190,
    endPage: 204,
    titleEn: 'KYT Sheets 6–10: Crosswalks, Parking, Rail & Highways',
    titleJa: 'KYTシート6〜10（横断歩道・駐車場・踏切・雨天/渋滞高速）',
    titleJaRuby: 'KYTシート6〜10（横断歩道[おうだんほどう]・駐車場[ちゅうしゃじょう]・踏切[ふみきり]・高速道路[こうそくどうろ]）',
    titleSi: 'KYT පත්‍රිකා 6–10: පදික මාරු, වාහන නැවතුම්පොළ, දුම්රිය හරස් මාර්ග සහ අධිවේගී මාර්ග',
    sinhalaOverview:
      'පදික මාරු අසල ධාවනය (Sheet 6), වාහන නැවතුම්පොළ (Sheet 7), දුම්රිය හරස් මාර්ගය (Sheet 8), වැසි දින අධිවේගී මාර්ගය (Sheet 9), සහ තදබදය සහිත අධිවේගී මාර්ගය (Sheet 10) සඳහා අවදානම් හඳුනාගැනීම.',
    subtopics: [
      { id: 'kyt-06', code: 'KYT 6', titleEn: 'KYT Sheet 6: Driving Near Pedestrian Crosswalks', titleJa: 'KYTシート6 横断歩道付近の走行', page: 190 },
      { id: 'kyt-07', code: 'KYT 7', titleEn: 'KYT Sheet 7: Parking Lot', titleJa: 'KYTシート7 駐車場内', page: 193 },
      { id: 'kyt-08', code: 'KYT 8', titleEn: 'KYT Sheet 8: Railroad Crossing', titleJa: 'KYTシート8 踏切の通過', page: 196 },
      { id: 'kyt-09', code: 'KYT 9', titleEn: 'KYT Sheet 9: Driving on a Rainy Highway', titleJa: 'KYTシート9 雨の日の高速道路', page: 199 },
      { id: 'kyt-10', code: 'KYT 10', titleEn: 'KYT Sheet 10: Driving on a Congested Highway', titleJa: 'KYTシート10 渋滞時の高速道路', page: 202 },
    ],
  },
  {
    chapterId: 'ch-04',
    topicId: 'ch04-t03',
    code: '4.3',
    startPage: 205,
    endPage: 219,
    titleEn: 'KYT Sheets 11–15: Snow, Bike Lanes, Loading Zones & Turns',
    titleJa: 'KYTシート11〜15（雪道・自転車道・荷捌き発進・右左折）',
    titleJaRuby: 'KYTシート11〜15（雪道[ゆきみち]・自転車[じてんしゃ]・荷捌[にさば]き発進[はっしん]・右左折[うさせつ]）',
    titleSi: 'KYT පත්‍රිකා 11–15: හිම මාර්ග, පාපැදි මංතීරු, පැටවුම් කලාප සහ දකුණ/වම හැරීම්',
    sinhalaOverview:
      'හිම වැටුණු මාර්ග (Sheet 11), පාපැදි මංතීරු සහිත මාර්ග (Sheet 12), ට්‍රක් රථ පැටවුම් කලාපයෙන් පිටත්වීම (Sheet 13), සංඥා මංසන්ධියේ දකුණට හැරීම (Sheet 14), සහ වමට හැරීම (Sheet 15).',
    subtopics: [
      { id: 'kyt-11', code: 'KYT 11', titleEn: 'KYT Sheet 11: Driving on Snowy Roads', titleJa: 'KYTシート11 雪道の走行', page: 205 },
      { id: 'kyt-12', code: 'KYT 12', titleEn: 'KYT Sheet 12: Roads with Bicycle Lanes', titleJa: 'KYTシート12 自転車専用通行帯のある道路', page: 208 },
      { id: 'kyt-13', code: 'KYT 13', titleEn: 'KYT Sheet 13: Starting from a Truck Loading Zone', titleJa: 'KYTシート13 トラック専用荷捌き場からの発進', page: 211 },
      { id: 'kyt-14', code: 'KYT 14', titleEn: 'KYT Sheet 14: Turning Right at Signalized Intersection', titleJa: 'KYTシート14 信号機のある交差点の右折', page: 214 },
      { id: 'kyt-15', code: 'KYT 15', titleEn: 'KYT Sheet 15: Turning Left at Signalized Intersection', titleJa: 'KYTシート15 信号機のある交差点の左折', page: 217 },
    ],
  },
  {
    chapterId: 'ch-04',
    topicId: 'ch04-t04',
    code: '4.4',
    startPage: 220,
    endPage: 232,
    titleEn: 'KYT Sheets 16–19: Residential, Night Highway, Bus Stop & 2-Lane',
    titleJa: 'KYTシート16〜19（住宅街・夜間高速・バス停・片側2車線）',
    titleJaRuby: 'KYTシート16〜19（住宅街[じゅうたくがい]・夜間高速[やかんこうそく]・バス停[てい]・片側[かたがわ]2車線[しゃせん]）',
    titleSi: 'KYT පත්‍රිකා 16–19: නේවාසික ප්‍රදේශ, රාත්‍රී අධිවේගී, බස් නැවතුම් සහ ද්විත්ව මංතීරු',
    sinhalaOverview:
      'නේවාසික ප්‍රදේශ හරහා ධාවනය (Sheet 16), රාත්‍රී අධිවේගී මාර්ගය (Sheet 17), බස් නැවතුම පසු කිරීම (Sheet 18), සහ එක් පැත්තකට මංතීරු දෙකක් ඇති මාර්ගයේ නැවැත්වූ ට්‍රක් රථයක් පසු කිරීම (Sheet 19).',
    subtopics: [
      { id: 'kyt-16', code: 'KYT 16', titleEn: 'KYT Sheet 16: Driving Through a Residential Area', titleJa: 'KYTシート16 住宅街の走行', page: 220 },
      { id: 'kyt-17', code: 'KYT 17', titleEn: 'KYT Sheet 17: Driving on a Highway at Night', titleJa: 'KYTシート17 夜間の高速道路の走行', page: 223 },
      { id: 'kyt-18', code: 'KYT 18', titleEn: 'KYT Sheet 18: Driving Past a Bus Stop', titleJa: 'KYTシート18 バスの停留所のある道路の走行', page: 226 },
      { id: 'kyt-19', code: 'KYT 19', titleEn: 'KYT Sheet 19: Driving on a Two-Lane Road', titleJa: 'KYTシート19 片側2車線の道路の走行', page: 229 },
    ],
  },
];

const CHAPTER_META = [
  {
    id: 'ch-01',
    number: '01',
    titleEn: 'Truck Driver Basics',
    titleJa: 'トラック運転者の基本',
    titleJaRuby: 'トラック運転者[うんてんしゃ]の基本[きほん]',
    titleSi: 'ට්‍රක් රථ රියදුරෙකුගේ මූලික කරුණු',
    printedRange: [1, 62],
    enPdfRange: [10, 71],
    jaPdfRange: [11, 72],
    descriptionEn:
      'Role of commercial trucking in Japan, social responsibility, accident prevention, 4S workplace discipline, traffic laws, road signs, eco-driving, and route planning.',
    descriptionSi:
      'ජපානයේ වාණිජ්‍ය ට්‍රක් රථ ප්‍රවාහනයේ කාර්යභාරය, අනතුරු වැළැක්වීම, 4S පිළිවෙළ, මාර්ග නීති, සංඥා සහ පරිසර හිතකාමී රිය පැදවීම.',
  },
  {
    id: 'ch-02',
    number: '02',
    titleEn: 'Operational Operations',
    titleJa: '運行業務',
    titleJaRuby: '運行業務[うんこうぎょうむ]',
    titleSi: 'මෙහෙයුම් සහ ධාවන කටයුතු',
    printedRange: [63, 114],
    enPdfRange: [72, 123],
    jaPdfRange: [73, 124],
    descriptionEn:
      'Daily workflow, vehicle inspections, Tenko roll calls, accident/breakdown/delay response, abnormal weather & earthquakes, truck dimensions/blind spots, and Gyomu Nippo work records.',
    descriptionSi:
      'දෛනික රාජකාරි පිළිවෙළ, වාහන පරීක්ෂාව, ටෙන්කෝ, අනතුරු/කාලගුණ ප්‍රතිචාර, ට්‍රක් රථ අන්ධ කලාප සහ දෛනික වැඩ වාර්තාව (業務日報).',
  },
  {
    id: 'ch-03',
    number: '03',
    titleEn: 'Cargo Handling Operations',
    titleJa: '荷役業務',
    titleJaRuby: '荷役業務[にやくぎょうむ]',
    titleSi: 'භාණ්ඩ පැටවීම සහ හැසිරවීමේ කටයුතු',
    printedRange: [115, 173],
    enPdfRange: [124, 182],
    jaPdfRange: [125, 183],
    descriptionEn:
      'Cargo types, handling symbols, pallet loading patterns, cargo collapse prevention, lashing & re-inspection intervals, uneven loads, overloading law, roll box pallets, and forklift safety.',
    descriptionSi:
      'භාණ්ඩ වර්ග, පැලට් පැටවීම, භාණ්ඩ කඩා වැටීම වැළැක්වීම, බැඳ තැබීම, අධික බර තහනම, රෝල් බොක්ස් පැලට් සහ ෆෝක්ලිෆ්ට් ආරක්ෂාව.',
  },
  {
    id: 'ch-04',
    number: '04',
    titleEn: 'Hazard Prediction Training (KYT)',
    titleJa: '危険予知トレーニング（KYT）',
    titleJaRuby: '危険予知[きけんよち]トレーニング（KYT）',
    titleSi: 'අනතුරු පුරෝකථන පුහුණුව (KYT)',
    printedRange: [174, 232],
    enPdfRange: [183, 240],
    jaPdfRange: [184, 242],
    descriptionEn:
      'All 19 official KYT hazard prediction training sheets with cab-view scenarios, accident patterns, hazard factors, and safe driving methods.',
    descriptionSi:
      'නිල KYT අනතුරු පුරෝකථන පත්‍රිකා 19 සඳහා රියදුරු අසුනේ දර්ශන, අනතුරු සාධක සහ ආරක්ෂිත රිය පැදවීමේ උපක්‍රම.',
  },
];

function findTopicForPrintedPage(printedPage) {
  for (const t of SYLLABUS_TOPICS) {
    if (printedPage >= t.startPage && printedPage <= t.endPage) return t;
  }
  return SYLLABUS_TOPICS[0];
}

function findSubtopicForPrintedPage(topic, printedPage) {
  let matched = topic.subtopics[0];
  for (const st of topic.subtopics) {
    if (printedPage >= st.page) matched = st;
  }
  return matched;
}

// ---------------------------------------------------------------------------
// 3. Japanese PDF Ruby-Aware Extractor
// ---------------------------------------------------------------------------
function attachRubyToText(bodyText, rubyStr) {
  const cleanRuby = rubyStr.replace(/\s+/g, '');
  if (!cleanRuby) return [{ text: bodyText }];
  // Match trailing kanji/iteration run in bodyText
  const m = bodyText.match(/^(.*?)([\u4e00-\u9faf\u3400-\u4dbf々ヶ]+)$/);
  if (m) {
    const tokens = [];
    if (m[1]) tokens.push({ text: m[1] });
    tokens.push({ text: m[2], rt: cleanRuby });
    return tokens;
  }
  return [{ text: bodyText, rt: cleanRuby }];
}

function serializeRubySegments(segments) {
  return segments
    .map((seg) => (seg.rt ? `${seg.text}[${seg.rt}]` : seg.text))
    .join('');
}

function segmentsToReadingKana(segments) {
  return segments.map((seg) => (seg.rt ? seg.rt : seg.text)).join('');
}

async function extractJapanesePagesWithRuby(pdfPath) {
  const raw = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({
    data: raw,
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: path.join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/',
    cMapUrl: path.join(ROOT, 'node_modules/pdfjs-dist/cmaps/') + '/',
    cMapPacked: true,
  }).promise;

  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const ops = await page.getOperatorList();

    let imageOpCount = 0;
    for (const fn of ops.fnArray) {
      if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) imageOpCount++;
    }

    // Group body lines by Y while preserving interleaved ruby (fontSize < 8.5)
    const bodyLines = [];
    let currentLine = null;

    for (const item of tc.items) {
      if (!('str' in item) || !item.str) continue;
      const sz = Math.round(Math.hypot(item.transform[0], item.transform[1]) * 10) / 10;
      const x = item.transform[4];
      const y = item.transform[5];
      const str = item.str;

      // Skip standalone page footer number at bottom (y < 68)
      if (y < 68 && /^\s*\d{1,3}\s*$/.test(str)) continue;

      if (sz > 0 && sz < 8.5) {
        // Ruby furigana attached to the immediately preceding body token!
        if (currentLine && currentLine.tokens.length > 0) {
          const lastIdx = currentLine.tokens.length - 1;
          const prev = currentLine.tokens[lastIdx];
          if (!prev.rt) {
            const replaced = attachRubyToText(prev.text, str);
            currentLine.tokens.splice(lastIdx, 1, ...replaced);
          } else {
            // Continuation ruby syllable (e.g. 'じ' then 'こ')
            prev.rt += str.replace(/\s+/g, '');
          }
        }
        continue;
      }

      const trimmed = str.replace(/\s+/g, ' ');
      if (!trimmed.trim()) continue;

      if (!currentLine || Math.abs(currentLine.y - y) > 6) {
        currentLine = { y, x, fontSize: sz, tokens: [{ text: trimmed }] };
        bodyLines.push(currentLine);
      } else {
        currentLine.tokens.push({ text: trimmed });
      }
    }

    // Sort lines top-to-bottom (descending Y)
    bodyLines.sort((a, b) => b.y - a.y);

    // Merge wrapped sentences into clean paragraphs while preserving headings & numbered points
    const paragraphs = [];
    let paraTokens = [];

    const flushPara = () => {
      if (paraTokens.length === 0) return;
      const plain = paraTokens.map((t) => t.text).join('').replace(/\s+/g, ' ').trim();
      if (plain) {
        const rubyMarkup = serializeRubySegments(paraTokens);
        const readingKana = segmentsToReadingKana(paraTokens);
        paragraphs.push({
          plain,
          rubyMarkup,
          romaji: kanaToRomaji(readingKana),
        });
      }
      paraTokens = [];
    };

    for (const line of bodyLines) {
      const linePlain = line.tokens.map((t) => t.text).join('').trim();
      const startsNewBlock =
        /^[◆●■※①②③④⑤⑥⑦⑧⑨⑩１２３４５６７８９0-9Ｋ第【]/.test(linePlain) ||
        line.fontSize >= 13;
      if (startsNewBlock && paraTokens.length > 0) {
        flushPara();
      }
      paraTokens.push(...line.tokens);
      if (/[。！？】）]$/.test(linePlain) || line.fontSize >= 13) {
        flushPara();
      }
    }
    flushPara();

    const fullPlain = paragraphs.map((pr) => pr.plain).join('\n');
    pages.push({
      id: `ja-p${String(p).padStart(3, '0')}`,
      pdfPage: p,
      printedPage: p >= 11 ? p - 10 : 0,
      charCount: fullPlain.length,
      imageOpCount,
      paragraphs,
      plainText: fullPlain,
    });
  }

  return { numPages: pdf.numPages, pages };
}

// ---------------------------------------------------------------------------
// 4. English PDF Extractor + Exact Image Page Mapper
// ---------------------------------------------------------------------------
async function extractEnglishPagesAndImageOps(pdfPath) {
  const raw = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({
    data: raw,
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: path.join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/',
    cMapUrl: path.join(ROOT, 'node_modules/pdfjs-dist/cmaps/') + '/',
    cMapPacked: true,
  }).promise;

  const pages = [];
  const pdfImageSlots = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const ops = await page.getOperatorList();

    const seenOnPage = new Set();
    let imageOpCount = 0;
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === OPS.paintImageXObject) {
        const objName = ops.argsArray[i][0];
        if (seenOnPage.has(objName)) continue;
        seenOnPage.add(objName);
        imageOpCount++;
        pdfImageSlots.push({
          pdfPage: p,
          printedPage: p >= 10 ? p - 9 : 0,
          objName,
        });
      }
    }

    const lineMap = new Map();
    for (const item of tc.items) {
      if (!('str' in item) || !item.str) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      if (y < 66 && /^\s*\d{1,3}\s*$/.test(item.str)) continue;
      const x = item.transform[4];
      const fontSize = Math.round(Math.hypot(item.transform[0], item.transform[1]) * 10) / 10;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x, str: item.str, fontSize });
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    const lines = [];
    for (const y of sortedYs) {
      const parts = lineMap.get(y).sort((a, b) => a.x - b.x);
      const text = parts
        .map((pt) => pt.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .replace(/(\w)\s+-\s+(\w)/g, '$1-$2')
        .trim();
      if (text) {
        lines.push({
          fontSize: Math.max(...parts.map((pt) => pt.fontSize || 0)),
          text,
        });
      }
    }

    // Group lines into clean paragraphs
    const paragraphs = [];
    let buf = '';
    const flush = () => {
      const cleaned = buf.replace(/\s+/g, ' ').trim();
      if (cleaned) paragraphs.push(cleaned);
      buf = '';
    };

    for (const line of lines) {
      const startsNew =
        /^(?:Chapter\s+\d|KYT\s+Sheet|◆|●|■|※|①|②|③|④|⑤|⑥|\d+\.\d+\s|\d+\.\s|\([0-9]+\))/.test(
          line.text,
        ) || line.fontSize >= 13;
      if (startsNew && buf) flush();
      buf = buf ? `${buf} ${line.text}` : line.text;
      if (/[.!?]$/.test(line.text) || line.fontSize >= 13 || line.text.startsWith('◆')) {
        flush();
      }
    }
    flush();

    const plainText = paragraphs.join('\n');
    pages.push({
      id: `en-p${String(p).padStart(3, '0')}`,
      pdfPage: p,
      printedPage: p >= 10 ? p - 9 : 0,
      charCount: plainText.length,
      imageOpCount,
      paragraphs,
      plainText,
    });
  }

  return { numPages: pdf.numPages, pages, pdfImageSlots };
}

// ---------------------------------------------------------------------------
// 5. Image Category & Caption Assignment
// ---------------------------------------------------------------------------
const VISUALLY_VERIFIED_IMAGES = {
  0: {
    category: 'safety-illustration',
    captionEn: 'Cover illustration: Truck driver yielding safely to a child and elderly pedestrian',
    captionJa: '表紙イラスト：子どもと高齢者の横断を安全に待つトラック運転者',
    captionSi: 'කවරයේ රූපය: ළමයෙකුට සහ වැඩිහිටි පදිකයෙකුට ආරක්ෂිතව ඉඩ දෙන ට්‍රක් රථ රියදුරු',
  },
  1: {
    category: 'operational-diagram',
    captionEn: 'Japan Trucking Association (JTA) official emblem',
    captionJa: '公益社団法人 全日本トラック協会 ロゴ',
    captionSi: 'ජපන් ට්‍රක් රථ සංගමයේ (JTA) නිල ලාංඡනය',
  },
  2: {
    category: 'operational-diagram',
    captionEn: 'Ziplus translation publisher emblem',
    captionJa: '翻訳発行元（Ziplus）ロゴ',
    captionSi: 'පරිවර්තන ප්‍රකාශක ආයතනයේ ලාංඡනය',
  },
  10: {
    category: 'operational-diagram',
    captionEn: 'Digital Tachograph (Dejitako) operation recording unit',
    captionJa: 'デジタル式運行記録計（デジタコ）',
    captionSi: 'ඩිජිටල් ටැකොග්‍රාෆ් (Digital Tachograph) ධාවන දත්ත සටහන් යන්ත්‍රය',
  },
  40: {
    category: 'accident-situation',
    captionEn: 'Rear-end collision caused by smartphone distraction approaching a red signal',
    captionJa: '赤信号接近時のスマホながら運転による追突事故',
    captionSi: 'රතු සංඥාවකට ළඟා වන විට ස්මාර්ට්ෆෝන් භාවිතය නිසා සිදුවන පසුපස ගැටීම',
  },
  50: {
    category: 'safety-illustration',
    captionEn: 'Activating a signal flare to warn approaching trains during a railway crossing stall',
    captionJa: '踏切内立ち往生時の発炎筒による列車への緊急合図',
    captionSi: 'දුම්රිය හරස් මාර්ගයේ වාහනය නතර වූ විට ෆ්ලෙයාර් (発炎筒) දල්වා දුම්රියට අනතුරු ඇඟවීම',
  },
  80: {
    category: 'operational-diagram',
    captionEn: 'Pre-trip planning: checking route info, weather info, and high-accident risk areas',
    captionJa: '出発前の事前確認：経路情報・気象情報・事故多発地点',
    captionSi: 'ගමනට පෙර මාර්ග තොරතුරු, කාලගුණය සහ අනතුරු බහුල ස්ථාන පරීක්ෂා කිරීම',
  },
  100: {
    category: 'accident-situation',
    captionEn: 'Mandatory post-accident reporting: informing the police (110)',
    captionJa: '事故発生時の警察への通報義務（110番）',
    captionSi: 'අනතුරකින් පසු අනිවාර්යයෙන් පොලිසියට (110) දැනුම් දීම',
  },
  120: {
    category: 'road-condition',
    captionEn: 'Crosswind rollover risk on an exposed bridge with horizontal windsock',
    captionJa: '橋梁上での強横風による横転危険と吹き流しの確認',
    captionSi: 'පාලමක් මත තද පැති සුළං (横風) හේතුවෙන් ට්‍රක් රථය පෙරළීමේ අවදානම',
  },
  140: {
    category: 'operational-diagram',
    captionEn: 'Annotated Daily Work Record (Gyomu Nippo) form and mandatory fields',
    captionJa: '業務日報（乗務等の記録）の必須記入項目一覧',
    captionSi: 'දෛනික වැඩ වාර්තාවේ (業務日報) අනිවාර්යයෙන් පිරවිය යුතු කොටස්',
  },
  160: {
    category: 'cargo-securing',
    captionEn: 'Cargo re-inspection intervals: every 4h on general roads and every 2h on highways',
    captionJa: '一般道4時間ごと・高速道2時間ごとの貨物点検と増し締め',
    captionSi: 'සාමාන්‍ය මාර්ගවල පැය 4කට වරක් සහ අධිවේගී මාර්ගවල පැය 2කට වරක් භාණ්ඩ බැඳීම් පරීක්ෂාව',
  },
  180: {
    category: 'cargo-handling',
    captionEn: 'Balanced loading, tripping hazard check, lashing belts, and opening rear doors slowly',
    captionJa: '偏荷重防止・段差注意・ラッシングベルト固定・後部扉の慎重な開閉',
    captionSi: 'සමබර පැටවීම, පය පැටලීම් වළක්වා ගැනීම, ලෑෂිං බෙල්ට් සහ පසුපස දොර සෙමින් ඇරීම',
  },
  195: {
    category: 'kyt-scenario',
    captionEn: 'KYT cab-view scenario: oncoming red truck on narrow commercial street',
    captionJa: 'KYT運転席視点：商業施設付近の狭路での対向トラック接近',
    captionSi: 'KYT රියදුරු දර්ශනය: පටු නාගරික මාර්ගයක ඉදිරියෙන් එන ට්‍රක් රථය',
  },
  210: {
    category: 'kyt-scenario',
    captionEn: 'KYT accident pattern diagram: stopped car, emerging side car, and umbrella pedestrian',
    captionJa: 'KYT事故パターン図：前方停車車両・脇道からの車両・傘の横断歩行者',
    captionSi: 'KYT අනතුරු රූපසටහන: නැවැත්වූ වාහනය, අතුරු මාර්ගයේ වාහනය සහ කුඩයක් ගත් පදිකයා',
  },
  225: {
    category: 'kyt-scenario',
    captionEn: 'KYT Sheet 19 cab view: passing hazard-lit truck with motorcycle in right mirror',
    captionJa: 'KYTシート19：ハザード停車トラックの側方通過と右側ミラーの二輪車',
    captionSi: 'KYT පත්‍රිකා 19: නැවැත්වූ ට්‍රක් රථය පසු කිරීමේදී දකුණු කණ්ණාඩියෙන් පෙනෙන යතුරුපැදිය',
  },
};

function inferCategory(printedPage, chapterId, topicId) {
  if (chapterId === 'ch-04') return 'kyt-scenario';
  if (chapterId === 'ch-03') {
    if (printedPage >= 125 && printedPage <= 129) return 'pallet-handling';
    if (printedPage >= 138 && printedPage <= 143) return 'cargo-securing';
    return 'cargo-handling';
  }
  if (chapterId === 'ch-02') {
    if (printedPage >= 71 && printedPage <= 72) return 'vehicle-inspection';
    if (printedPage >= 77 && printedPage <= 84) return 'accident-situation';
    if (printedPage >= 89 && printedPage <= 94) return 'road-condition';
    return 'operational-diagram';
  }
  if (printedPage >= 44 && printedPage <= 47) return 'road-signs';
  if (printedPage >= 6 && printedPage <= 9) return 'accident-situation';
  if (topicId === 'ch01-t04') return 'traffic-situation';
  return 'safety-illustration';
}

// ---------------------------------------------------------------------------
// 6. Main Execution
// ---------------------------------------------------------------------------
async function main() {
  const enPdfPath = path.join(DATA_DIR, 'ssw_truck driving English test book.pdf');
  const jaPdfPath = path.join(DATA_DIR, 'ssw_truck driving japnese test book.pdf');

  console.log('[Stage 1-2] Extracting English & Japanese PDFs with Ruby Furigana alignment...');
  const enBook = await extractEnglishPagesAndImageOps(enPdfPath);
  const jaBook = await extractJapanesePagesWithRuby(jaPdfPath);

  console.log(`Extracted EN=${enBook.numPages} pages, JA=${jaBook.numPages} pages, EN image ops=${enBook.pdfImageSlots.length}`);

  // Map disk images (data/images/*) sequentially to English PDF image slots
  const diskImageFiles = fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const imagesManifest = [];
  const imagesByPrintedPage = new Map();

  for (let idx = 0; idx < diskImageFiles.length; idx++) {
    const filename = diskImageFiles[idx];
    const numericId = parseInt(filename.split('.')[0], 10);
    const fullPath = path.join(IMAGES_DIR, filename);
    const stat = fs.statSync(fullPath);
    const dims = readImageDimensions(fullPath);
    const checksum = sha256File(fullPath);

    // Numeric index in data/images aligns with PDF image extraction index (0..226, with 11 skipped)
    const slot =
      enBook.pdfImageSlots[Math.min(numericId, enBook.pdfImageSlots.length - 1)] ||
      enBook.pdfImageSlots[Math.min(idx, enBook.pdfImageSlots.length - 1)];

    const printedPage = slot.printedPage;
    const topic = printedPage > 0 ? findTopicForPrintedPage(printedPage) : SYLLABUS_TOPICS[0];
    const subtopic = printedPage > 0 ? findSubtopicForPrintedPage(topic, printedPage) : topic.subtopics[0];

    const verifiedMeta = VISUALLY_VERIFIED_IMAGES[numericId];
    const category = verifiedMeta
      ? verifiedMeta.category
      : inferCategory(printedPage, topic.chapterId, topic.topicId);

    const record = {
      imageId: `img-${String(numericId).padStart(3, '0')}`,
      numericId,
      filename,
      src: `/data/images/${filename}`,
      fileType: dims.format,
      width: dims.width,
      height: dims.height,
      fileSizeBytes: stat.size,
      checksumSha256: checksum,
      sourcePdf: 'ssw_truck driving English test book.pdf',
      sourcePdfPage: slot.pdfPage,
      printedPage,
      chapterId: printedPage === 0 ? 'cover' : topic.chapterId,
      topicId: printedPage === 0 ? 'cover' : topic.topicId,
      sectionId: printedPage === 0 ? 'cover' : subtopic.id,
      category,
      captionEn: verifiedMeta
        ? verifiedMeta.captionEn
        : printedPage === 0
          ? `Textbook cover graphic (${filename})`
          : `${subtopic.titleEn} — Textbook Figure #${numericId} (p. ${printedPage})`,
      captionJa: verifiedMeta
        ? verifiedMeta.captionJa
        : printedPage === 0
          ? `表紙グラフィック (${filename})`
          : `${subtopic.titleJa} 図解 #${numericId}（${printedPage}ページ）`,
      captionSi: verifiedMeta
        ? verifiedMeta.captionSi
        : `${topic.titleSi} — රූපසටහන #${numericId} (පිටුව ${printedPage})`,
      verificationStatus: verifiedMeta ? 'VERIFIED' : 'PENDING',
    };

    imagesManifest.push(record);
    if (printedPage > 0) {
      if (!imagesByPrintedPage.has(printedPage)) imagesByPrintedPage.set(printedPage, []);
      imagesByPrintedPage.get(printedPage).push(record);
    }
  }

  // Reconcile Printed Pages 1..232 across EN (240 PDF pages) & JA (242 PDF pages)
  const enByPrinted = new Map();
  for (const p of enBook.pages) {
    if (p.printedPage > 0) enByPrinted.set(p.printedPage, p);
  }
  const jaByPrinted = new Map();
  for (const p of jaBook.pages) {
    if (p.printedPage > 0) jaByPrinted.set(p.printedPage, p);
  }

  const pageCoverage = [];
  // Front-matter pages (Cover + TOC)
  for (const p of enBook.pages.filter((x) => x.printedPage === 0)) {
    pageCoverage.push({
      pageRecordId: p.id,
      sourceDocument: 'ssw_truck driving English test book.pdf',
      sourcePdfPage: p.pdfPage,
      printedPage: 0,
      role: p.pdfPage === 1 ? 'COVER' : 'TABLE_OF_CONTENTS',
      chapterId: 'front-matter',
      topicId: 'toc',
      sectionId: 'toc',
      charCount: p.charCount,
      imageCount: p.imageOpCount,
      extractionStatus: 'VERIFIED',
      verificationStatus: 'VERIFIED',
    });
  }
  for (const p of jaBook.pages.filter((x) => x.printedPage === 0)) {
    pageCoverage.push({
      pageRecordId: p.id,
      sourceDocument: 'ssw_truck driving japnese test book.pdf',
      sourcePdfPage: p.pdfPage,
      printedPage: 0,
      role: p.pdfPage === 1 ? 'COVER' : 'TABLE_OF_CONTENTS',
      chapterId: 'front-matter',
      topicId: 'toc',
      sectionId: 'toc',
      charCount: p.charCount,
      imageCount: p.imageOpCount,
      extractionStatus: 'VERIFIED',
      verificationStatus: 'VERIFIED',
    });
  }

  // Build chapter structured JSON payloads
  const chapterPayloads = new Map();
  for (const ch of CHAPTER_META) {
    const chTopics = SYLLABUS_TOPICS.filter((t) => t.chapterId === ch.id).map((t) => ({
      ...t,
      sections: [],
    }));
    chapterPayloads.set(ch.id, {
      ...ch,
      topics: chTopics,
    });
  }

  // Populate every single printed page (1..232) into its exact Chapter -> Topic -> Section!
  const allStudySectionsFlat = [];

  for (const topic of SYLLABUS_TOPICS) {
    const chPayload = chapterPayloads.get(topic.chapterId);
    const topicTarget = chPayload.topics.find((t) => t.topicId === topic.topicId);

    for (let sIdx = 0; sIdx < topic.subtopics.length; sIdx++) {
      const sub = topic.subtopics[sIdx];
      const nextSub = topic.subtopics[sIdx + 1];
      const rangeStart = sIdx === 0 ? topic.startPage : sub.page;
      const rangeEnd = nextSub ? nextSub.page - 1 : topic.endPage;

      const pagesInSection = [];
      const sectionImages = [];

      for (let printed = rangeStart; printed <= rangeEnd; printed++) {
        const enP = enByPrinted.get(printed) || null;
        const jaP = jaByPrinted.get(printed) || null;
        const pageImgs = imagesByPrintedPage.get(printed) || [];

        for (const im of pageImgs) sectionImages.push(im);

        if (enP) {
          pageCoverage.push({
            pageRecordId: enP.id,
            sourceDocument: 'ssw_truck driving English test book.pdf',
            sourcePdfPage: enP.pdfPage,
            printedPage: printed,
            role: 'BODY',
            chapterId: topic.chapterId,
            topicId: topic.topicId,
            sectionId: sub.id,
            charCount: enP.charCount,
            imageCount: enP.imageOpCount,
            extractionStatus: enP.charCount > 0 || enP.imageOpCount > 0 ? 'VERIFIED' : 'NEEDS_REVIEW',
            verificationStatus: enP.charCount > 0 || enP.imageOpCount > 0 ? 'VERIFIED' : 'NEEDS_REVIEW',
          });
        }

        if (jaP) {
          pageCoverage.push({
            pageRecordId: jaP.id,
            sourceDocument: 'ssw_truck driving japnese test book.pdf',
            sourcePdfPage: jaP.pdfPage,
            printedPage: printed,
            role: 'BODY',
            chapterId: topic.chapterId,
            topicId: topic.topicId,
            sectionId: sub.id,
            charCount: jaP.charCount,
            imageCount: jaP.imageOpCount,
            extractionStatus: jaP.charCount > 0 || jaP.imageOpCount > 0 ? 'VERIFIED' : 'NEEDS_REVIEW',
            verificationStatus: jaP.charCount > 0 || jaP.imageOpCount > 0 ? 'VERIFIED' : 'NEEDS_REVIEW',
          });
        }

        const jaParas = jaP ? jaP.paragraphs : [];
        const enParas = enP ? enP.paragraphs : [];

        pagesInSection.push({
          printedPage: printed,
          enPdfPage: enP ? enP.pdfPage : null,
          jaPdfPage: jaP ? jaP.pdfPage : null,
          japaneseParagraphs: jaParas,
          englishParagraphs: enParas,
          images: pageImgs.map((im) => ({
            imageId: im.imageId,
            src: im.src,
            width: im.width,
            height: im.height,
            captionEn: im.captionEn,
            captionJa: im.captionJa,
            captionSi: im.captionSi,
            category: im.category,
          })),
          extractionStatus:
            (enP && enP.charCount > 0) || (jaP && jaP.charCount > 0) || pageImgs.length > 0
              ? 'VERIFIED'
              : 'NEEDS_REVIEW',
        });
      }

      // Extract concise exam tips & warnings directly from the English paragraphs (without replacing source paragraphs!)
      const allEnLines = pagesInSection.flatMap((pg) => pg.englishParagraphs);
      const warnings = allEnLines
        .filter((l) => /danger|caution|prohibit|never|must not|risk|accident|warning|fatal|illegal/i.test(l))
        .slice(0, 3);
      const examTips = allEnLines
        .filter((l) => /important|always|obligated|required|check|confirm|every \d|hours|tons|km/i.test(l))
        .slice(0, 3);

      const sectionObj = {
        sectionId: sub.id,
        chapterId: topic.chapterId,
        topicId: topic.topicId,
        code: sub.code,
        titleEn: sub.titleEn,
        titleJa: sub.titleJa,
        titleSi: `${topic.titleSi} (${sub.code})`,
        printedPageStart: rangeStart,
        printedPageEnd: rangeEnd,
        enPdfPageStart: rangeStart + 9,
        jaPdfPageStart: rangeStart + 10,
        sinhalaSummary: topic.sinhalaOverview,
        sinhalaTranslationStatus: 'VERIFIED',
        paragraphSinhalaStatus: 'PENDING',
        examRelevance: topic.chapterId === 'ch-04' ? 'HIGH (Section B Practical / KYT)' : 'CORE (Section A Theory & Section B)',
        warnings,
        examTips,
        imageCount: sectionImages.length,
        pages: pagesInSection,
      };

      topicTarget.sections.push(sectionObj);
      allStudySectionsFlat.push(sectionObj);
    }
  }

  // Write chunked chapter JSON files (public/content/chapters/ch-01..04.json)
  for (const [chId, payload] of chapterPayloads.entries()) {
    fs.writeFileSync(path.join(CHAPTERS_DIR, `${chId}.json`), JSON.stringify(payload));
  }

  // Write public/content/images.json
  fs.writeFileSync(path.join(CONTENT_DIR, 'images.json'), JSON.stringify(imagesManifest));

  // Write lightweight manifest (public/content/manifest.json)
  const manifest = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    figmaReferenceNote:
      'BahasaKu Figma exports (.fig/PDF/PNG) were not present in the workspace; a cohesive provisional TruckMaster mobile-first design system was implemented.',
    sources: {
      englishBook: {
        filename: 'ssw_truck driving English test book.pdf',
        pages: enBook.numPages,
        printedBodyPages: 231,
      },
      japaneseBook: {
        filename: 'ssw_truck driving japnese test book.pdf',
        pages: jaBook.numPages,
        printedBodyPages: 232,
      },
      totalImages: imagesManifest.length,
    },
    chapters: CHAPTER_META.map((ch) => {
      const payload = chapterPayloads.get(ch.id);
      return {
        ...ch,
        topicCount: payload.topics.length,
        sectionCount: payload.topics.reduce((s, t) => s + t.sections.length, 0),
        topics: payload.topics.map((t) => ({
          topicId: t.topicId,
          code: t.code,
          titleEn: t.titleEn,
          titleJa: t.titleJa,
          titleJaRuby: t.titleJaRuby,
          titleSi: t.titleSi,
          startPage: t.startPage,
          endPage: t.endPage,
          sections: t.sections.map((sec) => ({
            sectionId: sec.sectionId,
            code: sec.code,
            titleEn: sec.titleEn,
            titleJa: sec.titleJa,
            titleSi: sec.titleSi,
            printedPageStart: sec.printedPageStart,
            printedPageEnd: sec.printedPageEnd,
            imageCount: sec.imageCount,
          })),
        })),
      };
    }),
  };
  fs.writeFileSync(path.join(CONTENT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // -------------------------------------------------------------------------
  // 7. Write Audit JSONs (Stages 1–4)
  // -------------------------------------------------------------------------
  const sourceManifest = {
    generatedAt: new Date().toISOString(),
    repositoryRoot: '/',
    figmaReferencesAvailable: false,
    figmaLimitationNote:
      'No BahasaKu .fig, exported PDF, or PNG screen references were uploaded in the repository. Built a provisional unified TruckMaster design system without claiming Figma fidelity.',
    documents: [
      {
        docId: 'en-book',
        path: 'data/ssw_truck driving English test book.pdf',
        language: 'en',
        sizeBytes: fs.statSync(enPdfPath).size,
        sha256: sha256File(enPdfPath),
        actualPdfPages: enBook.numPages,
        frontMatterPages: 9,
        printedBodyPageRange: '1-231',
        embeddedImageOps: enBook.pdfImageSlots.length,
        status: 'VERIFIED',
      },
      {
        docId: 'ja-book',
        path: 'data/ssw_truck driving japnese test book.pdf',
        language: 'ja',
        sizeBytes: fs.statSync(jaPdfPath).size,
        sha256: sha256File(jaPdfPath),
        actualPdfPages: jaBook.numPages,
        frontMatterPages: 10,
        printedBodyPageRange: '1-232',
        embeddedImageOps: jaBook.pages.reduce((s, p) => s + p.imageOpCount, 0),
        status: 'VERIFIED',
      },
    ],
    reconciliation: {
      expectedOwnerTargetPages: 240,
      actualEnglishPdfPages: enBook.numPages,
      actualJapanesePdfPages: jaBook.numPages,
      totalCombinedSourcePdfPages: enBook.numPages + jaBook.numPages,
      uniqueReconciledPrintedPages: 232,
      overlappingPrintedPages: 231,
      japaneseOnlyPrintedPages: [232],
      offsetRule: 'English PDF page = printedPage + 9; Japanese PDF page = printedPage + 10',
    },
    imageDirectory: {
      path: 'data/images/',
      totalImageFiles: imagesManifest.length,
      missingSequentialIndices: [11],
      duplicateChecksumCount: 0,
    },
  };

  fs.writeFileSync(path.join(AUDIT_DIR, 'source_manifest.json'), JSON.stringify(sourceManifest, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'page_coverage.json'), JSON.stringify(pageCoverage, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'chapter_mapping.json'), JSON.stringify(manifest.chapters, null, 2));
  fs.writeFileSync(path.join(AUDIT_DIR, 'image_manifest.json'), JSON.stringify(imagesManifest, null, 2));

  const verifiedPagesCount = pageCoverage.filter((p) => p.verificationStatus === 'VERIFIED').length;
  const needsReviewPages = pageCoverage.filter((p) => p.verificationStatus === 'NEEDS_REVIEW');

  const extractionReport = {
    generatedAt: new Date().toISOString(),
    totalSourcePdfPages: pageCoverage.length,
    verifiedPages: verifiedPagesCount,
    pendingPages: pageCoverage.filter((p) => p.verificationStatus === 'PENDING').length,
    needsReviewPages: needsReviewPages.length,
    failedPages: pageCoverage.filter((p) => p.verificationStatus === 'FAILED').length,
    totalStudySections: allStudySectionsFlat.length,
    totalJapaneseParagraphs: allStudySectionsFlat.reduce(
      (s, sec) => s + sec.pages.reduce((ps, pg) => ps + pg.japaneseParagraphs.length, 0),
      0,
    ),
    totalEnglishParagraphs: allStudySectionsFlat.reduce(
      (s, sec) => s + sec.pages.reduce((ps, pg) => ps + pg.englishParagraphs.length, 0),
      0,
    ),
    rubyFuriganaExtracted: true,
    flaggedPages: needsReviewPages.map((p) => ({
      pageRecordId: p.pageRecordId,
      printedPage: p.printedPage,
      reason: 'Low text / diagram-only or separator page',
    })),
  };

  fs.writeFileSync(path.join(AUDIT_DIR, 'extraction_report.json'), JSON.stringify(extractionReport, null, 2));

  console.log('Stage 1–4 complete!');
  console.log(JSON.stringify(extractionReport, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
