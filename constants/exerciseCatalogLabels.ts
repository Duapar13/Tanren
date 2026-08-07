/**
 * Human-checked translations for the exercise catalog's small, fixed taxonomy (body part,
 * equipment, target muscle) — English key as returned by the API, one label per supported
 * language. NOT machine-translated: a first pass through the same free translation endpoint
 * used for exercise descriptions produced real howlers on these short, context-free terms
 * ("abductors" -> "ravisseurs" [kidnappers], "smith machine" -> "machine de forgeron"
 * [blacksmith machine], "traps" -> "pièges" [animal traps]) — short technical vocabulary
 * needs a human, full sentences translate fine on their own (see translate-exercise-catalog.js).
 * English itself is never looked up here — the raw API value already *is* the English label.
 */
import { SupportedLanguage } from '../hooks/useTranslation';

type LabelMap = Partial<Record<Exclude<SupportedLanguage, 'en'>, string>>;

export const BODY_PART_LABELS: Record<string, LabelMap> = {
  back: { fr: 'dos', es: 'espalda', it: 'schiena' },
  cardio: { fr: 'cardio', es: 'cardio', it: 'cardio' },
  chest: { fr: 'poitrine', es: 'pecho', it: 'petto' },
  'lower arms': { fr: 'avant-bras', es: 'antebrazos', it: 'avambracci' },
  'lower legs': { fr: 'bas des jambes', es: 'piernas (parte baja)', it: 'parte inferiore delle gambe' },
  neck: { fr: 'cou', es: 'cuello', it: 'collo' },
  shoulders: { fr: 'épaules', es: 'hombros', it: 'spalle' },
  'upper arms': { fr: 'haut des bras', es: 'brazos (parte superior)', it: 'parte superiore delle braccia' },
  'upper legs': { fr: 'haut des jambes', es: 'piernas (parte superior)', it: 'parte superiore delle gambe' },
  waist: { fr: 'taille', es: 'cintura', it: 'vita' },
};

export const EQUIPMENT_LABELS: Record<string, LabelMap> = {
  assisted: { fr: 'assisté', es: 'asistido', it: 'assistito' },
  'assisted (towel)': { fr: 'assisté (serviette)', es: 'asistido (toalla)', it: 'assistito (asciugamano)' },
  band: { fr: 'élastique', es: 'banda elástica', it: 'elastico' },
  barbell: { fr: 'barre', es: 'barra', it: 'bilanciere' },
  'body weight': { fr: 'poids du corps', es: 'peso corporal', it: 'corpo libero' },
  'body weight (with resistance band)': { fr: 'poids du corps (avec élastique)', es: 'peso corporal (con banda elástica)', it: 'corpo libero (con elastico)' },
  'bosu ball': { fr: 'bosu', es: 'bosu', it: 'bosu' },
  cable: { fr: 'poulie', es: 'polea', it: 'cavo' },
  dumbbell: { fr: 'haltère', es: 'mancuerna', it: 'manubrio' },
  'dumbbell (used as handles for deeper range)': { fr: 'haltère (comme poignées, amplitude accrue)', es: 'mancuerna (como agarres, mayor rango)', it: 'manubrio (come maniglie, escursione maggiore)' },
  'dumbbell, exercise ball': { fr: 'haltère, swiss ball', es: 'mancuerna, fitball', it: 'manubrio, palla fitness' },
  'dumbbell, exercise ball, tennis ball': { fr: 'haltère, swiss ball, balle de tennis', es: 'mancuerna, fitball, pelota de tenis', it: 'manubrio, palla fitness, pallina da tennis' },
  'elliptical machine': { fr: 'vélo elliptique', es: 'elíptica', it: 'ellittica' },
  'ez barbell': { fr: 'barre EZ', es: 'barra Z', it: 'bilanciere EZ' },
  'ez barbell, exercise ball': { fr: 'barre EZ, swiss ball', es: 'barra Z, fitball', it: 'bilanciere EZ, palla fitness' },
  hammer: { fr: 'prise marteau', es: 'agarre martillo', it: 'presa a martello' },
  kettlebell: { fr: 'kettlebell', es: 'kettlebell', it: 'kettlebell' },
  'leverage machine': { fr: 'machine à levier', es: 'máquina de palanca', it: 'macchina a leva' },
  'medicine ball': { fr: 'médecine ball', es: 'balón medicinal', it: 'palla medica' },
  'olympic barbell': { fr: 'barre olympique', es: 'barra olímpica', it: 'bilanciere olimpico' },
  'resistance band': { fr: 'élastique de résistance', es: 'banda de resistencia', it: 'elastico di resistenza' },
  roller: { fr: 'rouleau', es: 'rodillo', it: 'rullo' },
  rope: { fr: 'corde', es: 'cuerda', it: 'corda' },
  'skierg machine': { fr: 'skierg', es: 'skierg', it: 'skierg' },
  'sled machine': { fr: 'traîneau', es: 'trineo', it: 'slitta' },
  'smith machine': { fr: 'machine Smith', es: 'máquina Smith', it: 'macchina Smith' },
  'stability ball': { fr: 'swiss ball', es: 'fitball', it: 'palla fitness' },
  'stationary bike': { fr: 'vélo stationnaire', es: 'bicicleta estática', it: 'cyclette' },
  'stepmill machine': { fr: 'stepmill', es: 'stepmill', it: 'stepmill' },
  tire: { fr: 'pneu', es: 'neumático', it: 'pneumatico' },
  'trap bar': { fr: 'barre hexagonale', es: 'barra hexagonal', it: 'trap bar' },
  'upper body ergometer': { fr: 'ergomètre bras', es: 'ergómetro de brazos', it: 'ergometro per braccia' },
  weighted: { fr: 'lesté', es: 'con peso', it: 'zavorrato' },
  'wheel roller': { fr: 'roue abdominale', es: 'rueda abdominal', it: 'ruota per addominali' },
};

