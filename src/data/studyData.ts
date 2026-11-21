export type LanguageMode = 'en' | 'ja' | 'bilingual';

export interface StudyChapter {
  id: string;
  number: string;
  titleEn: string;
  titleJa: string;
  summaryEn: string;
  summaryJa: string;
  figureSrc: string;
  figureId: number;
  figureCaptionEn: string;
  figureCaptionJa: string;
  keyRules: Array<{
    id: string;
    labelEn: string;
    labelJa: string;
    detailEn: string;
    detailJa: string;
  }>;
  vocabulary: Array<{
    ja: string;
    reading: string;
    en: string;
  }>;
}

export interface PracticeQuestion {
  id: string;
  topicEn: string;
  topicJa: string;
  figureSrc: string;
  figureId: number;
  promptEn: string;
  promptJa: string;
  options: Array<{
    id: string;
    textEn: string;
    textJa: string;
  }>;
  correctOptionId: string;
  explanationEn: string;
  explanationJa: string;
}

export const STUDY_CHAPTERS: StudyChapter[] = [
  {
    id: 'pedestrian-safety',
    number: '01',
    titleEn: 'Defensive Driving & Vulnerable Road Users',
    titleJa: '安全運転と交通弱者の保護',
    summaryEn:
      'Commercial truck drivers sit higher with larger blind spots and longer braking distances. Yielding proactively to children, elderly pedestrians, and cyclists—and eliminating mobile phone distraction—are foundational exam criteria.',
    summaryJa:
      '事業用トラックは死角が大きく制動距離も長いため、子どもや高齢者など交通弱者への思いやり運転と、携帯電話使用の厳禁が試験の基礎となります。',
    figureSrc: '/data/images/0.jpg',
    figureId: 0,
    figureCaptionEn: 'Always stop and yield early when children or elderly pedestrians cross ahead.',
    figureCaptionJa: '子どもや高齢者が横断する際は、手前で確実に停止して進路を譲る。',
    keyRules: [
      {
        id: 'c1-r1',
        labelEn: 'Yield to children and elderly pedestrians',
        labelJa: '子ども・高齢者の優先保護',
        detailEn: 'Children may dart suddenly and elderly pedestrians require longer crossing times. Slow down early and maintain wide lateral clearance.',
        detailJa: '子どもは急な飛び出し、高齢者は横断に時間がかかる特性があります。早めに減速し十分な側方間隔を保ちます。',
      },
      {
        id: 'c1-r2',
        labelEn: 'Zero smartphone handling while driving',
        labelJa: '運転中の携帯電話・スマホ操作の禁止',
        detailEn: 'Even a 2-second glance at a smartphone at 60 km/h covers over 33 meters blind and frequently causes rear-end collisions at signals.',
        detailJa: '時速60kmで2秒間画面を見ると約33m以上無防備に走行することになり、信号待ち車両への追突原因となります。',
      },
      {
        id: 'c1-r3',
        labelEn: 'Monitor digital tachograph alerts',
        labelJa: 'デジタルタコグラフの適正運用',
        detailEn: 'Digital tachographs continuously log speed, braking events, and continuous driving hours to enforce safe commercial operations.',
        detailJa: 'デジタル式運行記録計は速度・急ブレーキ・連続運転時間を記録し、安全運行管理に活用されます。',
      },
    ],
    vocabulary: [
      { ja: '交通弱者', reading: 'こうつうじゃくしゃ', en: 'Vulnerable road users' },
      { ja: '追突事故', reading: 'ついとつじこ', en: 'Rear-end collision' },
      { ja: '運行記録計', reading: 'うんこうきろくけい', en: 'Tachograph / Operation recorder' },
      { ja: '死角', reading: 'しかく', en: 'Blind spot' },
    ],
  },
  {
    id: 'records-management',
    number: '02',
    titleEn: 'Daily Work Records & Pre-Trip Planning',
    titleJa: '業務日報の記入と運行前確認',
    summaryEn:
      'Japanese freight regulations require accurate Daily Work Records (Gyomu Nippo) for vehicles with a maximum payload of 5 tons or gross vehicle weight of 8 tons or more, alongside pre-trip checks of routes, weather, and accident hotspots.',
    summaryJa:
      '最大積載量5トン以上または車両総重量8トン以上の車両では詳細な業務日報の記載が義務付けられており、出発前の経路・気象・危険箇所確認が必須です。',
    figureSrc: '/data/images/140.jpg',
    figureId: 140,
    figureCaptionEn: 'Required entries on the Daily Work Record include driver name, vehicle number, start/end times, rest locations, cargo loading/waiting times, and abnormal delays.',
    figureCaptionJa: '業務日報には運転者名、車両番号、乗務開始・終了地点と時刻、休憩・仮眠地点、荷役・待機時間、事故や著しい遅延を記録します。',
    keyRules: [
      {
        id: 'c2-r1',
        labelEn: 'Mandatory 5t payload / 8t GVW cargo recording',
        labelJa: '5トン以上・総重量8トン以上の積載記録義務',
        detailEn: 'Vehicles with max payload >= 5 tons or GVW >= 8 tons must record cargo weight/count and loading conditions on the work record.',
        detailJa: '最大積載量5トン以上または車両総重量8トン以上の車両では、貨物の重量・個数・積載状況の記載が必要です。',
      },
      {
        id: 'c2-r2',
        labelEn: 'Log cargo waiting, loading, and rest times',
        labelJa: '荷待ち・荷役時間および休憩・睡眠の記録',
        detailEn: 'Record exact times and locations for rest breaks, driver handovers, cargo loading/unloading, waiting periods, and road delays.',
        detailJa: '休憩・睡眠の場所と日時、運転交代、荷役・荷待ち時間、大雨等による著しい遅延の概要を漏れなく記入します。',
      },
      {
        id: 'c2-r3',
        labelEn: 'Check route, weather, and high-risk areas before departure',
        labelJa: '出発前の経路・天候・事故多発地点の確認',
        detailEn: 'Review weather forecasts, road restrictions, and known high-accident risk areas with the operation manager during pre-trip roll call.',
        detailJa: '点呼時に運行管理者と経路情報、気象情報、事故多発地点を事前に確認します。',
      },
    ],
    vocabulary: [
      { ja: '業務日報', reading: 'ぎょうむにっぽう', en: 'Daily Work Record' },
      { ja: '最大積載量', reading: 'さいだいせきさいりょう', en: 'Maximum loading capacity' },
      { ja: '車両総重量', reading: 'しゃりょうそうじゅうりょう', en: 'Gross vehicle weight (GVW)' },
      { ja: '点呼', reading: 'てんこ', en: 'Pre-trip / Post-trip roll call' },
    ],
  },
  {
    id: 'cargo-securement',
    number: '03',
    titleEn: 'Cargo Loading, Securement & Highway Checks',
    titleJa: '貨物の積載・固縛と走行中の点検',
    summaryEn:
      'Improper weight balance or loose lashing straps can trigger rollovers, cargo shifts, or injuries when opening rear doors. Periodic cargo re-inspection intervals differ between general roads and expressways.',
    summaryJa:
      '偏荷重や固縛不足は横転・荷崩れや荷下ろし時の落下事故につながります。一般道路と高速道路で定められた間隔ごとに停止し、荷締め状態を再点検します。',
    figureSrc: '/data/images/160.jpg',
    figureId: 160,
    figureCaptionEn: 'Stop to inspect and resecure cargo every 4 hours on general roads and every 2 hours on highways.',
    figureCaptionJa: '一般道路では4時間ごと、高速道路では2時間ごとに停車して貨物の点検と増し締めを行う。',
    keyRules: [
      {
        id: 'c3-r1',
        labelEn: '4-hour general road / 2-hour highway re-inspection rule',
        labelJa: '一般道4時間・高速道2時間ごとの荷締め点検',
        detailEn: 'Vibration loosens ropes and lashing belts. Pull into a safe parking area every 4 hours on general roads and every 2 hours on expressways.',
        detailJa: '走行振動でロープやベルトが緩むため、一般道は4時間ごと、高速道路は2時間ごとに安全な場所で増し締め点検を行います。',
      },
      {
        id: 'c3-r2',
        labelEn: 'Eliminate gaps and uneven weight distribution',
        labelJa: '隙間・偏荷重の防止とラッシングベルト固定',
        detailEn: 'Load heavy items low and centered without gaps, then secure firmly with lashing belts or tension bars against the cargo rails.',
        detailJa: '重い荷物は低く中央に配置し、隙間を作らないように積載してラッシングベルト等で確実に固縛します。',
      },
      {
        id: 'c3-r3',
        labelEn: 'Open rear cargo doors gradually',
        labelJa: '荷下ろし時の扉の慎重な開閉',
        detailEn: 'Cargo may lean against rear doors during transit. Stand to the side and open doors slowly to avoid falling freight injuries.',
        detailJa: '輸送中に荷崩れして扉に寄りかかっている恐れがあるため、体を避けながら少しずつ慎重に扉を開けます。',
      },
    ],
    vocabulary: [
      { ja: '荷崩れ', reading: 'にくずれ', en: 'Cargo collapse / shift' },
      { ja: '偏荷重', reading: 'へんかじゅう', en: 'Uneven weight distribution' },
      { ja: 'ラッシングベルト', reading: 'らっしんぐべると', en: 'Lashing belt / ratchet strap' },
      { ja: '増し締め', reading: 'ましじめ', en: 'Re-tightening cargo straps' },
    ],
  },
  {
    id: 'weather-emergency',
    number: '04',
    titleEn: 'Crosswinds, Railway Crossings & Accidents',
    titleJa: '強風・踏切故障・交通事故時の対応',
    summaryEn:
      'High-sided box trucks are highly vulnerable to lateral crosswinds on bridges and coastal highways. Knowing exact emergency sequences for railway stalls and traffic collisions prevents secondary disasters.',
    summaryJa:
      '背の高い箱型トラックは橋梁上での横風の影響を強く受けます。また、踏切内での立ち往生や事故発生時は、二次災害を防ぐ迅速な初動対応が求められます。',
    figureSrc: '/data/images/120.jpg',
    figureId: 120,
    figureCaptionEn: 'Watch windsocks on bridges and tunnel exits; sudden crosswinds can overturn high-sided box trucks.',
    figureCaptionJa: '橋の上やトンネル出口では吹き流しを確認し、強風時は十分に減速して横転を防ぐ。',
    keyRules: [
      {
        id: 'c4-r1',
        labelEn: 'Read bridge windsocks and reduce speed in crosswinds',
        labelJa: '吹き流しの確認と横風時の減速',
        detailEn: 'When a windsock extends horizontally, crosswinds exceed 10 m/s. Grip the wheel firmly with both hands and lower speed before entering bridges.',
        detailJa: '吹き流しが真横になびく強風時は、両手でハンドルをしっかり握り、橋梁やトンネル出口の手前から減速します。',
      },
      {
        id: 'c4-r2',
        labelEn: 'Railway crossing stall: press emergency button & light flare',
        labelJa: '踏切内立ち往生時は非常ボタンと発炎筒で列車に知らせる',
        detailEn: 'Immediately press the crossing emergency stop button, ignite the signal flare, or wave smoke/flame to warn approaching trains before evacuating.',
        detailJa: '直ちに踏切の非常ボタンを押し、発炎筒を焚くなどして接近する列車に異常を知らせ、安全に避難します。',
      },
      {
        id: 'c4-r3',
        labelEn: 'Post-accident order: rescue, secure scene, call police (110)',
        labelJa: '事故発生時の救護・危険防止・警察への通報',
        detailEn: 'Stop immediately, aid any injured persons (call 119), prevent secondary accidents, report to the police (110), and notify your company.',
        detailJa: '直ちに停車し、負傷者の救護（119番）、二次事故防止措置を行った上で、必ず警察（110番）および自社へ報告します。',
      },
    ],
    vocabulary: [
      { ja: '横風', reading: 'よこかぜ', en: 'Crosswind' },
      { ja: '吹き流し', reading: 'ふきながし', en: 'Windsock' },
      { ja: '発炎筒', reading: 'はつえんとう', en: 'Emergency signal flare' },
      { ja: '二次事故防止', reading: 'にじじこぼうし', en: 'Secondary accident prevention' },
    ],
  },
  {
    id: 'hazard-prediction',
    number: '05',
    titleEn: 'Hazard Prediction Training (KYT)',
    titleJa: '危険予知トレーニング（KYT）',
    summaryEn:
      'The SSW Truck Driving exam tests real-world situational awareness using cab-view and top-down traffic scenes. Drivers must anticipate hidden motorcycles in side mirrors, emerging vehicles, and obstructed crosswalks.',
    summaryJa:
      '試験では運転席視点や俯瞰図を用いた危険予知（KYT）が出題されます。ミラー内の二輪車、陰からの飛び出し、横断歩道の歩行者など潜在的な危険を予測する力が問われます。',
    figureSrc: '/data/images/225.jpg',
    figureId: 225,
    figureCaptionEn: 'Passing a hazard-lit truck: the pink car ahead signals right while a motorcycle approaches rapidly in your right side mirror.',
    figureCaptionJa: 'ハザード点灯トラックの側方通過：前方の赤車が右へ車線変更しようとしており、右側ミラーには接近するバイクが見える。',
    keyRules: [
      {
        id: 'c5-r1',
        labelEn: 'Check side mirrors for fast motorcycles before lane changes',
        labelJa: '車線変更前のミラー確認と死角の二輪車予測',
        detailEn: 'Before steering right around a stopped delivery truck, check both the adjacent lane and right-side mirror for motorcycles filtering between lanes.',
        detailJa: '停車トラックを追い越す前に、隣接車線の車両だけでなく右側ミラーに映るすり抜け二輪車の接近を確認します。',
      },
      {
        id: 'c5-r2',
        labelEn: 'Anticipate multi-stage intersection hazards',
        labelJa: '交差点付近の連続的な危険予測',
        detailEn: 'A stopped vehicle ahead can mask both a vehicle pulling out from a side street and a pedestrian crossing with an umbrella just beyond.',
        detailJa: '前方の停車車両の陰から脇道の車が出てくる危険や、その先の横断歩道を傘を差した歩行者が渡る危険を連続して予測します。',
      },
      {
        id: 'c5-r3',
        labelEn: 'Watch commercial zones and oncoming wide vehicles',
        labelJa: '商業施設周辺と狭路での大型車すれ違い',
        detailEn: 'Near malls and narrow urban streets, oncoming trucks may encroach on the center line while pedestrians step out near storefronts.',
        detailJa: '商業施設付近の狭い道路では、対向大型車の中央線越えや店舗付近からの歩行者飛び出しに備え徐行します。',
      },
    ],
    vocabulary: [
      { ja: '危険予知', reading: 'きけんよち', en: 'Hazard prediction (KYT)' },
      { ja: '側方通過', reading: 'そくほうつうか', en: 'Passing alongside a vehicle' },
      { ja: '横断歩道', reading: 'おうだんほどう', en: 'Pedestrian crosswalk' },
      { ja: '徐行', reading: 'じょこう', en: 'Slow speed (ready to stop immediately)' },
    ],
  },
];

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    id: 'q1',
    topicEn: 'Cargo Securement',
    topicJa: '貨物点検・固縛',
    figureSrc: '/data/images/160.jpg',
    figureId: 160,
    promptEn:
      'According to the SSW Truck Driving manual, how often must you stop to inspect and resecure cargo on general roads versus highways?',
    promptJa:
      'トラック運行中、一般道路と高速道路ではそれぞれ何時間ごとに停車して貨物の点検・増し締めを行う必要がありますか。',
    options: [
      { id: 'a', textEn: 'Every 6 hours on general roads; every 4 hours on highways', textJa: '一般道は6時間ごと、高速道は4時間ごと' },
      { id: 'b', textEn: 'Every 4 hours on general roads; every 2 hours on highways', textJa: '一般道は4時間ごと、高速道は2時間ごと' },
      { id: 'c', textEn: 'Every 2 hours on general roads; every 4 hours on highways', textJa: '一般道は2時間ごと、高速道は4時間ごと' },
      { id: 'd', textEn: 'Only once before departure and once at the destination', textJa: '出発前と到着後の2回のみ点検すればよい' },
    ],
    correctOptionId: 'b',
    explanationEn:
      'You must stop to inspect and resecure cargo every 4 hours on general roads and every 2 hours on highways, as higher speeds and road vibrations loosen tie-downs faster.',
    explanationJa:
      '一般道路では4時間ごと、高速道路では2時間ごとに停車して貨物の緩みを確認し、増し締めを行う必要があります。',
  },
  {
    id: 'q2',
    topicEn: 'Work Records',
    topicJa: '業務日報',
    figureSrc: '/data/images/140.jpg',
    figureId: 140,
    promptEn:
      'For which trucks is it mandatory to fill out the cargo weight and loading condition columns on the Daily Work Record (Gyomu Nippo)?',
    promptJa:
      '業務日報の貨物重量・積載状況欄の記入が義務付けられている車両の基準はどれですか。',
    options: [
      { id: 'a', textEn: 'Maximum loading capacity of 2 tons or more, or GVW of 4 tons or more', textJa: '最大積載量2トン以上、または車両総重量4トン以上' },
      { id: 'b', textEn: 'Maximum loading capacity of 5 tons or more, or GVW of 8 tons or more', textJa: '最大積載量5トン以上、または車両総重量8トン以上' },
      { id: 'c', textEn: 'Only tractor-trailers exceeding 20 tons gross weight', textJa: '車両総重量20トンを超えるトレーラーのみ' },
      { id: 'd', textEn: 'Only vehicles carrying hazardous chemical cargo', textJa: '危険物を運搬する車両のみ' },
    ],
    correctOptionId: 'b',
    explanationEn:
      'As shown on the official work record guide, vehicles with a maximum loading capacity of 5 tons or more or a gross vehicle weight (GVW) of 8 tons or more must complete the cargo loading fields.',
    explanationJa:
      '最大積載量5トン以上または車両総重量8トン以上の事業用トラックは、業務日報に貨物の積載状況を必ず記入します。',
  },
  {
    id: 'q3',
    topicEn: 'Hazard Prediction (KYT)',
    topicJa: '危険予知（KYT）',
    figureSrc: '/data/images/225.jpg',
    figureId: 225,
    promptEn:
      'In this cab-view scene, a delivery truck is stopped with hazard lights ahead and the pink car signals right. What hidden danger in your right side mirror must you watch for before changing lanes?',
    promptJa:
      '前方の停車トラックを避けるため赤車が右ウインカーを出しています。自車が右へ進路変更する前に右側ミラーで注意すべき危険は何ですか。',
    options: [
      { id: 'a', textEn: 'A motorcycle approaching quickly along the right lane / blind spot', textJa: '右側車線からバイクが接近している' },
      { id: 'b', textEn: 'A pedestrian stepping off the left sidewalk only', textJa: '左歩道からの歩行者のみに注意すればよい' },
      { id: 'c', textEn: 'An emergency train crossing directly behind the truck', textJa: 'トラックのすぐ後ろに踏切がある' },
      { id: 'd', textEn: 'No other vehicles are near the right side, so accelerate immediately', textJa: '右側は空いているため直ちに加速して追い越す' },
    ],
    correctOptionId: 'a',
    explanationEn:
      'Look closely at the right-side mirror: a motorcycle is approaching behind the green car. Wait for the pink car and passing right-lane traffic (including the motorcycle) before changing lanes.',
    explanationJa:
      '右側ミラーに緑色の車の後ろから接近するバイクが映っています。前方の赤車の動きと右側の二輪車・後続車を確実に確認してから進路変更します。',
  },
  {
    id: 'q4',
    topicEn: 'Emergency Response',
    topicJa: '緊急時対応',
    figureSrc: '/data/images/50.jpg',
    figureId: 50,
    promptEn:
      'If your truck breaks down and stalls inside a railway crossing, what is the highest-priority action illustrated here?',
    promptJa:
      '万が一、踏切内でトラックが故障して立ち往生した場合、図のように最優先で行うべき行動はどれですか。',
    options: [
      { id: 'a', textEn: 'Stay inside the cab and call your dispatch office first', textJa: '車内に留まり、まず所属営業所へ電話連絡する' },
      { id: 'b', textEn: 'Press the crossing emergency button and ignite a signal flare to alert approaching trains', textJa: '直ちに非常ボタンを押し、発炎筒等で接近する列車に異常を知らせる' },
      { id: 'c', textEn: 'Unload the cargo onto the tracks to lighten the vehicle', textJa: '車体を軽くするため線路上に荷物を降ろす' },
      { id: 'd', textEn: 'Wait for the crossing gate to rise automatically', textJa: '遮断機が自動で上がるまでそのまま待機する' },
    ],
    correctOptionId: 'b',
    explanationEn:
      'Preventing a train collision is the top priority. Immediately press the crossing emergency stop button, use a smoke/signal flare to alert train operators, and evacuate to safety.',
    explanationJa:
      '列車との衝突を防ぐことが最優先です。直ちに踏切の非常ボタンを押し、発炎筒を焚くなどして列車へ異常を知らせてから安全に避難します。',
  },
  {
    id: 'q5',
    topicEn: 'Cargo Loading',
    topicJa: '荷役作業の安全',
    figureSrc: '/data/images/180.jpg',
    figureId: 180,
    promptEn:
      'When arriving at a delivery site to unload a box truck, why must you open the rear cargo doors gradually?',
    promptJa:
      '荷下ろし時にバン型トラックの後部扉を少しずつ慎重に開けなければならない理由は何ですか。',
    options: [
      { id: 'a', textEn: 'To keep the air conditioning cool inside the cargo box', textJa: '荷室内の空調温度を保つため' },
      { id: 'b', textEn: 'Because shifted cargo may be leaning against the door and fall out suddenly', textJa: '走行中に荷崩れした貨物が扉に寄りかかり、急に落下して事故になる恐れがあるため' },
      { id: 'c', textEn: 'To prevent the digital tachograph from resetting', textJa: 'デジタルタコグラフの記録がリセットされるのを防ぐため' },
      { id: 'd', textEn: 'Only to avoid scratching the hinges', textJa: '蝶番の塗装が傷つくのを防ぐためだけである' },
    ],
    correctOptionId: 'b',
    explanationEn:
      'Freight can shift during transit and press against the rear doors. Opening the doors slowly while standing safely to the side prevents serious injuries from falling cargo.',
    explanationJa:
      '輸送中の振動やブレーキで荷物が扉側に寄りかかっている場合があり、勢いよく開けると荷物が落下して負傷する危険があります。',
  },
  {
    id: 'q6',
    topicEn: 'Adverse Weather',
    topicJa: '気象・強風対策',
    figureSrc: '/data/images/120.jpg',
    figureId: 120,
    promptEn:
      'You are approaching a river bridge and notice the windsock stretched horizontally. What hazard is most critical for a box truck?',
    promptJa:
      '川に架かる橋へ進入する際、吹き流しが真横になびいています。箱型トラックにとって最も警戒すべき危険は何ですか。',
    options: [
      { id: 'a', textEn: 'Lateral crosswinds can push the vehicle off-lane or cause a rollover', textJa: '強い横風にあおられて車線逸脱や横転を起こす危険がある' },
      { id: 'b', textEn: 'Crosswinds improve fuel economy so you should maintain highway speed', textJa: '燃費が向上するため高速のまま一気に渡り切るべきである' },
      { id: 'c', textEn: 'Only empty passenger cars are affected by wind on bridges', textJa: '横風の影響を受けるのは軽自動車のみである' },
      { id: 'd', textEn: 'Shift into neutral while crossing the bridge', textJa: '橋の上ではギアをニュートラルにして惰性走行する' },
    ],
    correctOptionId: 'a',
    explanationEn:
      'Box trucks have large flat side panels that act like sails. Reduce speed before entering exposed bridges, grip the steering wheel firmly, and anticipate sudden gusts.',
    explanationJa:
      '箱型トラックは側面面積が大きく横風を受けやすいため、橋梁進入前に十分減速し、両手でハンドルをしっかり保持します。',
  },
  {
    id: 'q7',
    topicEn: 'Accident Protocol',
    topicJa: '事故発生時の措置',
    figureSrc: '/data/images/100.jpg',
    figureId: 100,
    promptEn:
      'Even if a traffic collision appears minor with only property damage, what legal reporting obligation applies to the driver?',
    promptJa:
      '物損のみの軽微に見える交通事故であっても、運転者に課せられている法的な義務はどれですか。',
    options: [
      { id: 'a', textEn: 'Settle privately with the other driver and skip calling the police', textJa: '相手と示談できれば警察への通報は不要である' },
      { id: 'b', textEn: 'Always report the accident to the police regardless of severity', textJa: '事故の大小にかかわらず、必ず警察へ通報・届出を行う' },
      { id: 'c', textEn: 'Continue delivering the cargo first and report the next day', textJa: '配送を優先し、翌日にまとめて警察へ報告する' },
      { id: 'd', textEn: 'Only report if the repair cost exceeds 500,000 yen', textJa: '修理費が50万円を超える場合のみ通報する' },
    ],
    correctOptionId: 'b',
    explanationEn:
      'Under Japan’s Road Traffic Act, every driver involved in an accident—including minor property damage—must stop, secure safety, aid the injured, and report to the police (110).',
    explanationJa:
      '道路交通法により、負傷者の救護と危険防止措置の後、軽微な物損事故であっても必ず警察へ報告する義務があります。',
  },
  {
    id: 'q8',
    topicEn: 'Hazard Prediction (KYT)',
    topicJa: '危険予知（KYT）',
    figureSrc: '/data/images/210.png',
    figureId: 210,
    promptEn:
      'In this intersection sequence diagram, after avoiding a rear-end collision with the stopped pink car (1), what two subsequent hazards (2 and 3) must you anticipate?',
    promptJa:
      '図の交差点手前で停車車両（1）を認識した後、さらに先で予測すべき2つの危険（2・3）の組み合わせとして正しいものはどれですか。',
    options: [
      { id: 'a', textEn: 'A blue car pulling out from the left side road (2) and an umbrella pedestrian on the crosswalk (3)', textJa: '左脇道から出てくる青い車（2）と、横断歩道を渡る傘の歩行者（3）' },
      { id: 'b', textEn: 'Only oncoming traffic in the far right lane', textJa: '対向車線の車両のみ' },
      { id: 'c', textEn: 'A low overhead bridge clearance sign', textJa: '頭上の高さ制限標識のみ' },
      { id: 'd', textEn: 'None—once the pink car moves, the crosswalk is automatically clear', textJa: '前の車が発進すれば横断歩道は安全なので危険はない' },
    ],
    correctOptionId: 'a',
    explanationEn:
      'The diamond road markings warn of a crosswalk ahead. Anticipate (1) stopping behind the pink car, (2) the blue car emerging from the left side street, and (3) the pedestrian crossing from the right holding an umbrella.',
    explanationJa:
      'ダイヤマークは横断歩道ありの合図です。前方停車車（1）だけでなく、左脇道からの出合い頭（2）と右側から渡る傘の歩行者（3）まで連続して予測します。',
  },
  {
    id: 'q9',
    topicEn: 'Pre-Trip Preparation',
    topicJa: '運行前準備',
    figureSrc: '/data/images/80.jpg',
    figureId: 80,
    promptEn:
      'Which three categories of safety information should be checked before departing on a delivery route?',
    promptJa:
      '出発前の運行確認において、事前に調べて把握しておくべき3つの情報として正しいものはどれですか。',
    options: [
      { id: 'a', textEn: 'Route information, weather information, and high-accident risk areas', textJa: '経路情報、気象情報、事故多発地点（危険箇所）' },
      { id: 'b', textEn: 'Only fuel station prices along the route', textJa: '沿道のガソリン価格のみ' },
      { id: 'c', textEn: 'Social media updates and restaurant reviews', textJa: 'SNSの投稿と飲食店の評判' },
      { id: 'd', textEn: 'None, because GPS navigation handles all hazards automatically', textJa: 'カーナビがあるため事前確認は不要' },
    ],
    correctOptionId: 'a',
    explanationEn:
      'Reviewing route conditions, weather forecasts, and known high-accident risk areas before departure allows drivers to plan safe speeds, detours, and extra vigilance.',
    explanationJa:
      '運行前に「経路情報」「気象情報」「事故多発地点」の3点を把握することで、危険箇所での早めの減速や安全な運行計画が可能になります。',
  },
  {
    id: 'q10',
    topicEn: 'Safe Driving Rules',
    topicJa: '安全運転規則',
    figureSrc: '/data/images/40.jpg',
    figureId: 40,
    promptEn:
      'Why does checking a smartphone while approaching a traffic signal create an especially severe crash risk for commercial trucks?',
    promptJa:
      '信号交差点へ接近中にスマートフォンを見る「ながら運転」が、トラックで特に重大事故につながる理由は何ですか。',
    options: [
      { id: 'a', textEn: 'Delayed recognition combined with heavy vehicle braking distance causes severe rear-end impacts', textJa: '発見の遅れと重い車体の長い制動距離により、信号待ち車両への重大な追突を引き起こすため' },
      { id: 'b', textEn: 'Smartphones interfere electronically with hydraulic brakes', textJa: 'スマホの電波でブレーキが効かなくなるため' },
      { id: 'c', textEn: 'It is permitted as long as the truck is under 40 km/h', textJa: '時速40km以下であれば操作しても問題ない' },
      { id: 'd', textEn: 'It only poses a risk during nighttime driving', textJa: '夜間走行時のみ危険が生じる' },
    ],
    correctOptionId: 'a',
    explanationEn:
      'Looking away from the road delays hazard recognition. Combined with a loaded truck’s momentum and longer stopping distance, even a momentary glance causes devastating rear-end collisions.',
    explanationJa:
      'わき見による認知の遅れに加え、荷物を積んだトラックは制動距離が長いため、一瞬の操作でも前車への重大な追突事故に直結します。',
  },
];
