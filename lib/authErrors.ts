import { ApiError } from './api';

const MESSAGES: Record<string, string> = {
  invalid_email: 'Adresse email invalide.',
  invalid_username: 'Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, _).',
  username_taken: 'Ce pseudo est déjà pris.',
  email_taken: 'Cet email est déjà utilisé par un autre compte.',
  invalid_file: 'Format de fichier invalide.',
  invalid_file_type: 'Le fichier doit être une image.',
  missing_file: 'Aucune image sélectionnée.',
  no_push_token: 'Les notifications ne sont pas encore activées.',
  unauthenticated: 'Session expirée, reconnecte-toi.',
  google_verification_failed: 'Connexion Google impossible pour le moment.',
  apple_verification_failed: 'Connexion Apple impossible pour le moment.',
  timeout: 'Le serveur ne répond pas, réessaie.',
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return MESSAGES[err.code] ?? 'Une erreur est survenue, réessaie.';
  }
  return 'Impossible de contacter le serveur, vérifie ta connexion.';
}
