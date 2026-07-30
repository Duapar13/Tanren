const DEFAULT_TRAINING_DAYS = [1, 2, 3, 4, 5]; // lundi-vendredi

export function isTrainingDay(date: Date, trainingDays: number[] = DEFAULT_TRAINING_DAYS): boolean {
  const days = trainingDays.length > 0 ? trainingDays : DEFAULT_TRAINING_DAYS;
  return days.includes(date.getDay());
}
