// chem.js
// SMILES -> functional-group flags, computed via RDKit.js (WASM) SMARTS matching.
// Replaces the previously hand-picked COMPOUNDS[].flags with automatic detection,
// so RULES/reason logic in data.js works unchanged for any valid SMILES.

const FUNCTIONAL_GROUP_SMARTS = {
  alcohol_1: "[CX4;H2,H3][OX2H1]",
  alcohol_2: "[CX4;H1]([#6])([#6])[OX2H1]",
  alcohol_3: "[CX4;H0]([#6])([#6])([#6])[OX2H1]",
  ketone: "[#6][CX3](=O)[#6]",
  aldehyde: "[CX3H1](=O)[#6]",
  ester: "[CX3](=O)[OX2][#6]",
  carboxylic_acid: "[CX3](=O)[OX2H1]",
  alpha_H: "[CX4;H1,H2,H3][CX3]=O",
  alkene: "[CX3]=[CX3]",
  aromatic_ring: "[a]",
  haloalkane: "[CX4][F,Cl,Br,I]",
  oxime: "[CX3]=[NX2][OX2H1]",
  quaternary_ammonium: "[NX4+]",
  vicinal_diol: "[OX2H1][CX4][CX4][OX2H1]",
  alkane_adjacent_H: "[CX4;H1,H2,H3][CX4;H1,H2,H3]",
};

let rdkitReadyPromise = null;

function loadRDKit() {
  if (!rdkitReadyPromise) {
    rdkitReadyPromise = window
      .initRDKitModule({ locateFile: () => "vendor/rdkit/RDKit_minimal.wasm" })
      .then((RDKit) => {
        window.RDKit = RDKit;
        return RDKit;
      });
  }
  return rdkitReadyPromise;
}

function hasSubstructMatch(mol, smarts) {
  const RDKit = window.RDKit;
  const qmol = RDKit.get_qmol(smarts);
  const match = JSON.parse(mol.get_substruct_match(qmol));
  const has = Array.isArray(match) ? match.length > 0 : Object.keys(match).length > 0;
  qmol.delete();
  return has;
}

// Returns { flags, canonicalSmiles } or null if the SMILES is invalid.
function analyzeSmiles(smiles) {
  const RDKit = window.RDKit;
  const mol = RDKit.get_mol(smiles);
  if (!mol) return null;
  const flags = {};
  for (const key in FUNCTIONAL_GROUP_SMARTS) {
    flags[key] = hasSubstructMatch(mol, FUNCTIONAL_GROUP_SMARTS[key]);
  }
  const canonicalSmiles = mol.get_smiles();
  mol.delete();
  return { flags, canonicalSmiles };
}
