import { StyleSheet, Text, View } from 'react-native';
import React from 'react';

type Props = {
    children: React.ReactNode;
};

const Container = (props: Props) => {
  return (
    <View style={styles.container}>
      {props.children}
    </View>
  );
};

export default Container;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
