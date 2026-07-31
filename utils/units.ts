export type WeightUnit = 'kg' | 'lbs';
export type LengthUnit = 'cm' | 'in';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

/** Every weight/length value is stored in kg/cm — these only convert at the display/input
 * boundary so the DB, sync, and stats math never have to care which unit the user picked. */
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? kg / KG_PER_LB : kg;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'lbs' ? value * KG_PER_LB : value;
}

export function cmToDisplay(cm: number, unit: LengthUnit): number {
  return unit === 'in' ? cm / CM_PER_IN : cm;
}

export function displayToCm(value: number, unit: LengthUnit): number {
  return unit === 'in' ? value * CM_PER_IN : value;
}

export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  const value = kgToDisplay(kg, unit);
  const rounded = decimals === 0 ? Math.round(value) : Number(value.toFixed(decimals));
  return `${rounded} ${unit}`;
}

export function formatLength(cm: number, unit: LengthUnit, decimals = 0): string {
  const value = cmToDisplay(cm, unit);
  const rounded = decimals === 0 ? Math.round(value) : Number(value.toFixed(decimals));
  return `${rounded} ${unit === 'in' ? 'in' : 'cm'}`;
}
