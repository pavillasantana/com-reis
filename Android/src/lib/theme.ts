export const theme = {
  colors: {
    bg: '#F4F7FE',       // Background Global
    primary: '#1045A1',  // Destaques / Botões (Azul Oficial)
    secondary: '#FFB800', // Avisos / Dourado / Amarelo Logo
    accent: '#1045A1',   
    ink: '#1A2744',      // Títulos (Azul Profundo)
    text: '#1A2744',     // Texto geral
    positive: '#10B981', // Sucesso (Verde)
    negative: '#EF4444', // Erro / Perigo (Vermelho)
    white: '#FFFFFF',
    cardBg: '#FFFFFF',   // Superfícies (Cards)
    border: '#E2E8F0',   // Card border
    textMuted: '#64748B', // Texto secundário (Cinza Escuro)
    textSecondary: '#64748B',
    inputBg: '#FFFFFF',
    inputBorder: '#E2E8F0',
    divider: '#E2E8F0',
    lightAccent: '#F4F7FE',
    accentBorder: '#E2E8F0',
  },
  layout: {
    paddingMd: 20,
    paddingLg: 20,
    gapMd: 16,
    gapLg: 24,
    radiusMd: 16,
    radiusLg: 24,
  },
  typography: {
    fontFamily: 'System',
    sizeXs: 10,
    sizeSm: 12,
    sizeMd: 14,
    sizeLg: 16,
    sizeXl: 20,
    sizeXxl: 24,
    sizeXxxl: 32,
    weightLight: '300' as const,
    weightRegular: '400' as const,
    weightMedium: '500' as const,
    weightSemibold: '600' as const,
    weightBold: '700' as const,
    weightExtraBold: '800' as const,
    weightBlack: '900' as const,
  },
  modalStyles: {
    backdrop: {
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    container: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderBottomWidth: 0,
      padding: 20,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      marginBottom: 16,
    },
    title: {
      color: '#1A2744',
      fontSize: 18,
      fontWeight: '700' as const,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: 20,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 20,
      width: '100%' as const,
      maxWidth: 360,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      elevation: 10,
    },
    closeBtn: {
      padding: 6,
    },
    input: {
      backgroundColor: '#F4F7FE',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      borderRadius: 12,
      height: 48,
      paddingHorizontal: 20,
      color: '#1A2744',
      fontSize: 14,
      marginBottom: 12,
    },
    primaryButton: {
      backgroundColor: '#1045A1',
      borderRadius: 12,
      height: 52,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginTop: 8,
      shadowColor: '#1045A1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '700' as const,
      fontSize: 16,
    },
    secondaryButton: {
      backgroundColor: '#F4F7FE',
      borderRadius: 12,
      height: 48,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    secondaryButtonText: {
      color: '#64748B',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    badge: {
      backgroundColor: '#F4F7FE',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 9,
      paddingHorizontal: 18,
    },
    badgeActive: {
      backgroundColor: '#1045A1',
      borderColor: '#1045A1',
    },
    badgeText: {
      color: '#64748B',
      fontSize: 12,
      fontWeight: '500' as const,
    },
    badgeTextActive: {
      color: '#FFFFFF',
    },
  }
};

export default theme;
