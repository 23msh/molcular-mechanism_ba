// script.js
let selectedCompound = null;
let selectedReaction = null;

function analyze(flags) {
  const standalone = RULES.filter((r) => r.category === "standalone" && r.condition(flags));
  const reagent = RULES.filter((r) => r.category === "reagent" && r.condition(flags));
  return { standalone, reagent };
}

function renderCompoundList() {
  const list = document.getElementById("compound-list");
  list.innerHTML = "";
  COMPOUNDS.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "compound-item" + (selectedCompound && selectedCompound.id === c.id ? " selected" : "");
    btn.innerHTML = `<span class="cname">${c.name}</span><span class="cformula">${c.formula}</span>`;
    btn.addEventListener("click", () => {
      selectedCompound = c;
      selectedReaction = null;
      renderCompoundList();
      renderResults();
      renderMechanism();
    });
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

function reasonHeader(text) {
  const li = document.createElement("li");
  li.className = "empty-state reason-header";
  li.textContent = text;
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
    standaloneList.appendChild(reasonHeader("해당 없음 — 아래는 각 단독 반응이 성립하지 않는 이유입니다."));
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
    li.innerHTML = `<p class="step-title">${s.title}</p><p class="step-desc">${s.desc}</p>`;
    stepsEl.appendChild(li);
  });
}

renderCompoundList();
renderResults();
renderMechanism();
