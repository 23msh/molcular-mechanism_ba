// script.js
let selectedCompound = null;
let selectedReaction = null;

function analyze(flags) {
  const standalone = RULES.filter((r) => r.category === "standalone" && r.condition(flags));
  const reagent = RULES.filter((r) => r.category === "reagent" && r.condition(flags));
  return { standalone, reagent };
}

function selectCompound(compound) {
  selectedCompound = compound;
  selectedReaction = null;
  renderCompoundList();
  renderResults();
  renderMechanism();
}

// 예시 화합물 버튼도 검색과 동일하게 analyzeSmiles()로 flags를 계산해, 손으로 정의한
// COMPOUNDS[].flags와 실제 자동판별 결과가 항상 일치하는지 그대로 검증하며 동작한다.
function selectCompoundBySmiles(smiles, displayName) {
  const result = analyzeSmiles(smiles);
  if (!result) {
    showSmilesStatus(`"${smiles}"는 올바른 SMILES가 아닙니다.`, true);
    return;
  }
  showSmilesStatus("", false);
  selectCompound({
    id: result.canonicalSmiles,
    name: displayName || result.canonicalSmiles,
    formula: result.canonicalSmiles,
    flags: result.flags,
  });
}

// 검색창 입력 처리 순서:
// 1) 이름 사전(names.js)에서 SMILES로 치환 시도
// 2) (사전에 없으면) 입력을 그대로 SMILES로 파싱 시도
// 3) (그것도 안 되면) PubChem PUG REST API로 실시간 이름 조회 (인터넷 필요)
async function selectCompoundByUserInput(rawInput) {
  const { smiles, matchedLabel, polymerNote } = resolveCompoundInput(rawInput);
  if (polymerNote) {
    showSmilesStatus(polymerNote, true);
    return;
  }

  const localResult = analyzeSmiles(smiles);
  if (localResult) {
    showSmilesStatus(matchedLabel ? `"${rawInput}" → ${matchedLabel}로 해석했습니다.` : "", false);
    selectCompound({
      id: localResult.canonicalSmiles,
      name: matchedLabel || rawInput,
      formula: localResult.canonicalSmiles,
      flags: localResult.flags,
    });
    return;
  }

  showSmilesStatus(`"${rawInput}"를 PubChem에서 조회하는 중...`, false);
  const pubchemSmiles = await lookupSmilesFromPubChem(rawInput);
  if (!pubchemSmiles) {
    if (getPubchemLastErrorReason() === "busy") {
      showSmilesStatus(`PubChem 서버가 지금 요청이 몰려 응답하지 못하고 있습니다 (503). 잠시(수십 초~1분) 후 "${rawInput}"를 다시 검색해보세요.`, true);
      return;
    }
    // PubChem은 영문 이름(IUPAC명·관용명)으로만 검색되므로, 한글 입력이 실패한 경우
    // 영문으로 다시 시도해보라고 안내한다 (로컬 사전에 없는 한글명은 PubChem도 모름).
    const hasHangul = /[가-힣]/.test(rawInput);
    const hint = hasHangul
      ? " PubChem은 한글 이름을 인식하지 못하니 영문 이름으로 다시 시도해보세요."
      : "";
    showSmilesStatus(`"${rawInput}"를 화합물 이름이나 SMILES로 인식하지 못했습니다 (PubChem에서도 찾지 못했습니다).${hint}`, true);
    return;
  }
  const pubchemResult = analyzeSmiles(pubchemSmiles);
  if (!pubchemResult) {
    showSmilesStatus(`PubChem에서 "${rawInput}"의 구조는 찾았지만 해석하지 못했습니다.`, true);
    return;
  }
  showSmilesStatus(`"${rawInput}" → PubChem 조회 결과로 해석했습니다 (SMILES: ${pubchemSmiles}).`, false);
  selectCompound({
    id: pubchemResult.canonicalSmiles,
    name: rawInput,
    formula: pubchemResult.canonicalSmiles,
    flags: pubchemResult.flags,
  });
}

function showSmilesStatus(text, isError) {
  const el = document.getElementById("smiles-status");
  el.textContent = text;
  el.hidden = !text;
  el.classList.toggle("smiles-status-error", !!isError);
}

