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

// 반응 이름 -> 단계별 [ {title, desc}, ... ]
const MECHANISMS = {
  "알돌 축합 (Aldol condensation)": [
    { title: "1단계: 엔올레이트 형성", desc: "염기가 카르보닐 알파 탄소의 H를 떼어가고, 그 전자쌍이 알파 탄소-카르보닐 탄소 사이로 이동해 엔올레이트(또는 엔올)를 형성한다." },
    { title: "2단계: 친핵성 공격", desc: "엔올레이트의 알파 탄소(친핵체)가 두 번째 카르보닐 분자의 탄소(친전자체)를 공격한다. 카르보닐의 파이 결합 전자쌍은 산소로 이동해 알콕사이드가 된다." },
    { title: "3단계: 양성자화", desc: "알콕사이드 산소가 양성자를 받아 β-히드록시 카르보닐 화합물(알돌)이 완성된다." },
    { title: "4단계(선택적 탈수): E1cb 제거", desc: "산 또는 염기 조건에서 β-수소와 히드록시기가 빠지며 공액된 α,β-불포화 카르보닐(엔온)로 탈수된다." },
  ],
  "탈수 반응 (Dehydration)": [
    { title: "1단계: 산 촉매에 의한 양성자화", desc: "산 촉매(H+)가 알코올의 산소에 양성자를 제공해 물이 떠나기 좋은 이탈기(-OH2+)로 바뀐다." },
    { title: "2단계: 물 이탈 (카르보카티온 형성)", desc: "C-O 결합의 전자쌍이 산소 쪽으로 이동하며 물이 이탈하고, 탄소는 카르보카티온이 된다." },
    { title: "3단계: 베타 수소 제거 (E1)", desc: "인접 탄소(베타 탄소)의 C-H 결합 전자쌍이 카르보카티온 쪽으로 이동하며 파이 결합(C=C)이 형성되고, 수소는 양성자로 떨어져 나간다." },
  ],
  "카니자로 반응 (Cannizzaro)": [
    { title: "1단계: 수산화물 이온의 친핵성 공격", desc: "OH-가 알파 수소가 없는 알데히드의 카르보닐 탄소를 공격해 사면체 중간체(알콕사이드)를 형성한다." },
    { title: "2단계: 수소화물 이동(Hydride transfer)", desc: "이 중간체의 C-H 결합 전자쌍(수소화물)이 두 번째 알데히드 분자의 카르보닐 탄소로 이동한다." },
    { title: "3단계: 산화-환원 완결", desc: "수소화물을 받은 분자는 알콕사이드(→알코올)로 환원되고, 수소화물을 내준 분자는 카르복실산으로 산화된다." },
  ],
};
