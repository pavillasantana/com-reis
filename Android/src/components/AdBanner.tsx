import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme';
import { usePremium } from '../hooks/usePremium';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ADMOB_BANNER_ID } from '../constants/config';

export const AdBanner = () => {
  const { showAds } = usePremium();

  // Paywall Lógico: Remover qualquer anúncio para usuários Premium.
  if (!showAds) {
    return null;
  }

  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  if (isExpoGo) {
    return (
      <View style={styles.container}>
        <View style={styles.adPlaceholder}>
          <Text style={styles.adText}>Espaço Publicitário (AdMob Placeholder)</Text>
          <Text style={styles.adSub}>Visível apenas para usuários Free.</Text>
          <Text style={styles.adSub}>(No Expo Go, o módulo nativo não está disponível)</Text>
        </View>
      </View>
    );
  }

  try {
    const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads');
    const prodAdUnitId = ADMOB_BANNER_ID;
    const adUnitId = __DEV__ ? TestIds.BANNER : prodAdUnitId;

    return (
      <View style={styles.container}>
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
      </View>
    );
  } catch (error) {
    return (
      <View style={styles.container}>
        <View style={styles.adPlaceholder}>
          <Text style={styles.adText}>Erro ao carregar AdMob</Text>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  adPlaceholder: {
    width: 320,
    height: 50,
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: theme.layout.radiusMd / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  adSub: {
    color: theme.colors.textMuted,
    fontSize: 10,
  }
});