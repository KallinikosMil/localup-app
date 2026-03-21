import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import AppText from
  '@shared/components/AppText';

export default function MatchesScreen() {
  return (
    <View style={styles.root}>
      <AppText variant="h2">
        Matches
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
