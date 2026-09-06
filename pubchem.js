// pubchem.js
// 로컬 이름 사전(names.js)에 없는 화합물명을 PubChem PUG REST API로 실시간 조회해
// SMILES로 변환한다. 인터넷 연결이 필요하며, 실패 시(오프라인/이름 못 찾음/CORS 차단 등)
// null을 반환해 호출부가 "인식하지 못했습니다" 메시지로 자연스럽게 이어지도록 한다.

function pubchemPropertyUrl(name) {
  return (
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" +
    encodeURIComponent(name) +
    "/property/CanonicalSMILES/JSON"
  );
}

// 성공 시 SMILES 문자열, 실패 시 null.
async function lookupSmilesFromPubChem(name) {
  let res;
  try {
    res = await fetch(pubchemPropertyUrl(name));
  } catch (e) {
    return null; // 네트워크 오류, CORS 차단 등
  }
  if (!res.ok) return null; // 404 등: 이름을 못 찾음
  let data;
  try {
    data = await res.json();
  } catch (e) {
    return null;
  }
  const smiles = data && data.PropertyTable && data.PropertyTable.Properties && data.PropertyTable.Properties[0];
  return (smiles && smiles.CanonicalSMILES) || null;
}
