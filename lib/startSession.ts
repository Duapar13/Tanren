import { router } from 'expo-router';

export interface StartSessionOptions {
  /** Exercises to pre-load into the session (local ids). */
  exerciseIds?: number[];
  /** Local id of a workout template whose exercises should be pre-loaded. */
  templateId?: number;
}

/** Single entry point for "start working out" — the centre tab button, the home card and templates
 * all go through here so the destination can change in one place. */
export function openSession(options: StartSessionOptions = {}): void {
  router.push({
    pathname: '/(tabs)/seance',
    params: {
      ...(options.exerciseIds && options.exerciseIds.length > 0 ? { exerciseIds: options.exerciseIds.join(',') } : {}),
      ...(options.templateId != null ? { templateId: String(options.templateId) } : {}),
      nonce: String(Date.now()),
    },
  });
}
