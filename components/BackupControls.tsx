import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Card } from './Card';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { Spacing } from '../constants/theme';
import { backupNow, restoreLatest } from '../utils/backup';

export function BackupControls() {
  const db = useSQLiteContext();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleBackup = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const ok = await backupNow(db);
      setStatus(ok ? 'Sauvegarde envoyée ✓' : 'Échec — pas de connexion au serveur ?');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restaurer la dernière sauvegarde',
      'Ça remplace toutes les données actuelles sur ce téléphone par la dernière sauvegarde du serveur. Il faudra ensuite fermer et rouvrir l’app.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setStatus(null);
            try {
              const ok = await restoreLatest();
              setStatus(
                ok
                  ? 'Restauré — ferme et rouvre l’app maintenant'
                  : 'Échec — pas de sauvegarde disponible ou pas de connexion'
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Card style={{ gap: Spacing.sm }}>
      <ThemedText variant="headline">Sauvegarde</ThemedText>
      <ThemedText variant="footnote" color="secondary">
        Une copie de tes données est envoyée automatiquement vers le serveur quand il y a du
        réseau.
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Button title="Sauvegarder maintenant" onPress={handleBackup} disabled={busy} style={{ flex: 1 }} />
      </View>
      <Button title="Restaurer la dernière sauvegarde" variant="destructive" onPress={handleRestore} disabled={busy} />
      {status && (
        <ThemedText variant="footnote" color="secondary">
          {status}
        </ThemedText>
      )}
    </Card>
  );
}
