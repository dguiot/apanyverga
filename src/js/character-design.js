'use strict';
// The single character art bible for Esmash, Kart and FPS.
// Change a palette, feature or costume here to update all three games.
const CHARACTER_DESIGNS = {
  "daniel": {
    "skin": "#b97a5a",
    "hair": "#2e241c",
    "hairBack": "long",
    "toonBeard": "short",
    "top": "#3d5e8e",
    "top2": "#2a4268",
    "pattern": "#cfc39c",
    "inner": "#f2efe9",
    "garment": "fleece",
    "sleeve": "long",
    "pants": "#2b2f3a",
    "shoe": "#1d1d1f",
    "sole": "#d9d4c8",
    "wrap": "#ece6da",
    "accent": "#2ec4b6",
    "build": {
      "chest": 17,
      "waist": 12.5,
      "arm": 0.98,
      "leg": 0.98
    },
    "prop": {
      "leg": 1,
      "torso": 1.05,
      "arm": 1.03,
      "head": 1.02
    }
  },
  "nacho": {
    "skin": "#d6a084",
    "hair": "#8a6444",
    "hairBack": "mullet",
    "toonBeard": "stubble",
    "top": "#1d1d21",
    "top2": "#101013",
    "garment": "tee",
    "sleeve": "short",
    "pants": "#39404e",
    "shoe": "#e8e4dc",
    "sole": "#8a8578",
    "glove": "#c1121f",
    "accent": "#ff9f1c",
    "build": {
      "chest": 20.5,
      "waist": 11.5,
      "arm": 1.18,
      "leg": 1.03
    },
    "prop": {
      "leg": 1.05,
      "torso": 1.03,
      "arm": 1.1,
      "head": 0.97
    }
  },
  "pablo": {
    "skin": "#cc8e70",
    "hair": "#231c18",
    "hairBack": "short",
    "toonBeard": "short",
    "top": "#9a9ca2",
    "top2": "#72747a",
    "garment": "hoodie",
    "sleeve": "long",
    "sash": "#d62839",
    "pants": "#23262d",
    "shoe": "#121216",
    "sole": "#3a3d45",
    "wrap": "#2a2d34",
    "accent": "#e63946",
    "build": {
      "chest": 15,
      "waist": 10,
      "arm": 0.9,
      "leg": 0.93
    },
    "prop": {
      "leg": 0.96,
      "torso": 0.95,
      "arm": 0.97,
      "head": 1.03
    }
  },
  "robes": {
    "skin": "#b98470",
    "hair": "#3b2f28",
    "hairBack": "bun",
    "beard": "full",
    "eye": "#241509",
    "top": "#1d1d21",
    "top2": "#111114",
    "garment": "tee",
    "sleeve": "short",
    "shades": true,
    "tattoo": "#2b3a4a",
    "pants": "#34404f",
    "shoe": "#4a3a2c",
    "sole": "#2a2119",
    "accent": "#95d5b2",
    "build": {
      "chest": 24.5,
      "waist": 19,
      "belly": 1,
      "arm": 1.4,
      "leg": 1.3
    },
    "prop": {
      "leg": 0.91,
      "torso": 1.1,
      "arm": 1.04,
      "head": 0.98,
      "neck": 0.7
    }
  },
  "nicole": {
    "skin": "#dcae95",
    "hair": "#65432e",
    "hairBack": "long",
    "hairLen": 46,
    "eye": "#3f6e8a",
    "lips": "#b5485d",
    "top": "#bfa28a",
    "top2": "#94796a",
    "garment": "blouse",
    "sleeve": "long",
    "necklace": true,
    "pants": "#2f3542",
    "shoe": "#efe9e1",
    "sole": "#a39a8f",
    "accent": "#48cae4",
    "build": {
      "chest": 13.5,
      "waist": 8.8,
      "hips": 12.5,
      "arm": 0.8,
      "leg": 0.88
    },
    "prop": {
      "leg": 1.12,
      "torso": 0.95,
      "arm": 1,
      "head": 0.93,
      "neck": 1.15
    }
  },
  "torito": {
    "species": "bull",
    "skin": "#6b4226",
    "fur": "#7d5030",
    "horn": "#efe6d2",
    "snout": "#c9a27e",
    "ring": "#ffd166",
    "eye": "#b3261e",
    "top": "#6b4226",
    "top2": "#4a2c17",
    "garment": "fur",
    "sleeve": "none",
    "pants": "#9d0208",
    "sash": "#ffd166",
    "shoe": "#2b1d14",
    "sole": "#140d08",
    "wrap": "#c9a27e",
    "accent": "#e63946",
    "tail": {
      "col": "#4a2c17",
      "tip": "#1e140e",
      "kind": "bull"
    },
    "build": {
      "chest": 23,
      "waist": 16,
      "arm": 1.3,
      "leg": 1.18
    }
  },
  "chispa": {
    "species": "robot",
    "skin": "#aeb8c4",
    "top": "#d9dee5",
    "top2": "#8d99ae",
    "garment": "armor",
    "sleeve": "none",
    "pants": "#5c677d",
    "shoe": "#2b2d42",
    "sole": "#ffd166",
    "glove": "#5c677d",
    "eye": "#48cae4",
    "accent": "#2ec4b6",
    "build": {
      "chest": 19,
      "waist": 12,
      "arm": 1.1,
      "leg": 1.05
    }
  },
  "michi": {
    "species": "cat",
    "skin": "#e39b4a",
    "belly": "#f6e1c3",
    "stripe": "#b86b2a",
    "eye": "#9bd94a",
    "mask": "#1d2230",
    "top": "#1d2230",
    "top2": "#12151e",
    "garment": "gi",
    "sleeve": "short",
    "sash": "#2ec4b6",
    "pants": "#1d2230",
    "shoe": "#e39b4a",
    "sole": "#f6e1c3",
    "wrap": "#1d2230",
    "accent": "#2ec4b6",
    "tail": {
      "col": "#e39b4a",
      "tip": "#f6e1c3",
      "stripe": "#b86b2a",
      "kind": "cat"
    },
    "build": {
      "chest": 13.5,
      "waist": 9.5,
      "arm": 0.85,
      "leg": 0.9
    }
  },
  "chilazo": {
    "species": "chile",
    "skin": "#3f9142",
    "top": "#f4efe8",
    "top2": "#d9d2c4",
    "garment": "chile",
    "sleeve": "long",
    "stem": "#4d7f2c",
    "stem2": "#86b94f",
    "maskCol": "#ffd166",
    "maskTrim": "#2ec4b6",
    "pants": "#f4efe8",
    "shoe": "#f7f2e8",
    "sole": "#5a3a22",
    "wrap": null,
    "accent": "#c1121f",
    "eye": "#10131a",
    "lips": "#5a1010",
    "belt": "#ffd166",
    "build": {
      "chest": 19,
      "waist": 15,
      "arm": 0.95,
      "leg": 0.92
    },
    "plan": "pepper",
    "feet": "boot",
    "bootH": 0,
    "boot": "#ffd166",
    "prop": {
      "leg": 0.92,
      "torso": 1,
      "arm": 1,
      "head": 1
    },
    "jarocho": 1,
    "pepper": "#3f9142",
    "pepper2": "#1f5e2a",
    "heel": 1,
    "hat": "#e9d6a4",
    "hat2": "#b99a5c",
    "hatBand": "#18181c",
    "scarf": "#c1121f"
  },
  "mariachi": {
    "species": "mariachi",
    "skin": "#c68b62",
    "hair": "#1b1512",
    "eye": "#2b1a10",
    "lips": "#7a3e2c",
    "top": "#17171b",
    "top2": "#0b0b0e",
    "garment": "charro",
    "sleeve": "long",
    "pants": "#17171b",
    "studs": "#d9dde3",
    "feet": "boot",
    "shoe": "#2b1d14",
    "sole": "#120c08",
    "heel": 1,
    "accent": "#e9c46a",
    "tie": "#c1121f",
    "shirt": "#f4efe8",
    "hat": "#1a1a1f",
    "hatTrim": "#d9dde3",
    "hatBand": "#e9c46a",
    "back": "guitar",
    "mustache": "#1b1512",
    "build": {
      "chest": 18,
      "waist": 12,
      "arm": 1,
      "leg": 1
    },
    "prop": {
      "leg": 1,
      "torso": 1.02,
      "arm": 1.02,
      "head": 1
    }
  },
  "chupa": {
    "species": "chupa",
    "skin": "#7d8c74",
    "skin2": "#4f5c49",
    "belly": "#a9b39b",
    "eye": "#ff2d2d",
    "spine": "#2f3a2c",
    "top": "#7d8c74",
    "top2": "#4f5c49",
    "garment": "chupa",
    "sleeve": "none",
    "pants": "#6c7a64",
    "hand": "claw",
    "claw": "#e9e4d4",
    "feet": "claw",
    "back": "spines",
    "accent": "#ff2d2d",
    "neckW": 6,
    "tail": {
      "kind": "chupa",
      "col": "#4f5c49",
      "tip": "#2f3a2c"
    },
    "build": {
      "chest": 14,
      "waist": 9,
      "arm": 0.8,
      "leg": 0.84
    },
    "prop": {
      "leg": 1.08,
      "torso": 0.98,
      "arm": 1.28,
      "head": 1.05,
      "neck": 1.25
    }
  },
  "dino": {
    "species": "dino",
    "skin": "#4f8f5d",
    "skin2": "#2f6b3d",
    "belly": "#e7d8a8",
    "stripe": "#2a5e36",
    "eye": "#ffbe0b",
    "teeth": "#f4efe8",
    "top": "#4f8f5d",
    "top2": "#2f6b3d",
    "garment": "scales",
    "sleeve": "none",
    "pants": "#4f8f5d",
    "scales": 1,
    "hand": "claw",
    "claw": "#f4efe8",
    "feet": "claw",
    "accent": "#ffbe0b",
    "neckW": 17,
    "tail": {
      "kind": "dino",
      "col": "#4f8f5d",
      "belly": "#e7d8a8",
      "spot": "#2a5e36"
    },
    "build": {
      "chest": 22,
      "waist": 18,
      "arm": 0.95,
      "leg": 1.42,
      "belly": 1
    },
    "prop": {
      "leg": 0.9,
      "torso": 0.95,
      "arm": 0.52,
      "head": 1.45,
      "neck": 0.85
    }
  },
  "luchador": {
    "species": "luchador",
    "skin": "#c98b62",
    "hair": "#d62828",
    "eye": "#2b1a10",
    "lips": "#7a3e2c",
    "mask": "#eef1f4",
    "mask2": "#ffbe0b",
    "maskTrim": "#d62828",
    "top": "#c98b62",
    "top2": "#a06a47",
    "garment": "bare",
    "sleeve": "none",
    "pants": "#d62828",
    "legCol": "#c98b62",
    "trunks": "#d62828",
    "bootH": 0.62,
    "boot": "#eef1f4",
    "feet": "boot",
    "shoe": "#eef1f4",
    "sole": "#d62828",
    "wrap": "#eef1f4",
    "back": "cape",
    "cape": "#d62828",
    "capeIn": "#ffbe0b",
    "accent": "#ffbe0b",
    "build": {
      "chest": 23.5,
      "waist": 13,
      "arm": 1.25,
      "leg": 1.12
    },
    "prop": {
      "leg": 1.02,
      "torso": 1.06,
      "arm": 1.08,
      "head": 0.98,
      "neck": 0.8
    }
  },
  "axo": {
    "species": "axo",
    "skin": "#f2a7bb",
    "skin2": "#d9829a",
    "belly": "#fbd6de",
    "gill": "#e0526f",
    "gill2": "#ff8fab",
    "eye": "#1b1418",
    "top": "#f2a7bb",
    "top2": "#d9829a",
    "garment": "axo",
    "sleeve": "none",
    "pants": "#f2a7bb",
    "hand": "mitt",
    "feet": "web",
    "bandana": "#2ec4b6",
    "accent": "#2ec4b6",
    "neckW": 12,
    "tail": {
      "kind": "axo",
      "col": "#f2a7bb",
      "fin": "rgba(255,196,210,.6)"
    },
    "build": {
      "chest": 15,
      "waist": 14.5,
      "arm": 0.95,
      "leg": 0.95,
      "belly": 1
    },
    "prop": {
      "leg": 0.78,
      "torso": 0.9,
      "arm": 0.86,
      "head": 1.32,
      "neck": 0.55
    }
  },
  "puentin": {
    "skin": "#c48a6c",
    "hair": "#221816",
    "hairBack": "short",
    "eye": "#2b1a10",
    "lips": "#9a5a48",
    "top": "#8a1531",
    "top2": "#5c0d20",
    "garment": "torero",
    "sleeve": "long",
    "gold": "#e9b949",
    "gold2": "#a8781f",
    "shirt": "#f6f1e7",
    "tie": "#141418",
    "faja": "#141418",
    "pants": "#8a1531",
    "braid": "#e9b949",
    "bootH": 0.46,
    "boot": "#f2a0b6",
    "feet": "slipper",
    "shoe": "#121216",
    "sole": "#050507",
    "bow": "#e9b949",
    "headwear": "montera",
    "montera": "#16161a",
    "hatY": 0.25,
    "hatS": 0.9,
    "accent": "#e9b949",
    "capote": "#c2185b",
    "capoteIn": "#f2c230",
    "build": {
      "chest": 16.5,
      "waist": 10.5,
      "arm": 0.95,
      "leg": 0.95
    },
    "prop": {
      "leg": 1.06,
      "torso": 1,
      "arm": 1.02,
      "head": 1
    },
    "toonBeard": "short"
  }
};

// Recognizable likeness comes from silhouette, hair, complexion and clothing,
// never a photo texture. These art dimensions do not change combat hitboxes.
const CharacterDesign = {
  version: 1,
  get(id) { const design=CHARACTER_DESIGNS[id]; if(!design)throw new Error('Unknown character: '+id); return design; },
  ids: Object.keys(CHARACTER_DESIGNS),
};
for(const [id,d] of Object.entries(CHARACTER_DESIGNS)) {
  d.id=id;
  d.art={roughness:d.species==='robot'?.32:.85,metalness:d.species==='robot'?.62:0};
  const freeze=o=>{for(const value of Object.values(o))if(value&&typeof value==='object')freeze(value);return Object.freeze(o);};
  freeze(d);
}
Object.freeze(CHARACTER_DESIGNS);Object.freeze(CharacterDesign.ids);Object.freeze(CharacterDesign);
// Compatibility name for the animated Canvas fallback and existing costume helpers.
// This is the same object, not a second set of designs.
const LOOKS=CHARACTER_DESIGNS;
