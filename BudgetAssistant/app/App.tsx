import React from 'react';
import { StatusBar, StyleSheet, View, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CurvedBottomBar } from 'react-native-curved-bottom-bar';
import { Ionicons } from '@expo/vector-icons';

import MainScreen from './MainScreen';
import UploadScreen from './upload';
import ChatScreen from './chat';


type RootStackParamList = {
  Root: undefined;
  Chat: undefined;
};

// Define the navigation prop type for components within the Root stack
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Create the navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

// 1. --- Bottom Tab Navigator Component ---
// This component contains the CurvedBottomBar
const TabsNavigator = () => {
  // Hook to navigate to screens in the parent Stack (e.g., 'Upload')
  const navigation = useNavigation<RootNavigationProp>();
  const { width } = useWindowDimensions(); // Get screen width

  const _renderIcon = (routeName: string, selectedTab: string) => {
    let icon = '';

    switch (routeName) {
      case 'Main':
        icon = 'home-outline';
        break;
      case 'Upload': // CHANGED from Profile
        icon = 'cloud-upload-outline'; // CHANGED
        break;
    }

    return (
      <Ionicons
        name={icon as any}
        size={25}
        color={routeName === selectedTab ? '#4F46E5' : 'gray'}
      />
    );
  };

  const renderTabBar = ({
    routeName,
    selectedTab,
    navigate,
  }: {
    routeName: string;
    selectedTab: string;
    navigate: (routeName: string) => void;
  }) => {
    return (
      <TouchableOpacity
        onPress={() => navigate(routeName)}
        style={styles.tabbarItem}
      >
        {_renderIcon(routeName, selectedTab)}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <CurvedBottomBar.Navigator
        type="UP"
        style={styles.bottomBar}
        shadowStyle={styles.shadow}
        height={65}
        circleWidth={55}
        bgColor="white"
        initialRouteName="Main"
        borderTopLeftRight
        renderCircle={({
          selectedTab,
          navigate,
        }: {
          selectedTab: string;
          navigate: (routeName: string) => void;
        }) => (
          <Animated.View style={styles.btnCircleUp}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Chat')}
            >
              <Ionicons name={'chatbubble-ellipses-outline'} color="#4F46E5" size={26} /> 
            </TouchableOpacity>
          </Animated.View>
        )}
        tabBar={renderTabBar}
        width={width}
        screenOptions={{ headerShown: false }}
        screenListeners={undefined}
        id={undefined}
        borderColor={undefined}
        borderWidth={undefined}
        circlePosition={undefined}
        defaultScreenOptions={undefined}
        backBehavior={undefined}
      >
        <CurvedBottomBar.Screen
          name="Main"
          position="LEFT"
          component={MainScreen as any}
        />
        <CurvedBottomBar.Screen
          name="Upload"
          component={UploadScreen as any}
          position="RIGHT"
        />
      </CurvedBottomBar.Navigator>
    </View>
  );
};

// 2. --- Main App Component ---
export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <StatusBar barStyle="dark-content" />
      
      <Stack.Navigator>
        <Stack.Screen
          name="Root"
          component={TabsNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ 
            presentation: 'modal',
            title: 'Finance AI Assistant' 
          }} 
        />
      </Stack.Navigator>
    </View>
  );
}

// 4. --- Styles ---
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', 
  },
  shadow: {
    shadowColor: '#DDDDDD',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
  },
  bottomBar: {},
  btnCircleUp: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF', 
    bottom: 30, 
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 4,
    borderColor: '#F3F4F6', 
    borderWidth: 1,
  },
  tabbarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});