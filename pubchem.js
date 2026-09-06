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

// PubChem은 IP 단위로 초당/분당 요청 수를 동적으로 스로틀링하다가 한도를 넘으면
// 503(PUGREST.ServerBusy)을 반환한다. 응답의 X-Throttling-Control 헤더가 Red 상태면
// 서버가 한동안 요청을 계속 거부할 수 있으므로, 짧은 재시도보다 점점 늘어나는(exponential)
// 간격으로 재시도한다. 404 등 "이름을 못 찾음"은 재시도해도 의미 없어 그대로 실패 처리한다.
const PUBCHEM_RETRY_DELAYS_MS = [800, 2000, 4000];

// script.js가 실패 이유에 따라 다른 안내 메시지를 보여줄 수 있도록 마지막 실패 사유를 기록한다.
// "busy": 서버 과부하(503, 재시도 소진) / "not_found": 이름을 못 찾음 / "network": 오프라인·CORS 등.
let pubchemLastErrorReason = null;

function getPubchemLastErrorReason() {
  return pubchemLastErrorReason;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 성공 시 SMILES 문자열, 실패 시 null.
async function lookupSmilesFromPubChem(name) {
  pubchemLastErrorReason = null;
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(pubchemPropertyUrl(name));
    } catch (e) {
      console.warn("PubChem fetch 실패(네트워크/CORS):", e);
      pubchemLastErrorReason = "network";
      return null;
    }
    const throttling = res.headers.get("X-Throttling-Control");
    if (throttling) console.info("PubChem X-Throttling-Control:", throttling);
    if (res.status !== 503 || attempt >= PUBCHEM_RETRY_DELAYS_MS.length) break;
    console.warn(`PubChem 서버 바쁨(503), ${PUBCHEM_RETRY_DELAYS_MS[attempt]}ms 후 재시도...`);
    await sleep(PUBCHEM_RETRY_DELAYS_MS[attempt]);
  }
  if (!res.ok) {
    console.warn("PubChem 응답 실패:", res.status, res.statusText);
    pubchemLastErrorReason = res.status === 503 ? "busy" : "not_found";
    return null;
  }
  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.warn("PubChem 응답이 JSON이 아님:", e);
    pubchemLastErrorReason = "not_found";
    return null;
  }
  const props = data && data.PropertyTable && data.PropertyTable.Properties && data.PropertyTable.Properties[0];
  if (!props) {
    console.warn("PubChem 응답에 PropertyTable이 없음:", data);
    pubchemLastErrorReason = "not_found";
    return null;
  }
  for (const key of PUBCHEM_SMILES_PROPERTIES) {
    if (props[key]) return props[key];
  }
  console.warn("PubChem 응답에서 SMILES 필드를 못 찾음:", props);
  pubchemLastErrorReason = "not_found";
  return null;
}
