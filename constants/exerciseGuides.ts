/**
 * Static, curated execution cues for common gym exercises — matched by normalized name
 * (same normalization as the server's cross-user matching, see server/src/utils/ranking.js)
 * since every exercise in this app is free-text the user typed themselves, not picked from
 * a shared library (see db/schema.ts's v1->v2 migration note). No match just means no guide
 * shown — never a blocker, never fabricated for a name we don't recognize.
 *
 * Kept intentionally short (2-4 cues) and generic/standard-form — this is not a substitute
 * for real coaching, just a quick on-screen reminder while logging a set.
 */

export interface ExerciseGuide {
  cues: string[];
}

function normalizeExerciseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const GUIDES: Record<string, ExerciseGuide> = {
  // ── Machines haut du corps ──
  'chest press': {
    cues: [
      'Dos et tête plaqués au dossier, poignées à hauteur de poitrine',
      'Pousse sans bloquer les coudes en fin de mouvement',
      'Reviens lentement jusqu\'à sentir un léger étirement, sans à-coup',
    ],
  },
  'incline chest press': {
    cues: [
      'Dossier incliné, omoplates serrées contre le siège',
      'Pousse vers le haut/l\'avant en gardant les coudes légèrement rentrés',
      'Contrôle la descente, ne laisse pas les charges retomber',
    ],
  },
  'lat machine': {
    cues: [
      'Buste légèrement en arrière, prise plus large que les épaules',
      'Tire la barre vers le haut de la poitrine en amenant les coudes vers le bas',
      'Évite de te servir du dos pour "tricher" la traction',
    ],
  },
  'pull down': {
    cues: [
      'Position stable, gainage engagé',
      'Tire en amenant les coudes le long du corps, pas en arrière',
      'Reviens en contrôlant jusqu\'à l\'extension complète des bras',
    ],
  },
  'low row': {
    cues: [
      'Dos droit, buste fixe pendant tout le mouvement',
      'Tire vers le bas du buste en resserrant les omoplates',
      'Ne te penche pas en arrière pour finir le mouvement',
    ],
  },
  shrug: {
    cues: [
      'Bras tendus, charge le long du corps',
      'Monte les épaules droit vers le haut, sans les rouler',
      'Marque une pause en haut puis redescends lentement',
    ],
  },
  'triceps poulie haute': {
    cues: [
      'Coudes fixes le long du corps, ne bougent pas pendant l\'exercice',
      'Pousse la poignée vers le bas jusqu\'à extension complète',
      'Reviens en contrôlant sans laisser les coudes remonter',
    ],
  },
  'triceps poulie mid': {
    cues: [
      'Coudes fixes, légèrement écartés du corps',
      'Extension complète du bras en fin de mouvement',
      'Retour contrôlé, sans à-coup sur l\'épaule',
    ],
  },
  'curl biceps altere': {
    cues: [
      'Coudes fixes le long du corps pendant tout le mouvement',
      'Monte en contractant le biceps, sans balancer le buste',
      'Redescends lentement jusqu\'à extension complète du bras',
    ],
  },
  'elevation laterale altere': {
    cues: [
      'Léger fléchissement des coudes, maintenu tout du long',
      'Lève les bras jusqu\'à hauteur d\'épaule, pas plus haut',
      'Redescends lentement — c\'est la phase la plus importante',
    ],
  },
  'rear kick': {
    cues: [
      'Buste incliné en appui, dos plat',
      'Tends la jambe en arrière en contractant le fessier',
      'Reviens en contrôlant, sans balancer la jambe',
    ],
  },

  // ── Machines bas du corps ──
  'leg extension': {
    cues: [
      'Dos plaqué au dossier, genoux alignés avec l\'axe de la machine',
      'Tends les jambes sans les bloquer en extension complète',
      'Redescends lentement, sans laisser retomber la charge',
    ],
  },
  'leg curl': {
    cues: [
      'Bassin plaqué contre le rembourrage',
      'Fléchis les jambes en amenant les talons vers les fessiers',
      'Contrôle la remontée, ne laisse pas la charge retomber',
    ],
  },
  'hip thrust': {
    cues: [
      'Haut du dos calé sur le banc, menton légèrement rentré',
      'Pousse le bassin vers le haut en contractant les fessiers',
      'Évite de cambrer excessivement le bas du dos en haut du mouvement',
    ],
  },
  abducteur: {
    cues: [
      'Dos droit contre le dossier',
      'Écarte les jambes contre la résistance, mouvement contrôlé',
      'Reviens lentement sans laisser les charges claquer entre elles',
    ],
  },
  adductor: {
    cues: [
      'Dos droit contre le dossier',
      'Resserre les jambes contre la résistance, mouvement contrôlé',
      'Reviens lentement sans à-coup',
    ],
  },

  // ── Vocabulaire courant (pour couvrir d'autres noms probables) ──
  squat: {
    cues: [
      'Pieds largeur d\'épaules, dos droit tout du long',
      'Descends en poussant les hanches vers l\'arrière, genoux dans l\'axe des pieds',
      'Remonte en poussant dans les talons, sans bloquer les genoux',
    ],
  },
  deadlift: {
    cues: [
      'Barre proche des tibias, dos plat du début à la fin',
      'Pousse dans le sol avec les jambes, la barre longe les jambes',
      'Termine hanches tendues, sans hyperextension du bas du dos',
    ],
  },
  'developpe couche': {
    cues: [
      'Omoplates serrées, légère cambrure naturelle du dos',
      'Descends la barre au niveau de la poitrine, coudes à ~45°',
      'Pousse sans rebondir la barre sur la poitrine',
    ],
  },
  'developpe militaire': {
    cues: [
      'Gainage engagé, ne cambre pas excessivement le bas du dos',
      'Pousse la barre au-dessus de la tête en ligne droite',
      'Redescends en contrôlant jusqu\'à hauteur d\'épaules',
    ],
  },
  traction: {
    cues: [
      'Départ bras tendus, engage les omoplates avant de tirer',
      'Tire jusqu\'à ce que le menton dépasse la barre',
      'Redescends en contrôlant, sans te laisser tomber',
    ],
  },
  dips: {
    cues: [
      'Buste légèrement penché en avant pour cibler les pectoraux',
      'Descends jusqu\'à un angle de coude à ~90°',
      'Pousse sans bloquer violemment les coudes en haut',
    ],
  },
  fentes: {
    cues: [
      'Grand pas en avant, dos droit',
      'Descends jusqu\'à ce que le genou arrière frôle le sol',
      'Pousse dans le talon avant pour remonter',
    ],
  },
  'presse a cuisses': {
    cues: [
      'Bas du dos plaqué contre le siège en permanence',
      'Descends jusqu\'à un angle de 90° au genou, pas plus',
      'Pousse sans bloquer les genoux en extension complète',
    ],
  },
  gainage: {
    cues: [
      'Corps aligné des épaules aux chevilles, pas de bassin qui tombe',
      'Contracte abdos et fessiers pendant tout le maintien',
      'Respire normalement, ne bloque pas ta respiration',
    ],
  },
};

export function findExerciseGuide(name: string): ExerciseGuide | null {
  return GUIDES[normalizeExerciseName(name)] ?? null;
}
