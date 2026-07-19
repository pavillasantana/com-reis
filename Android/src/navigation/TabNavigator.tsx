import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, List, Plus, TrendingUp, Menu as MenuIcon } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { theme } from '../lib/theme';

import { DashboardScreen } from '../screens/DashboardScreen';
import { TransacoesScreen } from '../screens/TransacoesScreen';
import { PatrimonioScreen } from '../screens/PatrimonioScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { TagsScreen } from '../screens/TagsScreen';
import { MoedasScreen } from '../screens/MoedasScreen';
import { FechamentoScreen } from '../screens/FechamentoScreen';
import { CostExplorerScreen } from '../screens/CostExplorerScreen';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PerfilScreenWrapper = ({ navigation }: any) => {
  return <PerfilScreen onBack={() => navigation.navigate('Mais', { screen: 'MenuPrincipal' })} />;
};

const TagsScreenWrapper = ({ navigation }: any) => {
  return <TagsScreen onBack={() => navigation.navigate('Mais', { screen: 'MenuPrincipal' })} />;
};

const MoedasScreenWrapper = ({ navigation }: any) => {
  return <MoedasScreen onBack={() => navigation.navigate('Mais', { screen: 'MenuPrincipal' })} />;
};

const FechamentoScreenWrapper = ({ navigation }: any) => {
  return <FechamentoScreen onBack={() => navigation.navigate('Mais', { screen: 'MenuPrincipal' })} />;
};

const CostExplorerScreenWrapper = ({ navigation }: any) => {
  return <CostExplorerScreen onBack={() => navigation.navigate('Mais', { screen: 'MenuPrincipal' })} />;
};

const MenuScreenWrapper = ({ navigation }: any) => {
  return (
    <MenuScreen 
      onNavigateToPerfil={() => navigation.navigate('Perfil')} 
      onNavigateToTags={() => navigation.navigate('Tags')} 
      onNavigateToMoedas={() => navigation.navigate('Moedas')} 
      onNavigateToFechamento={() => navigation.navigate('Fechamento')} 
      onNavigateToCostExplorer={() => navigation.navigate('CostExplorer')}
      onBackToDashboard={() => {
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('Início');
        } else {
          navigation.navigate('Início');
        }
      }}
    />
  );
};

// Wrapper Container para a aba "Mais", gerenciando a navegação interna sem conflitos de rotas.
const MaisContainer = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MenuPrincipal">
        {(props: any) => <MenuScreenWrapper {...props} />}
      </Stack.Screen>
      <Stack.Screen name="Perfil" component={PerfilScreenWrapper} />
      <Stack.Screen name="Tags" component={TagsScreenWrapper} />
      <Stack.Screen name="Moedas" component={MoedasScreenWrapper} />
      <Stack.Screen name="Fechamento" component={FechamentoScreenWrapper} />
      <Stack.Screen name="CostExplorer" component={CostExplorerScreenWrapper} />
    </Stack.Navigator>
  );
};

// Botão central estilizado
const CustomTabBarButton = ({ children, onPress }: any) => (
  <TouchableOpacity
    style={styles.customButtonContainer}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.customButton}>
      {children}
    </View>
  </TouchableOpacity>
);

export const TabNavigator = () => {
  const setAddTransactionOpen = useStore((state) => state.setAddTransactionOpen);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Início"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      
      <Tab.Screen
        name="Transações"
        component={TransacoesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Adicionar"
        component={View} // Componente dummy
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault(); // Impede a mudança de tela
            setAddTransactionOpen(true); // Abre a gavetinha expressa
          },
        })}
        options={{
          tabBarLabel: () => null, // Oculta a label do botão central
          tabBarIcon: () => <Plus color={theme.colors.white} size={30} />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />

      <Tab.Screen
        name="Patrimônio"
        component={PatrimonioScreen}
        options={{
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Mais"
        component={MaisContainer}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MenuIcon color={color} size={size} />,
          unmountOnBlur: true,
        } as any}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    height: 65,
    paddingBottom: 12,
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  customButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
});
