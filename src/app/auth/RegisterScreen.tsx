import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { darkColors } from '@theme/colors';
type Props = {};

const RegisterScreen = (props: Props) => {
  return (
    <>
      <Pressable onPress={() => {router.back()}}>
        <Ionicons
          name="chevron-back-outline"
          size={32}
          color={darkColors.onBackground}  
       />
       </Pressable>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text>RegisterScreen</Text>
      </View>
    </>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({});
