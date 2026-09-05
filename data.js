// data.js
// reaction_engine.py 의 RULES / MECHANISMS / Compound 를 그대로 JS로 이식.
// RDKit 연동 시: COMPOUNDS 를 SMILES 파싱 결과(flags 자동 판별)로 교체하면 됨.

const COMPOUNDS = [
  {
    id: "hydroxypentanone",
    name: "4-hydroxy-2-pentanone",
    formula: "CC(O)CC(C)=O",
    flags: { alcohol_2: true, ketone: true, alpha_H: true },
  },
  {
    id: "butene",
    name: "2-butene",
    formula: "CC=CC",
    flags: { alkene: true },
  },
  {
    id: "benzoic_acid",
    name: "benzoic acid",
    formula: "c1ccccc1C(=O)O",
    flags: { aromatic_ring: true, carboxylic_acid: true },
  },
];

// condition(flags) -> boolean
const RULES = [
  // ===== 단독 반응 =====
  {
    name: "탈수 반응 (Dehydration)",
    category: "standalone",
    reagent: null,
    condition: (f) => f.alcohol_1 || f.alcohol_2 || f.alcohol_3,
    product: "알켄 + H2O",
    note: "산 촉매는 있으나 소모되지 않으므로 단독으로 분류",
    reason: (f) => "알코올(-OH)기가 없어, 산 촉매가 있어도 물로 이탈할 자리가 없습니다.",
  },
  {
    name: "탈수소화 (Dehydrogenation)",
    category: "standalone",
    reagent: null,
    condition: (f) => f.alcohol_1 || f.alcohol_2 || f.alkane_adjacent_H,
    product: "알켄/카르보닐 + H2",
    note: "촉매(Pt/Pd) 필요하지만 소모성 시약이 아님",
    reason: (f) => "알코올(-OH)이나 탈수소화될 수 있는 인접 C-H 구조가 없어, 촉매(Pt/Pd)가 있어도 H2로 떨어져 나갈 수소 쌍이 없습니다.",
  },
  {
    name: "알돌 축합 (Aldol condensation)",
    category: "standalone",
    reagent: null,
    condition: (f) => (f.aldehyde || f.ketone) && f.alpha_H,
    product: "β-히드록시 카르보닐 → (탈수) α,β-불포화 카르보닐",
    note: "같은 분자 두 개가 반응하는 자기축합",
    reason: (f) => {
      if (!f.aldehyde && !f.ketone) return "카르보닐기(알데히드/케톤)가 없어 엔올(레이트)을 형성할 수 없습니다.";
      return "카르보닐기는 있으나 알파 탄소에 수소가 없어 엔올레이트를 형성할 수 없습니다.";
    },
  },
  {
    name: "클라이젠 축합 (Claisen condensation)",
    category: "standalone",
    reagent: null,
    condition: (f) => f.ester && f.alpha_H,
    product: "β-케토에스테르",
    note: "자기축합",
    reason: (f) => {
      if (!f.ester) return "에스테르기가 없어 클라이젠 축합이 일어날 수 없습니다.";
      return "에스테르는 있으나 알파 탄소에 수소가 없어 엔올레이트를 형성할 수 없습니다.";
    },
  },
  {
    name: "카니자로 반응 (Cannizzaro)",
    category: "standalone",
    reagent: null,
    condition: (f) => f.aldehyde && !f.alpha_H,
    product: "카르복실산 + 알코올 (자기 산화-환원)",
    note: "알파 수소가 없는 알데히드에서만 성립",
    reason: (f) => {
      if (!f.aldehyde) return "알데히드기가 없어 카니자로 반응이 일어날 수 없습니다.";
      return "알데히드는 있으나 알파 수소가 존재해, 자기 산화-환원 대신 알돌 축합이 우세합니다.";
    },
  },
  {
    name: "탈카르복실화 (Decarboxylation)",
    category: "standalone",
    reagent: null,
    condition: (f) => f.carboxylic_acid,
    product: "CO2 이탈 후 알칸/알켄",
    note: "",
    reason: (f) => "카르복실산(-COOH)기가 없어 CO2로 떨어져 나갈 자리가 없습니다.",
  },
  {
    name: "분자내 고리화 (Intramolecular cyclization)",
    category: "standalone",
    reagent: null,
    condition: (f) => (f.alcohol_1 || f.alcohol_2 || f.alcohol_3) && (f.carboxylic_acid || f.ester),
    product: "락톤(고리형 에스테르)",
    note: "OH와 COOH/에스테르가 같은 분자 내 존재해야 함",
    reason: (f) => {
      const hasOH = f.alcohol_1 || f.alcohol_2 || f.alcohol_3;
      const hasAcidOrEster = f.carboxylic_acid || f.ester;
      if (!hasOH && !hasAcidOrEster) return "-OH기와 -COOH/에스테르기가 모두 없어 락톤을 형성할 수 없습니다.";
      if (!hasOH) return "-OH기가 없어 분자 내 고리화(락톤 형성)가 일어날 수 없습니다.";
      return "-COOH 또는 에스테르기가 없어 분자 내 고리화(락톤 형성)가 일어날 수 없습니다.";
    },
  },
  {
    name: "베크만 전위 (Beckmann rearrangement)",
    category: "standalone",
    reagent: null,
    condition: (f) => f.oxime,
    product: "아마이드 (고리 확장 시 락탐)",
    note: "",
    reason: (f) => "옥심(C=N-OH) 작용기가 없어 베크만 전위가 일어날 수 없습니다.",
  },
  {
    name: "호프만 분해 (Hofmann elimination)",
    category: "standalone",
    reagent: null,
    condition: (f) => f.quaternary_ammonium,
    product: "알켄 + 3차 아민",
    note: "",
    reason: (f) => "4차 암모늄 작용기가 없어 호프만 분해가 일어날 수 없습니다.",
  },
  {
    name: "피나콜 재배열 (Pinacol rearrangement)",
    category: "standalone",
    reagent: null,
    condition: (f) => f.vicinal_diol,
    product: "케톤 (골격 재배열)",
    note: "",
    reason: (f) => "서로 인접한 두 개의 -OH(비시날 디올) 구조가 없어 피나콜 재배열이 일어날 수 없습니다.",
  },

  // ===== 시약이 필요한 반응 =====
  {
    name: "마르코니코프 첨가",
    category: "reagent",
    reagent: "HX (예: HBr)",
    condition: (f) => f.alkene,
    product: "할로알칸 (더 치환된 탄소에 X 부착)",
    note: "",
  },
  {
    name: "반마르코니코프 첨가",
    category: "reagent",
    reagent: "HBr + 라디칼 개시제(과산화물)",
    condition: (f) => f.alkene,
    product: "할로알칸 (덜 치환된 탄소에 X 부착)",
    note: "라디칼 조건에서만 성립",
  },
  {
    name: "수화 반응 (Hydration)",
    category: "reagent",
    reagent: "H2O / H3O+",
    condition: (f) => f.alkene,
    product: "알코올",
    note: "마르코니코프 규칙 적용",
  },
  {
    name: "할로겐화 (Halogenation)",
    category: "reagent",
    reagent: "X2 (예: Br2)",
    condition: (f) => f.alkene || f.alkane_adjacent_H || f.aromatic_ring,
    product: "할로알칸 또는 방향족 할로겐화물",
    note: "알켄=첨가, 알칸/방향족=치환으로 메커니즘 상이",
  },
  {
    name: "알코올 산화 (Oxidation)",
    category: "reagent",
    reagent: "PCC / KMnO4 / Na2Cr2O7",
    condition: (f) => f.alcohol_1 || f.alcohol_2,
    product: "1차→알데히드/카르복실산, 2차→케톤",
    note: "3차 알코올은 산화 안 됨",
  },
  {
    name: "카르보닐 환원 (Reduction)",
    category: "reagent",
    reagent: "NaBH4 / LiAlH4",
    condition: (f) => f.aldehyde || f.ketone || f.carboxylic_acid || f.ester,
    product: "알코올",
    note: "",
  },
  {
    name: "친핵성 치환 (SN1/SN2)",
    category: "reagent",
    reagent: "친핵체 (예: NaOH, NaCN)",
    condition: (f) => f.haloalkane,
    product: "치환된 새 작용기 화합물",
    note: "1차=SN2 우세, 3차=SN1 우세",
  },
  {
    name: "제거 반응 (E1/E2)",
    category: "reagent",
    reagent: "염기 (예: NaOEt, KOH)",
    condition: (f) => f.haloalkane,
    product: "알켄 + HX",
    note: "",
  },
  {
    name: "니트로화 (Nitration)",
    category: "reagent",
    reagent: "HNO3 / H2SO4",
    condition: (f) => f.aromatic_ring,
    product: "니트로벤젠 유도체",
    note: "",
  },
  {
    name: "술폰화 (Sulfonation)",
    category: "reagent",
    reagent: "SO3 / H2SO4 (발연황산)",
    condition: (f) => f.aromatic_ring,
    product: "벤젠술폰산 유도체",
    note: "",
  },
  {
    name: "프리델-크래프츠 알킬화/아실화",
    category: "reagent",
    reagent: "RCl 또는 RCOCl + AlCl3",
    condition: (f) => f.aromatic_ring,
    product: "알킬/아실 치환 방향족 화합물",
    note: "고리에 강한 전자끄는기 있으면 반응 안 될 수 있음(간이 엔진 미반영)",
  },
];

