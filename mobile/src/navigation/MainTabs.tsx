import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/home/HomeScreen';
import { WalletScreen } from '../screens/wallet/WalletScreen';
import { RatesScreen } from '../screens/rates/RatesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { Colors } from '../utils/constants';

export type MainTabsParamList = {
  Home: undefined;
  Wallet: { action?: 'deposit' | 'withdraw' } | undefined;
  Rates: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONS: Record<string, [string, string]> = {
  Home: ['home', 'home-outline'],
  Wallet: ['wallet', 'wallet-outline'],
  Rates: ['trending-up', 'trending-up-outline'],
  Profile: ['person', 'person-outline'],
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <Ionicons
              name={(focused ? active : inactive) as keyof typeof Ionicons.glyphMap}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Rates" component={RatesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
