import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Tier, TIER_LABELS } from '../types';
import { useData } from '../context/DataContext';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { TanrenWordmark } from './TanrenWordmark';
import { Card } from './Card';
import { Button } from './Button';

interface TierOption {
  tier: Tier;
  criteria: string;
  program: string;
}

const TIER_OPTIONS: TierOption[] = [
  {
    tier: 1,
    criteria: 'Régularité — ex. 3 séances/semaine constantes.',
    program:
      'Full Body, 6 exercices de base par séance, règle des 10 min par exercice (charge fixe, max de reps en gérant le repos), 2 routines à alterner sur 3 mois.',
  },
  {
    tier: 2,
    criteria: 'Introduit le suivi nutritionnel et les 6 variables d’entraînement.',
    program:
      'Suivi protéines (1,8 g/kg), variables à surveiller : exercices, séries, répétitions, tempo, récupération, exécution. Passage au split Haut/Bas.',
  },
  {
    tier: 3,
    criteria: 'Focus schéma corporel/technique, entraînement à l’échec réel.',
    program:
      'Programmation en cycles évolutifs personnalisés selon points forts/faibles.',
  },
  {
    tier: 4,
    criteria: 'Notions avancées de biomécanique.',
    program:
      'Courbe de résistance par exercice, courbe de force sur l’amplitude, tension étirement vs contraction.',
  },
  {
    tier: 5,
    criteria: 'Auto-régulation à l’instinct, sans dépendance stricte aux métriques.',
    program: 'RPE et tonnage laissés au ressenti, guidés par l’expérience.',
  },
];

export function OnboardingScreen() {
  const { completeOnboarding } = useData();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<Tier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await completeOnboarding(selected);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView variant="grouped" style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
          <TanrenWordmark size={40} />
          <View style={{ gap: 4 }}>
            <ThemedText variant="title2">Où en es-tu ?</ThemedText>
            <ThemedText color="secondary">
              Choisis le palier qui te correspond le mieux aujourd’hui — ça
              détermine ton programme par défaut. Tu pourras en changer plus
              tard dans Profil.
            </ThemedText>
          </View>

          {TIER_OPTIONS.map((opt) => {
            const isSelected = selected === opt.tier;
            return (
              <Pressable key={opt.tier} onPress={() => setSelected(opt.tier)}>
                <Card
                  style={{
                    gap: Spacing.xs,
                    borderColor: isSelected ? colors.accent : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <ThemedText variant="headline">
                      {opt.tier}. {TIER_LABELS[opt.tier]}
                    </ThemedText>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isSelected ? colors.accent : colors.textTertiary}
                    />
                  </View>
                  <ThemedText variant="footnote" color="secondary">
                    {opt.criteria}
                  </ThemedText>
                  <ThemedText variant="footnote" color="tertiary">
                    {opt.program}
                  </ThemedText>
                </Card>
              </Pressable>
            );
          })}

          <Button
            title={submitting ? 'Configuration…' : 'Commencer'}
            onPress={handleConfirm}
            disabled={!selected || submitting}
            style={{ opacity: !selected ? 0.4 : 1 }}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
