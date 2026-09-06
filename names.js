// names.js
// 화합물 이름(한글/영문, 관용명·작용기 대분류명) -> SMILES 매핑.
// 검색창에 SMILES 대신 익숙한 이름을 입력해도 되도록, RDKit에 넘기기 전에 이름을 SMILES로
// 먼저 치환한다. 목록에 없는 입력은 그대로 SMILES로 간주해 기존 흐름대로 처리된다.

// 작용기 대분류 이름 -> 그 작용기를 대표하는 예시 화합물 (정확히 "이 분자"라는 뜻이 아니라
// "이 종류의 대표 예시"라는 점을 검색 결과에 안내 문구로 표시한다)
const GENERIC_CLASS_ALIASES = {
  "알코올": { smiles: "CCO", label: "에탄올 (알코올의 대표 예시)" },
  "alcohol": { smiles: "CCO", label: "ethanol (alcohol 대표 예시)" },
  "케톤": { smiles: "CC(C)=O", label: "아세톤 (케톤의 대표 예시)" },
  "ketone": { smiles: "CC(C)=O", label: "acetone (ketone 대표 예시)" },
  "알데히드": { smiles: "CC=O", label: "아세트알데히드 (알데히드의 대표 예시)" },
  "aldehyde": { smiles: "CC=O", label: "acetaldehyde (aldehyde 대표 예시)" },
  "카르복실산": { smiles: "CC(=O)O", label: "아세트산 (카르복실산의 대표 예시)" },
  "carboxylic acid": { smiles: "CC(=O)O", label: "acetic acid (carboxylic acid 대표 예시)" },
  "에스테르": { smiles: "CC(=O)OCC", label: "에틸아세테이트 (에스테르의 대표 예시)" },
  "ester": { smiles: "CC(=O)OCC", label: "ethyl acetate (ester 대표 예시)" },
  "알켄": { smiles: "CC=CC", label: "2-butene (알켄의 대표 예시)" },
  "alkene": { smiles: "CC=CC", label: "2-butene (alkene 대표 예시)" },
  "올레핀": { smiles: "CC=CC", label: "2-butene (올레핀의 대표 예시)" },
  "방향족": { smiles: "c1ccccc1", label: "벤젠 (방향족의 대표 예시)" },
  "aromatic": { smiles: "c1ccccc1", label: "benzene (aromatic 대표 예시)" },
  "할로알칸": { smiles: "CCCl", label: "클로로에탄 (할로알칸의 대표 예시)" },
  "haloalkane": { smiles: "CCCl", label: "chloroethane (haloalkane 대표 예시)" },
  "알킬할라이드": { smiles: "CCCl", label: "클로로에탄 (할로알칸의 대표 예시)" },
  "디올": { smiles: "OCCO", label: "에틸렌글리콜 (비시날 디올의 대표 예시)" },
  "diol": { smiles: "OCCO", label: "ethylene glycol (diol 대표 예시)" },
  "아미노산": { smiles: "NCC(=O)O", label: "글리신 (아미노산의 대표 예시)" },
  "amino acid": { smiles: "NCC(=O)O", label: "glycine (amino acid 대표 예시)" },
  "amino acids": { smiles: "NCC(=O)O", label: "glycine (amino acid 대표 예시)" },
};

// DNA/RNA처럼 "하나의 분자"로 표현할 수 없는 고분자는 대표 분자로 대충 치환하지 않고,
// 왜 검색이 안 되는지 설명하는 안내 메시지를 보여준다.
const POLYMER_NOTES = {
  "dna": "DNA는 하나의 분자가 아니라 뉴클레오타이드가 수백만 개 연결된 고분자라서, 이 도구가 다루는 단일 분자 반응으로는 표현할 수 없습니다. 구성 단위인 뉴클레오타이드(예: '아데노신')나 그 안의 당(디옥시리보스)·염기 부분을 개별적으로 검색해보세요.",
  "rna": "RNA도 DNA와 마찬가지로 뉴클레오타이드가 길게 연결된 고분자라서, 단일 분자 반응으로는 표현할 수 없습니다. 구성 단위인 뉴클레오타이드(예: '아데노신')를 개별적으로 검색해보세요.",
};

