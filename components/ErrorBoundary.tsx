import { Component, ReactNode } from 'react';
import { View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Spacing } from '../constants/theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Ningyma crashed:', error, info.componentStack);
    Sentry.captureException(error);
  }

  render() {
    if (this.state.error) {
      return (
        <ThemedView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: Spacing.lg,
              gap: Spacing.sm,
            }}
          >
            <ThemedText variant="title2">Une erreur est survenue</ThemedText>
            <ThemedText color="secondary" style={{ textAlign: 'center' }}>
              {this.state.error.message}
            </ThemedText>
          </View>
        </ThemedView>
      );
    }
    return this.props.children;
  }
}
