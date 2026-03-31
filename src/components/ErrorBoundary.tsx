import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { AlertCircle } from 'lucide-react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Surface style={styles.card} elevation={2}>
            <AlertCircle size={64} color="#E53E3E" />
            <Text variant="headlineSmall" style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We encountered an unexpected error. This usually happens when data is missing or formatted incorrectly.
            </Text>
            {__DEV__ && (
              <ScrollView style={styles.debug}>
                 <Text style={styles.debugText}>{this.state.error?.toString()}</Text>
              </ScrollView>
            )}
            <Button mode="contained" onPress={this.handleRestart} style={styles.btn}>
              Try Again
            </Button>
          </Surface>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    padding: 30,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontWeight: 'bold',
    marginTop: 20,
    color: '#1A1A1A',
  },
  message: {
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
    lineHeight: 20,
  },
  btn: {
    width: '100%',
    borderRadius: 12,
  },
  debug: {
    maxHeight: 150,
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  debugText: {
    fontSize: 10,
    color: '#E53E3E',
    fontFamily: 'monospace',
  }
});

export default ErrorBoundary;