// 반응 이름 -> 단계별 [ {title, desc, diagram}, ... ]
// diagram: 전자이동을 곡선 화살표로 표시하는 인라인 SVG. 화살표 꼬리=전자쌍의 출발(끊어지는 결합/비공유
// 전자쌍), 화살표 머리=전자쌍의 도착(새로 생기는 결합/전하). 골격은 var(--ink), 반응에 직접 관여하는
// 핵심 산소는 mech-magenta, 들어오는/두 번째 분자는 mech-blue, 전자이동 화살표는 항상 mech-magenta이며
// 원자 반지름+5px 만큼 띄워서 글자를 가리거나 다른 결합선을 뚫고 지나가지 않도록 함.
const MECHANISMS = {
  "알돌 축합 (Aldol condensation)": [
    {
      title: "1단계: 엔올레이트 형성",
      desc: "염기가 카르보닐 알파 탄소의 H를 떼어가고, 그 전자쌍이 알파 탄소-카르보닐 탄소 사이로 이동해 엔올레이트(또는 엔올)를 형성한다.",
      diagram: `<svg viewBox="0 0 260 145" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="152.2" y1="71" x2="152.2" y2="49"/>
        <line class="mech-bond" x1="147.8" y1="71" x2="147.8" y2="49"/>
        <line class="mech-bond" x1="141.8" y1="83.7" x2="114.2" y2="96.3"/>
        <line class="mech-bond" x1="99.9" y1="93.4" x2="85.4" y2="77.9"/>
        <line class="mech-bond" x1="99.6" y1="106.4" x2="85.8" y2="120.2"/>
        <line class="mech-bond" x1="158.6" y1="82.7" x2="175.6" y2="88.1"/>
        <text class="mech-atom mech-magenta" x="150" y="40" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="150" y="80" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="106" y="100" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="80" y="72" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="78" y="128" text-anchor="middle" dominant-baseline="central">R</text>
        <text class="mech-label-r" x="188" y="92" text-anchor="middle" dominant-baseline="central">R'</text>
        <text class="mech-atom mech-blue" x="46" y="54" text-anchor="middle" dominant-baseline="central">B</text>
        <text class="mech-charge mech-blue" x="58" y="44" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <path class="mech-arrow" d="M58.4,60.6 C62,63 65,64.5 68.5,65.9" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M92.8,95.2 C105,90 118,88 130,89" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M159,63 C170,52 168,36 156,26" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "2단계: 친핵성 공격",
      desc: "엔올레이트의 알파 탄소(친핵체)가 두 번째 카르보닐 분자의 탄소(친전자체)를 공격한다. 카르보닐의 파이 결합 전자쌍은 산소로 이동해 알콕사이드가 된다.",
      diagram: `<svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="28" y1="35" x2="28" y2="51"/>
        <line class="mech-bond" x1="53.8" y1="75.1" x2="36.7" y2="63.3"/>
        <line class="mech-bond" x1="51.3" y1="78.7" x2="34.2" y2="66.9"/>
        <line class="mech-bond" x1="53.3" y1="88.1" x2="46.1" y2="94.6"/>
        <line class="mech-bond" x1="106.2" y1="55" x2="106.2" y2="37"/>
        <line class="mech-bond" x1="101.8" y1="55" x2="101.8" y2="37"/>
        <line class="mech-bond" x1="110.4" y1="70.4" x2="116.8" y2="76.8"/>
        <text class="mech-atom mech-magenta" x="28" y="26" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge mech-magenta" x="16" y="18" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <text class="mech-atom" x="28" y="60" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="60" y="82" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-label-r" x="38" y="102" text-anchor="middle" dominant-baseline="central">R</text>
        <text class="mech-atom mech-blue" x="104" y="64" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-blue" x="104" y="28" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-label-r" x="126" y="86" text-anchor="middle" dominant-baseline="central">R'</text>
        <path class="mech-arrow" d="M40.1,19 C48,28 44,36 28,39.6" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M47.2,73.2 C65,70 78,68 90.2,66.2" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M112,50 C122,42 122,30 116.1,21" marker-end="url(#mech-arrow-head)"/>
        <line class="mech-reaction-arrow" x1="180" y1="75" x2="265" y2="75" marker-end="url(#mech-reaction-arrow-head)"/>
        <line class="mech-bond" x1="322.2" y1="35" x2="322.2" y2="27"/>
        <line class="mech-bond" x1="317.8" y1="35" x2="317.8" y2="27"/>
        <line class="mech-bond" x1="320" y1="53" x2="320" y2="69"/>
        <line class="mech-bond" x1="313.1" y1="83.8" x2="304.5" y2="91"/>
        <line class="mech-bond" x1="329" y1="78" x2="353" y2="78"/>
        <line class="mech-bond" x1="362" y1="87" x2="362" y2="101"/>
        <line class="mech-bond" x1="369.6" y1="73.1" x2="379.1" y2="67"/>
        <text class="mech-atom" x="320" y="44" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="320" y="18" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="320" y="78" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-label-r" x="296" y="98" text-anchor="middle" dominant-baseline="central">R</text>
        <text class="mech-atom" x="362" y="78" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-magenta" x="362" y="110" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge mech-magenta" x="378" y="120" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <text class="mech-label-r" x="390" y="60" text-anchor="middle" dominant-baseline="central">R'</text>
      </svg>`,
    },
    {
      title: "3단계: 양성자화",
      desc: "알콕사이드 산소가 양성자를 받아 β-히드록시 카르보닐 화합물(알돌)이 완성된다.",
      diagram: `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="66" y1="41" x2="66" y2="59"/>
        <text class="mech-atom mech-magenta" x="66" y="32" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge mech-magenta" x="52" y="22" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <text class="mech-atom" x="66" y="68" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-blue" x="126" y="26" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-charge mech-blue" x="138" y="18" text-anchor="middle" dominant-baseline="central" style="font-size:10px">+</text>
        <path class="mech-arrow" d="M78.1,25 C88,21 100,21 113,25.7" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "4단계(선택적 탈수): E1cb 제거",
      desc: "산 또는 염기 조건에서 β-수소와 히드록시기가 빠지며 공액된 α,β-불포화 카르보닐(엔온)로 탈수된다.",
      diagram: `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="95" y1="82" x2="95" y2="55"/>
        <line class="mech-bond" x1="88" y1="94" x2="66" y2="108"/>
        <line class="mech-bond" x1="175" y1="65" x2="175" y2="36"/>
        <line class="mech-bond" x1="180" y1="65" x2="180" y2="36"/>
        <line class="mech-bond" x1="168" y1="78" x2="148" y2="90"/>
        <line class="mech-bond" x1="182" y1="78" x2="203" y2="90"/>
        <text class="mech-atom mech-magenta" x="177" y="30" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="95" y="48" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-atom" x="95" y="88" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="175" y="70" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="144" y="94" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="60" y="114" text-anchor="middle" dominant-baseline="central">R</text>
        <text class="mech-label-r" x="210" y="96" text-anchor="middle" dominant-baseline="central">Ph</text>
        <path class="mech-arrow" d="M95,80 C110,50 140,50 160,66" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M182,55 C192,45 188,35 179,30" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
  ],
  "탈수 반응 (Dehydration)": [
    {
      title: "1단계: 산 촉매에 의한 양성자화",
      desc: "산 촉매(H+)가 알코올의 산소에 양성자를 제공해 물이 떠나기 좋은 이탈기(-OH2+)로 바뀐다.",
      diagram: `<svg viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="95" y1="69" x2="95" y2="54"/>
        <line class="mech-bond" x1="88.2" y1="39.1" x2="78" y2="30.2"/>
        <line class="mech-bond" x1="87.5" y1="82.9" x2="64.2" y2="98"/>
        <line class="mech-bond" x1="102.6" y1="82.8" x2="125" y2="97"/>
        <text class="mech-atom" x="95" y="78" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-magenta" x="95" y="45" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="72" y="25" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="55" y="104" text-anchor="middle" dominant-baseline="central">R</text>
        <text class="mech-label-r" x="136" y="104" text-anchor="middle" dominant-baseline="central">R'</text>
        <circle class="mech-lone-pair" cx="103.7" cy="35.5" r="1.6"/>
        <circle class="mech-lone-pair" cx="109.1" cy="39.7" r="1.6"/>
        <text class="mech-atom mech-blue" x="178" y="24" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-charge mech-blue" x="190" y="16" text-anchor="middle" dominant-baseline="central" style="font-size:10px">+</text>
        <path class="mech-arrow" d="M110,34 C133,17 155,15 170,22" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "2단계: 물 이탈 (카르보카티온 형성)",
      desc: "C-O 결합의 전자쌍이 산소 쪽으로 이동하며 물이 이탈하고, 탄소는 카르보카티온이 된다.",
      diagram: `<svg viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="130" y1="69" x2="130" y2="53"/>
        <line class="mech-bond" x1="122.8" y1="38.6" x2="112.4" y2="30.8"/>
        <line class="mech-bond" x1="136.9" y1="38.2" x2="147.9" y2="29.1"/>
        <line class="mech-bond" x1="122.5" y1="82.9" x2="99.2" y2="98"/>
        <line class="mech-bond" x1="139" y1="78" x2="169" y2="78"/>
        <line class="mech-bond" x1="178" y1="69" x2="178" y2="52"/>
        <line class="mech-bond" x1="185.5" y1="82.9" x2="207.1" y2="96.9"/>
        <text class="mech-atom" x="130" y="78" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-magenta" x="130" y="44" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge" x="130" y="33" text-anchor="middle" dominant-baseline="central" style="font-size:10px">+</text>
        <text class="mech-atom" x="106" y="26" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-atom" x="154" y="24" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="90" y="104" text-anchor="middle" dominant-baseline="central">R</text>
        <text class="mech-atom" x="178" y="78" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="178" y="44" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="218" y="104" text-anchor="middle" dominant-baseline="central">R'</text>
        <path class="mech-arrow" d="M134,58 C142,50 145,44 144.5,40" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "3단계: 베타 수소 제거 (E1)",
      desc: "인접 탄소(베타 탄소)의 C-H 결합 전자쌍이 카르보카티온 쪽으로 이동하며 파이 결합(C=C)이 형성되고, 수소는 양성자로 떨어져 나간다.",
      diagram: `<svg viewBox="0 0 220 120" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="94" y1="60" x2="126" y2="60"/>
        <line class="mech-bond" x1="135" y1="51" x2="135" y2="30"/>
        <line class="mech-bond" x1="85" y1="69" x2="85" y2="89"/>
        <line class="mech-bond" x1="135" y1="69" x2="135" y2="87"/>
        <text class="mech-atom" x="85" y="60" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-charge" x="85" y="49" text-anchor="middle" dominant-baseline="central" style="font-size:10px">+</text>
        <text class="mech-atom" x="135" y="60" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="135" y="22" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="85" y="100" text-anchor="middle" dominant-baseline="central">R</text>
        <text class="mech-label-r" x="135" y="100" text-anchor="middle" dominant-baseline="central">R'</text>
        <path class="mech-arrow" d="M139,40 C150,52 130,58 110,60" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
  ],
  "카니자로 반응 (Cannizzaro)": [
    {
      title: "1단계: 수산화물 이온의 친핵성 공격",
      desc: "OH-가 알파 수소가 없는 알데히드의 카르보닐 탄소를 공격해 사면체 중간체(알콕사이드)를 형성한다.",
      diagram: `<svg viewBox="0 0 240 130" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="118.2" y1="67" x2="118.2" y2="47"/>
        <line class="mech-bond" x1="113.8" y1="67" x2="113.8" y2="47"/>
        <line class="mech-bond" x1="109.6" y1="82.4" x2="99.7" y2="92.3"/>
        <line class="mech-bond" x1="123.4" y1="81.1" x2="138.9" y2="91.8"/>
        <line class="mech-bond" x1="32.2" y1="87.5" x2="22.9" y2="82"/>
        <text class="mech-atom mech-magenta" x="116" y="38" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="116" y="76" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="94" y="98" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="148" y="98" text-anchor="middle" dominant-baseline="central">R</text>
        <text class="mech-atom mech-blue" x="40" y="92" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge mech-blue" x="34" y="70" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <text class="mech-atom mech-blue" x="16" y="78" text-anchor="middle" dominant-baseline="central">H</text>
        <path class="mech-arrow" d="M54,86 C72,82 88,80 102,77" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M119,64 C126,55 124,45 117,40" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "2단계: 수소화물 이동(Hydride transfer)",
      desc: "이 중간체의 C-H 결합 전자쌍(수소화물)이 두 번째 알데히드 분자의 카르보닐 탄소로 이동한다.",
      diagram: `<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="74" y1="73" x2="74" y2="53"/>
        <text class="mech-charge mech-magenta" x="56" y="28" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <line class="mech-bond" x1="66.3" y1="86.7" x2="39.7" y2="103.3"/>
        <line class="mech-bond" x1="24.5" y1="113" x2="14.7" y2="119.6"/>
        <line class="mech-bond" x1="74" y1="91" x2="74" y2="119"/>
        <line class="mech-bond" x1="81.8" y1="77.5" x2="105.1" y2="64"/>
        <line class="mech-bond" x1="216.2" y1="77" x2="216.2" y2="59"/>
        <line class="mech-bond" x1="211.8" y1="77" x2="211.8" y2="59"/>
        <line class="mech-bond" x1="207.4" y1="92.1" x2="193.9" y2="104.6"/>
        <line class="mech-bond" x1="221" y1="91.6" x2="233.8" y2="101.9"/>
        <text class="mech-atom mech-magenta" x="74" y="44" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="74" y="82" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-magenta" x="32" y="108" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="8" y="124" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="74" y="130" text-anchor="middle" dominant-baseline="central">R</text>
        <text class="mech-atom" x="112" y="60" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-atom mech-blue" x="214" y="86" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-blue" x="214" y="50" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="188" y="110" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="244" y="110" text-anchor="middle" dominant-baseline="central">R'</text>
        <path class="mech-arrow" d="M66,36 C56,44 58,52 66,58" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M119,57 C150,42 180,48 202,80" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M217,74 C224,65 222,55 215,51" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "3단계: 산화-환원 완결",
      desc: "수소화물을 받은 분자는 알콕사이드(→알코올)로 환원되고, 수소화물을 내준 분자는 카르복실산으로 산화된다.",
      diagram: `<svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="72" y1="39" x2="72" y2="55"/>
        <text class="mech-atom mech-magenta" x="72" y="30" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge mech-magenta" x="86" y="20" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <text class="mech-atom" x="72" y="64" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-label-r" x="52" y="80" text-anchor="middle" dominant-baseline="central">→ 알코올</text>
        <text class="mech-atom mech-blue" x="132" y="24" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-charge mech-blue" x="144" y="16" text-anchor="middle" dominant-baseline="central" style="font-size:10px">+</text>
        <path class="mech-arrow" d="M82,24 C102,17 114,17 124,22" marker-end="url(#mech-arrow-head)"/>
        <text class="mech-label-r" x="158" y="58" text-anchor="start" dominant-baseline="central">다른 분자는 이미</text>
        <text class="mech-label-r" x="158" y="74" text-anchor="start" dominant-baseline="central">카르복실산으로 산화됨</text>
      </svg>`,
    },
  ],
};
