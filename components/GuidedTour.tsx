import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../hooks/useTheme';
import { Radius, Spacing } from '../constants/theme';

interface Step {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { icon: 'home', title: 'Accueil', description: "Ta séance du jour et un aperçu de ton rang, en un coup d'œil." },
  { icon: 'barbell', title: 'Séance', description: 'Logge tes séries pendant l’entraînement, exercice par exercice.' },
  { icon: 'trending-up', title: 'Progression', description: 'Ton historique, tes records personnels et tes stats mensuelles.' },
  { icon: 'shield', title: 'Rang', description: 'Gagne des points, débloque des badges, grimpe le classement.' },
  { icon: 'nutrition', title: 'Nutrition', description: 'Calories, macros, poids de corps et mensurations.' },
  { icon: 'person', title: 'Profil', description: 'Ton compte, ton programme, tes réglages.' },
];

interface Props {
  visible: boolean;
  onFinish: () => void;
}

export function GuidedTour({ visible, onFinish }: Props) {
  const { colors } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      setStepIndex(0);
      onFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: Spacing.xl,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: colors.card,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: Spacing.lg,
            gap: Spacing.md,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.accent + '26',
              borderWidth: 2,
              borderColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={step.icon} size={30} color={colors.accent} />
          </View>
          <ThemedText variant="title3" weight="700">
            {step.title}
          </ThemedText>
          <ThemedText color="secondary" style={{ textAlign: 'center' }}>
            {step.description}
          </ThemedText>

          <View style={{ flexDirection: 'row', gap: 6, marginTop: Spacing.xs }}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === stepIndex ? colors.accent : colors.separator,
                }}
              />
            ))}
          </View>

          <Pressable
            onPress={next}
            style={{
              width: '100%',
              paddingVertical: Spacing.md,
              borderRadius: Radius.md,
              backgroundColor: colors.accent,
              alignItems: 'center',
              marginTop: Spacing.xs,
            }}
          >
            <ThemedText variant="subhead" weight="600" style={{ color: '#FFFFFF' }}>
              {isLast ? "C'est parti" : 'Suivant'}
            </ThemedText>
          </Pressable>
          {!isLast && (
            <Pressable onPress={onFinish}>
              <ThemedText variant="footnote" color="tertiary">
                Passer
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