export const TARGET_LABELS: Record<string, LabelMap> = {
  abductors: { fr: 'abducteurs', es: 'abductores', it: 'abduttori' },
  abs: { fr: 'abdominaux', es: 'abdominales', it: 'addominali' },
  adductors: { fr: 'adducteurs', es: 'aductores', it: 'adduttori' },
  biceps: { fr: 'biceps', es: 'bíceps', it: 'bicipiti' },
  calves: { fr: 'mollets', es: 'pantorrillas', it: 'polpacci' },
  'cardiovascular system': { fr: 'système cardiovasculaire', es: 'sistema cardiovascular', it: 'sistema cardiovascolare' },
  delts: { fr: 'deltoïdes', es: 'deltoides', it: 'deltoidi' },
  forearms: { fr: 'avant-bras', es: 'antebrazos', it: 'avambracci' },
  glutes: { fr: 'fessiers', es: 'glúteos', it: 'glutei' },
  hamstrings: { fr: 'ischio-jambiers', es: 'isquiotibiales', it: 'bicipiti femorali' },
  lats: { fr: 'grand dorsal', es: 'dorsales', it: 'dorsali' },
  'levator scapulae': { fr: 'élévateur de la scapula', es: 'elevador de la escápula', it: 'elevatore della scapola' },
  pectorals: { fr: 'pectoraux', es: 'pectorales', it: 'pettorali' },
  quads: { fr: 'quadriceps', es: 'cuádriceps', it: 'quadricipiti' },
  'serratus anterior': { fr: 'dentelé antérieur', es: 'serrato anterior', it: 'dentato anteriore' },
  spine: { fr: 'colonne vertébrale', es: 'columna vertebral', it: 'colonna vertebrale' },
  traps: { fr: 'trapèzes', es: 'trapecios', it: 'trapezi' },
  triceps: { fr: 'triceps', es: 'tríceps', it: 'tricipiti' },
  'upper back': { fr: 'haut du dos', es: 'espalda alta', it: 'parte superiore della schiena' },
};

function lookup(map: Record<string, LabelMap>, key: string, lang: SupportedLanguage): string {
  if (lang === 'en') return key;
  return map[key]?.[lang] ?? key;
}

export const bodyPartLabel = (key: string, lang: SupportedLanguage) => lookup(BODY_PART_LABELS, key, lang);
export const equipmentLabel = (key: string, lang: SupportedLanguage) => lookup(EQUIPMENT_LABELS, key, lang);
export const targetLabel = (key: string, lang: SupportedLanguage) => lookup(TARGET_LABELS, key, lang);