// 특정 화합물 이름(한글/영문 관용명) -> 정확한 SMILES
const COMPOUND_NAME_ALIASES = {
  "에탄올": "CCO",
  "ethanol": "CCO",
  "메탄올": "CO",
  "methanol": "CO",
  "프로판올": "CCCO",
  "propanol": "CCCO",
  "이소프로판올": "CC(C)O",
  "isopropanol": "CC(C)O",
  "isopropyl alcohol": "CC(C)O",
  "아세톤": "CC(C)=O",
  "acetone": "CC(C)=O",
  "아세트알데히드": "CC=O",
  "acetaldehyde": "CC=O",
  "포름알데히드": "C=O",
  "formaldehyde": "C=O",
  "아세트산": "CC(=O)O",
  "초산": "CC(=O)O",
  "acetic acid": "CC(=O)O",
  "벤조산": "c1ccccc1C(=O)O",
  "benzoic acid": "c1ccccc1C(=O)O",
  "부텐": "CC=CC",
  "butene": "CC=CC",
  "2-부텐": "CC=CC",
  "2-butene": "CC=CC",
  "1-부텐": "CCC=C",
  "1-butene": "CCC=C",
  "에틸렌": "C=C",
  "에텐": "C=C",
  "ethylene": "C=C",
  "ethene": "C=C",
  "프로펜": "CC=C",
  "프로필렌": "CC=C",
  "propene": "CC=C",
  "propylene": "CC=C",
  "벤젠": "c1ccccc1",
  "benzene": "c1ccccc1",
  "톨루엔": "Cc1ccccc1",
  "toluene": "Cc1ccccc1",
  "페놀": "Oc1ccccc1",
  "phenol": "Oc1ccccc1",
  "에틸아세테이트": "CC(=O)OCC",
  "ethyl acetate": "CC(=O)OCC",
  "클로로에탄": "CCCl",
  "chloroethane": "CCCl",
  "에틸렌글리콜": "OCCO",
  "ethylene glycol": "OCCO",
  "사이클로헥사놀": "OC1CCCCC1",
  "cyclohexanol": "OC1CCCCC1",
  "4-hydroxy-2-pentanone": "CC(O)CC(C)=O",

  // ---- 생체분자 ----
  "포도당": "OCC(O)C(O)C(O)C(O)C=O",
  "glucose": "OCC(O)C(O)C(O)C(O)C=O",
  "과당": "OCC(=O)C(O)C(O)C(O)CO",
  "fructose": "OCC(=O)C(O)C(O)C(O)CO",
  "자당": "OC[C@H]1O[C@@](CO)(O[C@H]2O[C@H](CO)[C@@H](O)[C@H](O)[C@H]2O)[C@@H](O)[C@@H]1O",
  "설탕": "OC[C@H]1O[C@@](CO)(O[C@H]2O[C@H](CO)[C@@H](O)[C@H](O)[C@H]2O)[C@@H](O)[C@@H]1O",
  "sucrose": "OC[C@H]1O[C@@](CO)(O[C@H]2O[C@H](CO)[C@@H](O)[C@H](O)[C@H]2O)[C@@H](O)[C@@H]1O",
  "글리신": "NCC(=O)O",
  "glycine": "NCC(=O)O",
  "atp": "Nc1ncnc2c1ncn2C3OC(COP(=O)(O)OP(=O)(O)OP(=O)(O)O)C(O)C3O",
  "아데노신": "Nc1ncnc2c1ncn2C3OC(CO)C(O)C3O",
  "adenosine": "Nc1ncnc2c1ncn2C3OC(CO)C(O)C3O",
  "콜레스테롤": "CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C",
  "cholesterol": "CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C",

  // ---- 의약품 ----
  "아스피린": "CC(=O)Oc1ccccc1C(=O)O",
  "aspirin": "CC(=O)Oc1ccccc1C(=O)O",
  "이부프로펜": "CC(C)Cc1ccc(cc1)C(C)C(=O)O",
  "ibuprofen": "CC(C)Cc1ccc(cc1)C(C)C(=O)O",
  "파라세타몰": "CC(=O)Nc1ccc(O)cc1",
  "아세트아미노펜": "CC(=O)Nc1ccc(O)cc1",
  "paracetamol": "CC(=O)Nc1ccc(O)cc1",
  "acetaminophen": "CC(=O)Nc1ccc(O)cc1",
  "카페인": "Cn1cnc2c1c(=O)n(C)c(=O)n2C",
  "caffeine": "Cn1cnc2c1c(=O)n(C)c(=O)n2C",
  "니코틴": "CN1CCCC1c1cccnc1",
  "nicotine": "CN1CCCC1c1cccnc1",

  // ---- 기초 화학 ----
  "메탄": "C",
  "methane": "C",
  "에탄": "CC",
  "ethane": "CC",
  "프로판": "CCC",
  "propane": "CCC",
  "부탄": "CCCC",
  "butane": "CCCC",
  "암모니아": "N",
  "ammonia": "N",
  "황산": "OS(=O)(=O)O",
  "sulfuric acid": "OS(=O)(=O)O",
};

// 입력 문자열을 SMILES로 변환 시도. 이름 사전에서 못 찾으면 입력을 그대로 SMILES로 간주.
// 반환값: { smiles, matchedLabel } (matchedLabel은 이름이 매칭되어 치환됐을 때만 채워짐)
// 또는 폴리머처럼 단일 분자로 표현 불가능한 경우 { smiles: null, polymerNote }.
function resolveCompoundInput(rawInput) {
  const trimmed = rawInput.trim();
  const key = trimmed.toLowerCase();

  if (POLYMER_NOTES[key]) {
    return { smiles: null, matchedLabel: null, polymerNote: POLYMER_NOTES[key] };
  }
  if (GENERIC_CLASS_ALIASES[key]) {
    const { smiles, label } = GENERIC_CLASS_ALIASES[key];
    return { smiles, matchedLabel: label };
  }
  if (COMPOUND_NAME_ALIASES[key]) {
    return { smiles: COMPOUND_NAME_ALIASES[key], matchedLabel: null };
  }
  return { smiles: trimmed, matchedLabel: null };
}
