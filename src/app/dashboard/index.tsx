import { StyleSheet, Pressable, View } from 'react-native'
import { Text } from 'react-native-paper'
import React from 'react'
import { supabase } from '@modules/core/supabase/supabase'
type Props = {}

const DashboardScreen = (props: Props) => {
const onPress = async()=>{
  console.log('ready to sign out')
  const {error} = await supabase.auth.signOut()   
  console.log(error)
}
return (
  <View>
    <Pressable onPress={onPress}>

    <Text>DashboardScreen</Text>
    </Pressable>
  </View>
)
}

export default DashboardScreen

const styles = StyleSheet.create({})