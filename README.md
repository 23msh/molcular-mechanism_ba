# 반응 경로 탐색기

화합물을 선택하면 가능한 반응 목록(단독 반응 / 시약 필요 반응)을 보여주고,
반응을 클릭하면 단계별 메커니즘을 보여주는 정적 웹사이트입니다.
빌드 과정이 필요 없는 순수 HTML/CSS/JS라서 GitHub Pages에 바로 올릴 수 있습니다.

## 파일 구성

- `index.html` — 페이지 구조
- `styles.css` — 디자인
- `data.js` — 반응 규칙(RULES) · 메커니즘(MECHANISMS) · 예시 화합물(COMPOUNDS) 데이터
- `script.js` — 화면 렌더링 및 클릭 상호작용

## GitHub에 올려서 바로 사이트로 만들기

1. GitHub에서 새 저장소를 만듭니다 (예: `reaction-explorer`).
2. 이 폴더 안의 4개 파일(`index.html`, `styles.css`, `data.js`, `script.js`)을
   저장소 루트에 그대로 올립니다 (커밋 & 푸시).
3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Source**를 `Deploy from a branch`로 설정하고,
   Branch를 `main` / 폴더를 `/ (root)`로 선택한 뒤 저장합니다.
5. 1~2분 후 `https://<사용자명>.github.io/<저장소이름>/` 주소로 접속하면 사이트가 보입니다.

## 지금 상태 / 다음에 할 일

- 화합물은 `data.js`의 `COMPOUNDS` 배열에 3개(4-hydroxy-2-pentanone, 2-butene, benzoic acid)만
  미리 정의된 "작용기 플래그" 방식입니다. SMILES를 입력하면 자동으로 판별하는 기능은 아직 없습니다.
- 메커니즘은 `MECHANISMS`에 3개 반응(알돌 축합, 탈수 반응, 카니자로 반응)만 채워져 있습니다.
  나머지 반응을 클릭하면 "아직 등록되지 않음" 메시지가 뜹니다.
- 다음 확장 방향:
  1. `COMPOUNDS`에 화합물을 더 추가 (직접 flags를 채워서)
  2. `MECHANISMS`에 나머지 반응들의 단계 추가
  3. SMILES 입력 → 자동 작용기 판별 (RDKit.js 도입 시)
