import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, Tag } from '../store/useStore';
import { ArrowLeft, Plus, Trash2, Tag as TagIcon, Edit2, Check } from 'lucide-react-native';
import { Logo } from '../components/Logo';
import { useI18n } from '../hooks/useI18n';
import { theme } from '../lib/theme';

interface TagsScreenProps {
  onBack: () => void;
}

const PALETA_CORES = [
  '#FF5252', // Vermelho
  '#FF4081', // Rosa
  '#E040FB', // Roxo
  '#7C4DFF', // Violeta escuro
  '#536DFE', // Indigo
  '#448AFF', // Azul
  '#00E5FF', // Ciano
  '#00E676', // Verde claro
  '#FFD700', // Dourado
  '#FF9100', // Laranja
];

export const TagsScreen = ({ onBack }: TagsScreenProps) => {
  const { t } = useI18n();
  const { tags, addTag, deleteTag, updateTag } = useStore();
  const [nomeTag, setNomeTag] = useState('');
  const [corSelecionada, setCorSelecionada] = useState(PALETA_CORES[0]);
  const [editandoTag, setEditandoTag] = useState<Tag | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSalvarTag = async () => {
    if (!nomeTag.trim()) {
      Alert.alert(t('error'), t('enter_tag_name'));
      return;
    }

    setSaving(true);
    try {
      if (editandoTag) {
        // Atualizar
        await updateTag(editandoTag.id, nomeTag.trim(), corSelecionada);
        Alert.alert(t('success'), t('tag_updated'));
        setEditandoTag(null);
      } else {
        // Criar
        const novaTag: Tag = {
          id: Math.random().toString(36).substring(2, 9),
          id_usuario: '', // Será preenchido no useStore com o ID ativo
          nome: nomeTag.trim(),
          cor: corSelecionada,
        };
        await addTag(novaTag);
        Alert.alert(t('success'), t('tag_created'));
      }
      setNomeTag('');
      setCorSelecionada(PALETA_CORES[0]);
    } catch (err: any) {
      Alert.alert(t('error'), t('could_not_save') + ' ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleIniciarEdicao = (tag: Tag) => {
    setEditandoTag(tag);
    setNomeTag(tag.nome);
    setCorSelecionada(tag.cor);
  };

  const handleCancelarEdicao = () => {
    setEditandoTag(null);
    setNomeTag('');
    setCorSelecionada(PALETA_CORES[0]);
  };

  const handleDeletarTag = (tagId: string, tagName: string) => {
    Alert.alert(
      t('remove_tag'),
      t('delete_tag_confirm').replace('{name}', tagName),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (editandoTag?.id === tagId) {
                handleCancelarEdicao();
              }
              await deleteTag(tagId);
            } catch (err: any) {
              Alert.alert(t('error'), t('error_deleting_tag') + ' ' + err.message);
            }
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Logo variant="horizontal" size="xs" withLeaf />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Formulário de Criação / Edição */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editandoTag ? t('edit_tag') : t('new_custom_tag')}
          </Text>
          
          <Text style={styles.label}>{t('tag_name_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('tag_name_placeholder')}
            placeholderTextColor="#94A3B8"
            value={nomeTag}
            onChangeText={setNomeTag}
            maxLength={25}
          />

          <Text style={styles.label}>{t('choose_color')}</Text>
          <View style={styles.colorGrid}>
            {PALETA_CORES.map(cor => (
              <TouchableOpacity
                key={cor}
                style={[
                  styles.colorBubble, 
                  { backgroundColor: cor }, 
                  corSelecionada === cor && styles.colorBubbleSelected
                ]}
                onPress={() => setCorSelecionada(cor)}
                activeOpacity={0.8}
              />
            ))}
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.saveBtn, saving && styles.disabledBtn, editandoTag && { flex: 1 }]} 
              onPress={handleSalvarTag}
              disabled={saving}
              activeOpacity={0.8}
            >
              {editandoTag ? <Check size={16} color="#FFFFFF" /> : <Plus size={16} color="#FFFFFF" />}
              <Text style={styles.saveBtnText}>
                {saving ? t('saving') : editandoTag ? t('save') : t('add_tag')}
              </Text>
            </TouchableOpacity>

            {editandoTag && (
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={handleCancelarEdicao}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Lista de Tags Cadastradas */}
        <Text style={styles.sectionTitle}>{t('your_tags')} ({tags.length})</Text>

        {tags.length === 0 ? (
          <View style={styles.emptyState}>
            <TagIcon size={24} color={theme.colors.border} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>{t('no_tags_created')}</Text>
          </View>
        ) : (
          tags.map(item => (
            <View key={item.id} style={styles.tagCard}>
              <View style={styles.tagLeft}>
                <View style={[styles.colorIndicator, { backgroundColor: item.cor }]} />
                <Text style={styles.tagName}>{item.nome}</Text>
              </View>
              <View style={styles.tagActions}>
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => handleIniciarEdicao(item)}
                  activeOpacity={0.7}
                >
                  <Edit2 size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => handleDeletarTag(item.id, item.nome)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 23,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: 12,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 30,
  },
  formCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 30,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    height: 46,
    paddingHorizontal: 18,
    color: theme.colors.ink,
    fontSize: 14,
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorBubbleSelected: {
    borderColor: theme.colors.ink,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cancelBtnText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  disabledBtn: {
    backgroundColor: theme.colors.border,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  tagCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  tagName: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '500',
  },
  tagActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 9,
  }
});

export default TagsScreen;