function setupSmilesSearch() {
  const form = document.getElementById("smiles-form");
  const input = document.getElementById("smiles-input");
  const submit = document.getElementById("smiles-submit");

  showSmilesStatus("RDKit 로딩 중...", false);
  loadRDKit()
    .then(() => {
      input.disabled = false;
      submit.disabled = false;
      showSmilesStatus("", false);
    })
    .catch(() => {
      showSmilesStatus("RDKit을 불러오지 못했습니다. 네트워크 연결을 확인하세요.", true);
    });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    if (!raw) return;
    submit.disabled = true;
    try {
      await selectCompoundByUserInput(raw);
    } finally {
      submit.disabled = false;
    }
  });
}

function renderCompoundList() {
  const list = document.getElementById("compound-list");
  list.innerHTML = "";
  COMPOUNDS.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "compound-item" + (selectedCompound && selectedCompound.id === c.id ? " selected" : "");
    btn.innerHTML = `<span class="cname">${c.name}</span><span class="cformula">${c.formula}</span>`;
    btn.addEventListener("click", () => selectCompoundBySmiles(c.formula, c.name));
    list.appendChild(btn);
  });
}

function reactionRow(rule) {
  const li = document.createElement("li");
  li.className = "reaction-item" + (rule.category === "reagent" ? " reagent" : "");
  const btn = document.createElement("button");
  if (selectedReaction === rule.name) btn.classList.add("active");
  const metaText = rule.category === "reagent" ? rule.reagent : "단독";
  btn.innerHTML = `<span class="reaction-name">${rule.name}</span><span class="reaction-meta">${metaText}</span>`;
  btn.addEventListener("click", () => {
    selectedReaction = rule.name;
    renderResults();
    renderMechanism();
  });
  li.appendChild(btn);
  return li;
}

function reasonRow(rule, flags) {
  const li = document.createElement("li");
  li.className = "reason-item";
  const reasonText = rule.reason ? rule.reason(flags) : "이 화합물의 구조가 조건을 만족하지 않습니다.";
  li.innerHTML = `<span class="reason-name">${rule.name}</span><span class="reason-text">${reasonText}</span>`;
  return li;
}

function renderResults() {
  const empty = document.getElementById("results-empty");
  const body = document.getElementById("results-body");

  if (!selectedCompound) {
    empty.hidden = false;
    body.hidden = true;
    return;
  }
  empty.hidden = true;
  body.hidden = false;

  const { standalone, reagent } = analyze(selectedCompound.flags);

  const standaloneList = document.getElementById("standalone-list");
  standaloneList.innerHTML = "";
  if (standalone.length === 0) {
    RULES.filter((r) => r.category === "standalone").forEach((r) =>
      standaloneList.appendChild(reasonRow(r, selectedCompound.flags))
    );
  } else {
    standalone.forEach((r) => standaloneList.appendChild(reactionRow(r)));
  }

  const reagentList = document.getElementById("reagent-list");
  reagentList.innerHTML = "";
  if (reagent.length === 0) {
    reagentList.innerHTML = `<li class="empty-state" style="padding:4px 0">해당 없음</li>`;
  } else {
    reagent.forEach((r) => reagentList.appendChild(reactionRow(r)));
  }
}

function renderMechanism() {
  const empty = document.getElementById("mechanism-empty");
  const body = document.getElementById("mechanism-body");
  const titleEl = document.getElementById("mechanism-title");
  const stepsEl = document.getElementById("mechanism-steps");
  const missingEl = document.getElementById("mechanism-missing");

  if (!selectedReaction) {
    empty.hidden = false;
    body.hidden = true;
    return;
  }
  empty.hidden = true;
  body.hidden = false;
  titleEl.textContent = selectedReaction;

  const steps = MECHANISMS[selectedReaction];
  stepsEl.innerHTML = "";

  if (!steps) {
    missingEl.hidden = false;
    return;
  }
  missingEl.hidden = true;
  steps.forEach((s) => {
    const li = document.createElement("li");
    const diagramHtml = s.diagram ? `<div class="mechanism-diagram">${s.diagram}</div>` : "";
    li.innerHTML = `<p class="step-title">${s.title}</p>${diagramHtml}<p class="step-desc">${s.desc}</p>`;
    stepsEl.appendChild(li);
  });
}

renderCompoundList();
renderResults();
renderMechanism();
setupSmilesSearch();
