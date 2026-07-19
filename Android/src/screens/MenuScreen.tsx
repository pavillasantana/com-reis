import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Image, BackHandler, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { Compass, BookOpen, Settings, LogOut, ChevronRight, Tags, User, Share2, ArrowLeft, Globe, HelpCircle, ChevronDown } from 'lucide-react-native';
import { Logo } from '../components/Logo';
import { theme } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { useI18n } from '../hooks/useI18n';
import { useFocusEffect } from '@react-navigation/native';

interface MenuScreenProps {
  onNavigateToPerfil: () => void;
  onNavigateToTags: () => void;
  onNavigateToMoedas: () => void;
  onNavigateToFechamento: () => void;
  onNavigateToCostExplorer: () => void;
  onBackToDashboard: () => void;
}

export const MenuScreen = ({ onNavigateToPerfil, onNavigateToTags, onNavigateToMoedas, onNavigateToFechamento, onNavigateToCostExplorer, onBackToDashboard }: MenuScreenProps) => {
  const { t } = useI18n();
  const { clearSession, id_usuario, nome_usuario, email_usuario, avatar_url } = useStore();
  const [faqOpen, setFaqOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        onBackToDashboard();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [onBackToDashboard])
  );

  const handleOpenURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert(t('error'), t('cannot_open_browser'));
    }
  };

  const handleCostExplorerRedirect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://bwcquemvvqaivsxaclpl.supabase.co/functions/v1/sso-create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': 'sb_publishable_5QbtKEEs8J4D27sx9nQ5Nw_AHnHtFVu',
        },
      });
      
      const { code } = await response.json();
      
      const params = new URLSearchParams();
      if (code) params.set('sso_code', code);
      params.set('view', 'costExplorer');
      params.set('mode', 'br');
      
      const url = `https://mangos-app.netlify.app/?${params.toString()}`;
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert(t('error'), t('cannot_redirect_global_explorer'));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout_title'),
      t('logout_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('logout'), style: 'destructive', onPress: () => clearSession() }
      ]
    );
  };

  const blogPosts = [
    { id: '1', titulo: t('blog_title_1'), tempo: t('reading_time').replace('{min}', '3') },
    { id: '2', titulo: t('blog_title_2'), tempo: t('reading_time').replace('{min}', '4') },
    { id: '3', titulo: t('blog_title_3'), tempo: t('reading_time').replace('{min}', '5') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Fixo */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={onBackToDashboard} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={theme.colors.ink} />
        </TouchableOpacity>
        <Logo variant="horizontal" size="xs" withLeaf />
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header de Usuário Clicável */}
        <TouchableOpacity 
          style={styles.profileCard} 
          onPress={onNavigateToPerfil} 
          activeOpacity={0.8}
        >
          <View style={styles.profileLeft}>
            <Image 
              source={{ uri: avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' }} 
              style={styles.avatarImage} 
            />
            <View>
              <Text style={styles.profileName}>{nome_usuario || t('user_fallback')}</Text>
              <Text style={styles.profileEmail}>{email_usuario || 'usuario@mangos.com'}</Text>
              {id_usuario && !id_usuario.startsWith('demo-') && (
                <Text style={styles.profileId}>ID: {id_usuario.slice(0, 8)}...</Text>
              )}
            </View>
          </View>
          <ChevronRight size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Explorador Global */}
        <TouchableOpacity style={styles.explorerBanner} onPress={handleCostExplorerRedirect} activeOpacity={0.8}>
          <View style={styles.explorerIcon}>
            <Globe size={20} color="#FFFFFF" />
          </View>
          <View style={styles.explorerTextSection}>
            <Text style={styles.explorerTitle}>{t('global_explorer')}</Text>
            <Text style={styles.explorerSub}>{t('global_explorer_subtitle')}</Text>
          </View>
          <ChevronRight size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Seção Gestão */}
        <Text style={styles.sectionTitle}>{t('management_settings')}</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={onNavigateToTags} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <Tags size={18} color={theme.colors.textMuted} />
            <Text style={styles.menuText}>{t('categories_and_tags')}</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.border} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onNavigateToMoedas} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <Settings size={18} color={theme.colors.textMuted} />
            <Text style={styles.menuText}>{t('currency_settings')}</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.border} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onNavigateToFechamento} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <Share2 size={18} color={theme.colors.textMuted} />
            <Text style={styles.menuText}>{t('shared_closing')}</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.border} />
        </TouchableOpacity>

        {/* Seção Suporte & Segurança */}
        <Text style={styles.sectionTitle}>{t('support_security')}</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => setFaqOpen(true)} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <HelpCircle size={18} color={theme.colors.textMuted} />
            <Text style={styles.menuText}>{t('help_faq')}</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.border} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => handleOpenURL('https://mangosfinancas.netlify.app/privacy')} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <Settings size={18} color={theme.colors.textMuted} />
            <Text style={styles.menuText}>{t('security_privacy')}</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.border} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => handleOpenURL('https://mangosfinancas.netlify.app/terms')} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <BookOpen size={18} color={theme.colors.textMuted} />
            <Text style={styles.menuText}>{t('terms_of_use')}</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.border} />
        </TouchableOpacity>

        {/* Seção Dicas/Blog */}
        <View style={styles.blogHeader}>
          <BookOpen size={18} color={theme.colors.textMuted} />
          <Text style={styles.sectionTitleBlog}>{t('tips_education')}</Text>
        </View>

        {blogPosts.map(post => (
          <TouchableOpacity 
            key={post.id} 
            style={styles.blogCard} 
            onPress={() => handleOpenURL('https://mangosfinancas.netlify.app/?view=blog')}
            activeOpacity={0.8}
          >
            <Text style={styles.blogPostTitle}>{post.titulo}</Text>
            <Text style={styles.blogPostTime}>{post.tempo}</Text>
          </TouchableOpacity>
        ))}

        {/* Sair da Conta */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#FF5252" />
          <Text style={styles.logoutText}>{t('end_session')}</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Modal Ajuda & FAQ */}
      <Modal visible={faqOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('help_faq')}</Text>
              <TouchableOpacity onPress={() => { setFaqOpen(false); setExpandedFaq(null); }}>
                <Text style={styles.modalClose}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.faqList} showsVerticalScrollIndicator={false}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.faqItem}
                  onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqQuestion}>
                    <Text style={styles.faqQuestionText}>{t(`faq_q${i}`)}</Text>
                    <ChevronDown 
                      size={16} 
                      color={theme.colors.textMuted}
                      style={{ transform: [{ rotate: expandedFaq === i ? '180deg' : '0deg' }] }}
                    />
                  </View>
                  {expandedFaq === i && (
                    <Text style={styles.faqAnswer}>{t(`faq_a${i}`)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 21,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.cardBg,
  },
  backBtn: {
    padding: 6,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.ink,
  },
  scrollContainer: {
    padding: 30,
  },
  profileCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  profileName: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  profileId: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 1,
    fontFamily: 'monospace',
  },
  explorerBanner: {
    backgroundColor: 'rgba(44, 95, 141, 0.08)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  explorerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  explorerTextSection: {
    flex: 1,
  },
  explorerTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
  },
  explorerSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  blogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleBlog: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '500',
  },
  blogCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  blogPostTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
  },
  blogPostTime: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#FF5252',
    backgroundColor: 'rgba(255, 82, 82, 0.03)',
    borderRadius: 12,
    padding: 21,
  },
  logoutText: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.ink,
  },
  modalClose: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  faqList: {
    maxHeight: 500,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 14,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 8,
    lineHeight: 18,
  },
});
