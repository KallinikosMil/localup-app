import { StyleSheet, Pressable, View } from 'react-native'
import { Text } from 'react-native-paper'
import React from 'react'
import { supabase } from '@config/supabase'
type Props = {}

const DashboardScreen = (props: Props) => {
const onPress = async()=>{
  const {error} = await supabase.auth.signOut()   
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
