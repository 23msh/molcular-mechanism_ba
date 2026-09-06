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
};

// 입력 문자열을 SMILES로 변환 시도. 이름 사전에서 못 찾으면 입력을 그대로 SMILES로 간주.
// 반환값: { smiles, matchedLabel } — matchedLabel은 이름이 매칭되어 치환됐을 때만 채워짐.
function resolveCompoundInput(rawInput) {
  const trimmed = rawInput.trim();
  const key = trimmed.toLowerCase();

  if (GENERIC_CLASS_ALIASES[key]) {
    const { smiles, label } = GENERIC_CLASS_ALIASES[key];
    return { smiles, matchedLabel: label };
  }
  if (COMPOUND_NAME_ALIASES[key]) {
    return { smiles: COMPOUND_NAME_ALIASES[key], matchedLabel: null };
  }
  return { smiles: trimmed, matchedLabel: null };
}
