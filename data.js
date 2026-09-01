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
// 전자쌍), 화살표 머리=전자쌍의 도착(새로 생기는 결합/전하). 골격은 var(--ink), 화살표는 var(--accent-standalone).
const MECHANISMS = {
  "알돌 축합 (Aldol condensation)": [
    {
      title: "1단계: 엔올레이트 형성",
      desc: "염기가 카르보닐 알파 탄소의 H를 떼어가고, 그 전자쌍이 알파 탄소-카르보닐 탄소 사이로 이동해 엔올레이트(또는 엔올)를 형성한다.",
      diagram: `<svg viewBox="0 0 260 140" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="148" y1="74" x2="148" y2="50"/>
        <line class="mech-bond" x1="153" y1="74" x2="153" y2="50"/>
        <text class="mech-atom" x="146" y="44">O</text>
        <line class="mech-bond" x1="143" y1="82" x2="112" y2="96"/>
        <text class="mech-atom" x="140" y="82">C</text>
        <text class="mech-atom" x="104" y="100">C</text>
        <line class="mech-bond" x1="106" y1="90" x2="86" y2="72"/>
        <text class="mech-atom" x="76" y="66">H</text>
        <line class="mech-bond" x1="100" y1="104" x2="80" y2="120"/>
        <text class="mech-label-r" x="66" y="130">R</text>
        <text class="mech-base" x="46" y="56">B</text>
        <text class="mech-charge" x="58" y="48">−</text>
        <path class="mech-arrow" d="M54,58 C66,64 74,66 82,70" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M96,86 C112,80 122,80 132,82" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M155,66 C162,58 160,50 154,46" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "2단계: 친핵성 공격",
      desc: "엔올레이트의 알파 탄소(친핵체)가 두 번째 카르보닐 분자의 탄소(친전자체)를 공격한다. 카르보닐의 파이 결합 전자쌍은 산소로 이동해 알콕사이드가 된다.",
      diagram: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
        <text class="mech-atom" x="52" y="24">O</text>
        <text class="mech-charge" x="66" y="18">−</text>
        <line class="mech-bond" x1="60" y1="30" x2="60" y2="52"/>
        <text class="mech-atom" x="56" y="60">C</text>
        <line class="mech-bond" x1="66" y1="58" x2="94" y2="78"/>
        <line class="mech-bond" x1="68" y1="64" x2="94" y2="83"/>
        <text class="mech-atom" x="96" y="86">C</text>
        <line class="mech-bond" x1="102" y1="82" x2="122" y2="88"/>
        <text class="mech-label-r" x="122" y="94">R</text>
        <line class="mech-bond" x1="167" y1="56" x2="167" y2="34"/>
        <line class="mech-bond" x1="172" y1="56" x2="172" y2="34"/>
        <text class="mech-atom" x="163" y="28">O</text>
        <text class="mech-atom" x="163" y="66">C</text>
        <line class="mech-bond" x1="180" y1="62" x2="200" y2="72"/>
        <text class="mech-label-r" x="200" y="80">R'</text>
        <path class="mech-arrow" d="M100,80 C130,70 150,66 162,64" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M174,50 C182,42 180,34 174,30" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "3단계: 양성자화",
      desc: "알콕사이드 산소가 양성자를 받아 β-히드록시 카르보닐 화합물(알돌)이 완성된다.",
      diagram: `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
        <text class="mech-atom" x="62" y="30">O</text>
        <text class="mech-charge" x="76" y="24">−</text>
        <line class="mech-bond" x1="70" y1="36" x2="70" y2="58"/>
        <text class="mech-atom" x="66" y="66">C</text>
        <text class="mech-atom" x="120" y="26">H</text>
        <text class="mech-charge" x="132" y="20">+</text>
        <path class="mech-arrow" d="M76,28 C96,20 108,20 116,24" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "4단계(선택적 탈수): E1cb 제거",
      desc: "산 또는 염기 조건에서 β-수소와 히드록시기가 빠지며 공액된 α,β-불포화 카르보닐(엔온)로 탈수된다.",
      diagram: `<svg viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg">
        <text class="mech-atom" x="96" y="24">O</text>
        <text class="mech-atom" x="80" y="14">H</text>
        <line class="mech-bond" x1="90" y1="20" x2="82" y2="16"/>
        <line class="mech-bond" x1="100" y1="30" x2="100" y2="50"/>
        <text class="mech-atom" x="96" y="58">C</text>
        <line class="mech-bond" x1="108" y1="56" x2="136" y2="68"/>
        <text class="mech-atom" x="136" y="72">C</text>
        <line class="mech-bond" x1="142" y1="66" x2="154" y2="48"/>
        <text class="mech-atom" x="154" y="44">H</text>
        <line class="mech-bond" x1="90" y1="62" x2="65" y2="80"/>
        <text class="mech-label-r" x="50" y="90">R</text>
        <line class="mech-bond" x1="144" y1="74" x2="168" y2="86"/>
        <text class="mech-label-r" x="168" y="94">C(=O)R'</text>
        <path class="mech-arrow" d="M148,46 C132,50 122,58 114,64" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M100,44 C108,36 104,28 98,24" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
  ],
  "탈수 반응 (Dehydration)": [
    {
      title: "1단계: 산 촉매에 의한 양성자화",
      desc: "산 촉매(H+)가 알코올의 산소에 양성자를 제공해 물이 떠나기 좋은 이탈기(-OH2+)로 바뀐다.",
      diagram: `<svg viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="95" y1="70" x2="95" y2="48"/>
        <line class="mech-bond" x1="91" y1="41" x2="74" y2="26"/>
        <line class="mech-bond" x1="90" y1="79" x2="62" y2="99"/>
        <line class="mech-bond" x1="100" y1="79" x2="128" y2="99"/>
        <text class="mech-atom" x="90" y="80">C</text>
        <text class="mech-atom" x="88" y="40">O</text>
        <text class="mech-atom" x="66" y="24">H</text>
        <text class="mech-label-r" x="46" y="112">R</text>
        <text class="mech-label-r" x="126" y="112">R'</text>
        <circle class="mech-lone-pair" cx="106" cy="30" r="1.6"/>
        <circle class="mech-lone-pair" cx="111" cy="35" r="1.6"/>
        <text class="mech-atom" x="172" y="24">H</text>
        <text class="mech-charge" x="184" y="16">+</text>
        <path class="mech-arrow" d="M110,33 C135,14 155,14 168,22" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "2단계: 물 이탈 (카르보카티온 형성)",
      desc: "C-O 결합의 전자쌍이 산소 쪽으로 이동하며 물이 이탈하고, 탄소는 카르보카티온이 된다.",
      diagram: `<svg viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="90" y1="70" x2="90" y2="48"/>
        <line class="mech-bond" x1="86" y1="41" x2="70" y2="27"/>
        <line class="mech-bond" x1="94" y1="41" x2="110" y2="25"/>
        <line class="mech-bond" x1="86" y1="79" x2="58" y2="99"/>
        <line class="mech-bond" x1="96" y1="79" x2="124" y2="99"/>
        <text class="mech-atom" x="86" y="80">C</text>
        <text class="mech-atom" x="84" y="40">O</text>
        <text class="mech-charge" x="98" y="34">+</text>
        <text class="mech-atom" x="62" y="25">H</text>
        <text class="mech-atom" x="112" y="23">H</text>
        <text class="mech-label-r" x="42" y="112">R</text>
        <text class="mech-label-r" x="122" y="112">R'</text>
        <path class="mech-arrow" d="M90,62 C104,52 100,44 92,40" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "3단계: 베타 수소 제거 (E1)",
      desc: "인접 탄소(베타 탄소)의 C-H 결합 전자쌍이 카르보카티온 쪽으로 이동하며 파이 결합(C=C)이 형성되고, 수소는 양성자로 떨어져 나간다.",
      diagram: `<svg viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="95" y1="75" x2="132" y2="86"/>
        <line class="mech-bond" x1="136" y1="83" x2="148" y2="64"/>
        <line class="mech-bond" x1="86" y1="70" x2="58" y2="90"/>
        <line class="mech-bond" x1="140" y1="90" x2="168" y2="102"/>
        <text class="mech-atom" x="86" y="76">C</text>
        <text class="mech-charge" x="98" y="66">+</text>
        <text class="mech-atom" x="132" y="90">C</text>
        <text class="mech-atom" x="150" y="62">H</text>
        <text class="mech-label-r" x="42" y="100">R</text>
        <text class="mech-label-r" x="168" y="112">R'</text>
        <path class="mech-arrow" d="M144,68 C130,66 118,72 110,78" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
  ],
  "카니자로 반응 (Cannizzaro)": [
    {
      title: "1단계: 수산화물 이온의 친핵성 공격",
      desc: "OH-가 알파 수소가 없는 알데히드의 카르보닐 탄소를 공격해 사면체 중간체(알콕사이드)를 형성한다.",
      diagram: `<svg viewBox="0 0 260 130" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="107" y1="64" x2="107" y2="42"/>
        <line class="mech-bond" x1="113" y1="64" x2="113" y2="42"/>
        <text class="mech-atom" x="104" y="36">O</text>
        <text class="mech-atom" x="104" y="76">C</text>
        <line class="mech-bond" x1="100" y1="80" x2="86" y2="94"/>
        <text class="mech-atom" x="78" y="100">H</text>
        <line class="mech-bond" x1="116" y1="78" x2="138" y2="92"/>
        <text class="mech-label-r" x="138" y="100">R</text>
        <text class="mech-atom" x="42" y="88">O</text>
        <text class="mech-atom" x="54" y="88">H</text>
        <text class="mech-charge" x="66" y="80">−</text>
        <path class="mech-arrow" d="M58,84 C74,80 88,78 98,76" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M111,60 C118,52 116,44 110,40" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "2단계: 수소화물 이동(Hydride transfer)",
      desc: "이 중간체의 C-H 결합 전자쌍(수소화물)이 두 번째 알데히드 분자의 카르보닐 탄소로 이동한다.",
      diagram: `<svg viewBox="0 0 300 130" xmlns="http://www.w3.org/2000/svg">
        <text class="mech-atom" x="64" y="34">O</text>
        <text class="mech-charge" x="78" y="28">−</text>
        <line class="mech-bond" x1="70" y1="40" x2="70" y2="62"/>
        <text class="mech-atom" x="66" y="70">C</text>
        <line class="mech-bond" x1="63" y1="76" x2="46" y2="90"/>
        <text class="mech-atom" x="36" y="96">O</text>
        <text class="mech-atom" x="24" y="96">H</text>
        <line class="mech-bond" x1="63" y1="80" x2="52" y2="100"/>
        <text class="mech-label-r" x="42" y="112">R</text>
        <line class="mech-bond" x1="78" y1="68" x2="92" y2="58"/>
        <text class="mech-atom" x="94" y="54">H</text>
        <line class="mech-bond" x1="187" y1="64" x2="187" y2="42"/>
        <line class="mech-bond" x1="193" y1="64" x2="193" y2="42"/>
        <text class="mech-atom" x="184" y="36">O</text>
        <text class="mech-atom" x="184" y="76">C</text>
        <line class="mech-bond" x1="180" y1="80" x2="166" y2="92"/>
        <text class="mech-atom" x="156" y="98">H</text>
        <line class="mech-bond" x1="196" y1="78" x2="214" y2="92"/>
        <text class="mech-label-r" x="214" y="100">R'</text>
        <path class="mech-arrow" d="M68,44 C60,52 62,58 68,62" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M96,56 C130,42 160,46 180,62" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M191,58 C198,50 196,42 190,38" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "3단계: 산화-환원 완결",
      desc: "수소화물을 받은 분자는 알콕사이드(→알코올)로 환원되고, 수소화물을 내준 분자는 카르복실산으로 산화된다.",
      diagram: `<svg viewBox="0 0 260 110" xmlns="http://www.w3.org/2000/svg">
        <text class="mech-atom" x="70" y="30">O</text>
        <text class="mech-charge" x="84" y="24">−</text>
        <line class="mech-bond" x1="78" y1="36" x2="78" y2="58"/>
        <text class="mech-atom" x="74" y="66">C</text>
        <text class="mech-label-r" x="52" y="86">→ 알코올</text>
        <text class="mech-atom" x="140" y="26">H</text>
        <text class="mech-charge" x="152" y="20">+</text>
        <path class="mech-arrow" d="M84,28 C104,20 118,20 136,24" marker-end="url(#mech-arrow-head)"/>
        <text class="mech-label-r" x="160" y="66">다른 분자는 이미 카르복실산으로 산화됨</text>
      </svg>`,
    },
  ],
};
