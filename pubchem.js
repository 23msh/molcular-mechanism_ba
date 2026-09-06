// pubchem.js
// 로컬 이름 사전(names.js)에 없는 화합물명을 PubChem PUG REST API로 실시간 조회해
// SMILES로 변환한다. 인터넷 연결이 필요하며, 실패 시(오프라인/이름 못 찾음/CORS 차단 등)
// null을 반환해 호출부가 "인식하지 못했습니다" 메시지로 자연스럽게 이어지도록 한다.

// PubChem이 시기별로 SMILES 관련 속성 이름을 바꿔온 적이 있어(CanonicalSMILES/
// IsomericSMILES -> ConnectivitySMILES/SMILES 등), 여러 후보를 한 번에 요청하고
// 응답에서 존재하는 필드를 순서대로 찾는다.
const PUBCHEM_SMILES_PROPERTIES = ["CanonicalSMILES", "IsomericSMILES", "ConnectivitySMILES", "SMILES"];

function pubchemPropertyUrl(name) {
  return (
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" +
    encodeURIComponent(name) +
    "/property/" +
    PUBCHEM_SMILES_PROPERTIES.join(",") +
    "/JSON"
  );
}

// 성공 시 SMILES 문자열, 실패 시 null.
async function lookupSmilesFromPubChem(name) {
  let res;
  try {
    res = await fetch(pubchemPropertyUrl(name));
  } catch (e) {
    console.warn("PubChem fetch 실패(네트워크/CORS):", e);
    return null;
  }
  if (!res.ok) {
    console.warn("PubChem 응답 실패:", res.status, res.statusText);
    return null; // 404 등: 이름을 못 찾음
  }
  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.warn("PubChem 응답이 JSON이 아님:", e);
    return null;
  }
  const props = data && data.PropertyTable && data.PropertyTable.Properties && data.PropertyTable.Properties[0];
  if (!props) {
    console.warn("PubChem 응답에 PropertyTable이 없음:", data);
    return null;
  }
  for (const key of PUBCHEM_SMILES_PROPERTIES) {
    if (props[key]) return props[key];
  }
  console.warn("PubChem 응답에서 SMILES 필드를 못 찾음:", props);
  return null;
}
