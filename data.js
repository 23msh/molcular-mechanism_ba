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
      desc: "실제 반응: 아세톤과 벤즈알데히드의 클라이젠-슈미트 축합(Claisen–Schmidt condensation). 염기(OH⁻)가 아세톤의 알파 탄소에서 H를 떼어가고, 그 전자쌍이 알파 탄소-카르보닐 탄소 사이로 이동해 엔올레이트를 형성한다.",
      diagram: `<svg viewBox="80 15 310 135" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="302.2" y1="91" x2="302.2" y2="64"/>
        <line class="mech-bond" x1="297.8" y1="91" x2="297.8" y2="64"/>
        <line class="mech-bond" x1="292.1" y1="104.3" x2="252.9" y2="125.7"/>
        <line class="mech-bond" x1="238.2" y1="124.1" x2="211" y2="100.3"/>
        <line class="mech-bond" x1="307.9" y1="104.3" x2="341" y2="122.3"/>
        <line class="mech-bond" x1="122.6" y1="69.9" x2="114.6" y2="64.5"/>
        <text class="mech-atom mech-magenta" x="300" y="55" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="300" y="100" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="245" y="130" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="205" y="95" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="355" y="130" text-anchor="middle" dominant-baseline="central">CH3</text>
        <text class="mech-atom mech-blue" x="130" y="75" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge mech-blue" x="136" y="70" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <text class="mech-atom mech-blue" x="108" y="60" text-anchor="middle" dominant-baseline="central">H</text>
        <path class="mech-arrow" d="M143.5,78.6 C160,80 178,86 192.4,91.6" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M234.5,120.8 C245,116 258,115 267,118" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M312,85 C320,70 316,52 307,43" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "2단계: 친핵성 공격",
      desc: "아세톤 엔올레이트의 알파 탄소(친핵체)가 벤즈알데히드(Ph-CHO)의 카르보닐 탄소(친전자체)를 공격한다. 벤즈알데히드의 파이 결합 전자쌍은 산소로 이동해 알콕사이드가 된다.",
      diagram: `<svg viewBox="0 10 505 140" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="60" y1="49" x2="60" y2="76"/>
        <line class="mech-bond" x1="102.7" y1="102.2" x2="69.1" y2="86.8"/>
        <line class="mech-bond" x1="100.9" y1="106.2" x2="67.3" y2="90.8"/>
        <line class="mech-bond" x1="53.9" y1="91.7" x2="40.8" y2="106.2"/>
        <line class="mech-bond" x1="192.2" y1="86" x2="192.2" y2="54"/>
        <line class="mech-bond" x1="187.8" y1="86" x2="187.8" y2="54"/>
        <line class="mech-bond" x1="182.9" y1="100.5" x2="161.3" y2="117.1"/>
        <line class="mech-bond" x1="197.9" y1="99.3" x2="219.7" y2="111.3"/>
        <text class="mech-atom mech-magenta" x="60" y="40" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge mech-magenta" x="66" y="35" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <text class="mech-atom" x="60" y="85" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-label-r" x="30" y="118" text-anchor="middle" dominant-baseline="central">CH3</text>
        <text class="mech-atom" x="110" y="108" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-blue" x="190" y="95" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-blue" x="190" y="45" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="155" y="122" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="232" y="118" text-anchor="middle" dominant-baseline="central">Ph</text>
        <path class="mech-arrow" d="M119,99 C140,90 155,90 165,92" marker-end="url(#mech-arrow-head)"/>
        <line x1="137" y1="73" x2="147" y2="73" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
        <line x1="142" y1="68" x2="142" y2="78" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
        <path class="mech-arrow" d="M196.5,82 C205.5,72 202.5,55 193.5,46" marker-end="url(#mech-arrow-head)"/>
        <line class="mech-reaction-arrow" x1="255" y1="100" x2="310" y2="100" marker-end="url(#mech-reaction-arrow-head)"/>
        <line class="mech-bond" x1="351.7" y1="122.3" x2="370.5" y2="109.9"/>
        <line class="mech-bond" x1="378" y1="96" x2="378" y2="74"/>
        <line class="mech-bond" x1="385.1" y1="110.5" x2="401.7" y2="123.1"/>
        <line class="mech-bond" x1="385.8" y1="100.5" x2="410.2" y2="86.5"/>
        <line class="mech-bond" x1="425.8" y1="86.5" x2="450.2" y2="100.5"/>
        <line class="mech-bond" x1="460.2" y1="96" x2="460.2" y2="74"/>
        <line class="mech-bond" x1="455.8" y1="96" x2="455.8" y2="74"/>
        <line class="mech-bond" x1="465.3" y1="110.3" x2="477" y2="118.7"/>
        <text class="mech-label-r" x="340" y="130" text-anchor="middle" dominant-baseline="central">Ph</text>
        <text class="mech-atom" x="378" y="105" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom mech-magenta" x="378" y="65" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge mech-magenta" x="384" y="60" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <text class="mech-atom" x="408" y="128" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-atom" x="418" y="82" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="458" y="105" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="458" y="65" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-label-r" x="490" y="128" text-anchor="middle" dominant-baseline="central">CH3</text>
      </svg>`,
    },
    {
      title: "3단계: 양성자화",
      desc: "알콕사이드 산소가 양성자를 받아 β-히드록시 케톤인 4-hydroxy-4-phenyl-2-butanone이 완성된다.",
      diagram: `<svg viewBox="150 15 190 115" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="220" y1="54" x2="220" y2="81"/>
        <line class="mech-bond" x1="212.3" y1="94.6" x2="190" y2="107.8"/>
        <line class="mech-bond" x1="228" y1="94.2" x2="260.9" y2="111.3"/>
        <text class="mech-atom mech-magenta" x="220" y="45" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-charge mech-magenta" x="226" y="40" text-anchor="middle" dominant-baseline="central" style="font-size:10px">−</text>
        <text class="mech-atom" x="220" y="90" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-label-r" x="178" y="115" text-anchor="middle" dominant-baseline="central">Ph</text>
        <text class="mech-label-r" x="268" y="115" text-anchor="start" dominant-baseline="central">CH2COCH3</text>
        <text class="mech-atom mech-blue" x="300" y="38" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-charge mech-blue" x="306" y="33" text-anchor="middle" dominant-baseline="central" style="font-size:10px">+</text>
        <path class="mech-arrow" d="M230,35 C255,25 272,25 286,32" marker-end="url(#mech-arrow-head)"/>
      </svg>`,
    },
    {
      title: "4단계(탈수): E1cb 제거",
      desc: "실제 반응: 4-hydroxy-4-phenyl-2-butanone이 산/염기 조건에서 β-수소와 히드록시기를 잃고 벤잘아세톤((E)-4-phenylbut-3-en-2-one)으로 탈수된다.",
      diagram: `<svg viewBox="155 10 260 135" xmlns="http://www.w3.org/2000/svg">
        <line class="mech-bond" x1="222" y1="35.9" x2="202.1" y2="25.7"/>
        <line class="mech-bond" x1="230" y1="76" x2="230" y2="49"/>
        <line class="mech-bond" x1="238.5" y1="87.8" x2="281.5" y2="102.2"/>
        <line class="mech-bond" x1="296.4" y1="98.6" x2="314.3" y2="80.7"/>
        <line class="mech-bond" x1="221.8" y1="88.6" x2="190.8" y2="102.3"/>
        <line class="mech-bond" x1="298.2" y1="108.7" x2="294.9" y2="107.2"/>
        <text class="mech-atom mech-magenta" x="230" y="40" text-anchor="middle" dominant-baseline="central">O</text>
        <text class="mech-atom" x="195" y="22" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-atom" x="230" y="85" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="290" y="105" text-anchor="middle" dominant-baseline="central">C</text>
        <text class="mech-atom" x="320" y="75" text-anchor="middle" dominant-baseline="central">H</text>
        <text class="mech-label-r" x="178" y="108" text-anchor="middle" dominant-baseline="central">Ph</text>
        <text class="mech-label-r" x="351" y="130" text-anchor="start" dominant-baseline="central">C(=O)CH3</text>
        <path class="mech-arrow" d="M312,79 C298,76 282,82 268,95" marker-end="url(#mech-arrow-head)"/>
        <path class="mech-arrow" d="M230,55 C240,45 240,32 232,23" marker-end="url(#mech-arrow-head)"/>
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
