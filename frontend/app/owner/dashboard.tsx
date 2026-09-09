import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Store,
  Eye,
  MessageCircle,
  Phone,
  MapPin,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Edit3,
  Plus,
  ExternalLink,
  X,
  Award,
} from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";
import { Store as StoreType } from "@/src/types";

export default function OwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedStoreIndex, setSelectedStoreIndex] = useState(0);
  const [isEditStoreModalVisible, setIsEditStoreModalVisible] = useState(false);
  const [isCreateStoreModalVisible, setIsCreateStoreModalVisible] = useState(false);

  // Edit store form state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWhatsApp, setEditWhatsApp] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [isSavingStore, setIsSavingStore] = useState(false);

  // New store form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newWhatsApp, setNewWhatsApp] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [newCity, setNewCity] = useState("São Paulo");
  const [newCategoryId, setNewCategoryId] = useState("cat_gastronomia");

  const {
    data: stores = [],
    isLoading: isLoadingStores,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["owner-stores"],
    queryFn: api.getOwnerStores,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });

  const currentStore: StoreType | undefined = stores[selectedStoreIndex];

  const { data: metricsData } = useQuery({
    queryKey: ["owner-metrics", currentStore?.id],
    queryFn: () => api.getOwnerMetrics(currentStore!.id),
    enabled: !!currentStore?.id,
  });

  const openEditModal = () => {
    if (!currentStore) return;
    setEditName(currentStore.name);
    setEditDesc(currentStore.description);
    setEditPhone(currentStore.contact?.phone || "");
    setEditWhatsApp(currentStore.contact?.whatsapp || "");
    setEditAddress(currentStore.address?.formatted || currentStore.address?.street || "");
    setEditSubcategory(currentStore.subcategory || "");
    setEditLogoUrl(currentStore.logo_url || "");
    setEditBannerUrl(currentStore.banner_url || "");
    setIsEditStoreModalVisible(true);
  };

  const handleSaveStoreEdit = async () => {
    if (!currentStore) return;
    setIsSavingStore(true);
    try {
      await api.updateOwnerStore(currentStore.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        subcategory: editSubcategory.trim(),
        logo_url: editLogoUrl.trim() || currentStore.logo_url,
        banner_url: editBannerUrl.trim() || currentStore.banner_url,
        contact: {
          ...currentStore.contact,
          phone: editPhone.trim(),
          whatsapp: editWhatsApp.trim(),
        },
        address: {
          ...currentStore.address,
          formatted: editAddress.trim(),
        },
      });
      setIsEditStoreModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["owner-stores"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    } catch (err: any) {
      alert(err.message || "Erro ao salvar dados da loja");
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleCreateNewStore = async () => {
    if (!newName.trim()) {
      alert("Por favor, digite o nome da loja");
      return;
    }
    setIsSavingStore(true);
    try {
      await api.createOwnerStore({
        name: newName.trim(),
        category_id: newCategoryId,
        description: newDesc.trim(),
        short_description: newDesc.trim().slice(0, 60),
        address: {
          street: newStreet.trim(),
          number: "100",
          neighborhood: newNeighborhood.trim() || "Centro",
          city: newCity.trim() || "São Paulo",
          state: "SP",
          formatted: `${newStreet.trim()} - ${newNeighborhood.trim()}, ${newCity.trim()} - SP`,
        },
        contact: {
          phone: newPhone.trim(),
          whatsapp: newWhatsApp.trim(),
        },
        plan_tier: "free",
      });
      setIsCreateStoreModalVisible(false);
      setNewName("");
      setNewDesc("");
      queryClient.invalidateQueries({ queryKey: ["owner-stores"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    } catch (err: any) {
      alert(err.message || "Erro ao criar loja");
    } finally {
      setIsSavingStore(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Pressable
          testID="owner-back-btn"
          style={styles.backBtn}
          onPress={() => router.push("/(tabs)" as any)}
        >
          <ArrowLeft size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Painel do Lojista (SaaS)</Text>
        <Pressable
          testID="owner-new-store-btn"
          style={styles.addStoreBtn}
          onPress={() => setIsCreateStoreModalVisible(true)}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addStoreBtnText}>Nova Loja</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brandPrimary}
          />
        }
      >
        {isLoadingStores ? (
          <View style={styles.loadingContainer} testID="owner-stores-loading">
            <ActivityIndicator size="large" color={colors.brandPrimary} />
            <Text style={styles.loadingText}>Carregando dados da sua loja...</Text>
          </View>
        ) : stores.length === 0 ? (
          <View style={styles.emptyStoreContainer} testID="owner-no-stores">
            <View style={styles.emptyIconCircle}>
              <Store size={36} color={colors.brandPrimary} />
            </View>
            <Text style={styles.emptyStoreTitle}>Cadastre sua Primeira Loja</Text>
            <Text style={styles.emptyStoreSubtitle}>
              Comece a divulgar seus produtos e receber contatos diretos no WhatsApp dos moradores da cidade.
            </Text>
            <Pressable
              testID="create-first-store-btn"
              style={styles.createFirstStoreBtn}
              onPress={() => setIsCreateStoreModalVisible(true)}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.createFirstStoreBtnText}>Cadastrar Loja Agora</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Store Switcher selector (if multiple stores) */}
            {stores.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storeSelectorScroll}
              >
                {stores.map((s, idx) => (
                  <Pressable
                    key={s.id}
                    testID={`select-store-pill-${s.id}`}
                    style={[
                      styles.storePill,
                      selectedStoreIndex === idx && styles.storePillActive,
                    ]}
                    onPress={() => setSelectedStoreIndex(idx)}
                  >
                    <Text
                      style={[
                        styles.storePillText,
                        selectedStoreIndex === idx && styles.storePillTextActive,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {currentStore && (
              <>
                {/* Store Profile Card */}
                <View style={styles.storeProfileCard}>
                  <View style={styles.bannerWrapper}>
                    <Image
                      source={{ uri: currentStore.banner_url || currentStore.logo_url }}
                      style={styles.storeCardBanner}
                      contentFit="cover"
                    />
                    <View style={styles.storeCardOverlay} />
                  </View>

                  <View style={styles.storeCardInfo}>
                    <View style={styles.storeCardTop}>
                      <Image
                        source={{ uri: currentStore.logo_url }}
                        style={styles.storeLogo}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <View style={styles.storeNameVerifiedRow}>
                          <Text style={styles.storeCardName} numberOfLines={1}>
                            {currentStore.name}
                          </Text>
                          {currentStore.is_verified && (
                            <CheckCircle2 size={16} color={colors.brand} />
                          )}
                        </View>
                        <Text style={styles.storeCardCategory}>
                          {currentStore.subcategory || currentStore.category_name}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.storeCardActionsRow}>
                      <Pressable
                        testID="edit-store-profile-btn"
                        style={styles.editProfileBtn}
                        onPress={openEditModal}
                      >
                        <Edit3 size={14} color="#FFFFFF" />
                        <Text style={styles.editProfileBtnText}>Editar Perfil</Text>
                      </Pressable>

                      <Pressable
                        testID="view-store-as-customer-btn"
                        style={styles.viewCustomerBtn}
                        onPress={() => router.push(`/store/${currentStore.id}` as any)}
                      >
                        <ExternalLink size={14} color={colors.onSurfaceSecondary} />
                        <Text style={styles.viewCustomerBtnText}>Ver no App</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* SaaS Subscription Plan Banner */}
                <View style={styles.saasPlanCard} testID="saas-plan-banner">
                  <View style={styles.planCardHeader}>
                    <View style={styles.planBadgeContainer}>
                      <Award size={18} color={colors.brandPrimary} />
                      <View>
                        <Text style={styles.planBadgeLabel}>PLANO ATUAL</Text>
                        <Text style={styles.planTierName}>
                          {currentStore.plan_tier === "premium"
                            ? "Plano Premium VIP (R$ 149/mês)"
                            : currentStore.plan_tier === "pro"
                            ? "Plano Pro (R$ 79/mês)"
                            : "Plano Grátis (R$ 0/mês)"}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      testID="upgrade-plan-btn"
                      style={styles.upgradePlanBtn}
                      onPress={() =>
                        router.push({
                          pathname: "/owner/plans",
                          params: { store_id: currentStore.id },
                        } as any)
                      }
                    >
                      <Sparkles size={14} color="#FFFFFF" />
                      <Text style={styles.upgradePlanBtnText}>Mudar Plano</Text>
                    </Pressable>
                  </View>

                  <View style={styles.planFeaturesSummary}>
                    <Text style={styles.planPerkText}>
                      • {currentStore.plan_tier === "free" ? "Até 5 itens no catálogo" : "Catálogo expandido"}
                    </Text>
                    <Text style={styles.planPerkText}>
                      • {currentStore.is_verified ? "Selo Verificado Ativo" : "Sem selo verificado"}
                    </Text>
                    <Text style={styles.planPerkText}>
                      • {currentStore.is_featured ? "Destaque VIP no Topo da Cidade" : "Listagem padrão"}
                    </Text>
                  </View>
                </View>

                {/* Real-time Analytics KPI Metrics */}
                <Text style={styles.sectionHeader}>MÉTRICAS DE LEADS & VISITAS</Text>

                <View style={styles.metricsGrid}>
                  {/* Metric 1: Views */}
                  <View style={styles.metricCard} testID="metric-views">
                    <View style={[styles.metricIcon, { backgroundColor: "#FEF3C7" }]}>
                      <Eye size={20} color={colors.brandPrimary} />
                    </View>
                    <Text style={styles.metricValue}>
                      {metricsData?.metrics?.views_count || currentStore.metrics?.views_count || 0}
                    </Text>
                    <Text style={styles.metricLabel}>Visualizações</Text>
                  </View>

                  {/* Metric 2: WhatsApp Clicks */}
                  <View style={styles.metricCard} testID="metric-whatsapp">
                    <View style={[styles.metricIcon, { backgroundColor: "#DCFCE7" }]}>
                      <MessageCircle size={20} color="#15803D" />
                    </View>
                    <Text style={[styles.metricValue, { color: "#15803D" }]}>
                      {metricsData?.metrics?.whatsapp_clicks || currentStore.metrics?.whatsapp_clicks || 0}
                    </Text>
                    <Text style={styles.metricLabel}>Cliques WhatsApp</Text>
                  </View>

                  {/* Metric 3: Phone calls */}
                  <View style={styles.metricCard} testID="metric-phone">
                    <View style={[styles.metricIcon, { backgroundColor: "#DBEAFE" }]}>
                      <Phone size={20} color="#1D4ED8" />
                    </View>
                    <Text style={styles.metricValue}>
                      {metricsData?.metrics?.phone_clicks || currentStore.metrics?.phone_clicks || 0}
                    </Text>
                    <Text style={styles.metricLabel}>Ligações Diretas</Text>
                  </View>

                  {/* Metric 4: Directions */}
                  <View style={styles.metricCard} testID="metric-directions">
                    <View style={[styles.metricIcon, { backgroundColor: "#F3E8FF" }]}>
                      <MapPin size={20} color="#7E22CE" />
                    </View>
                    <Text style={styles.metricValue}>
                      {metricsData?.metrics?.directions_clicks || currentStore.metrics?.directions_clicks || 0}
                    </Text>
                    <Text style={styles.metricLabel}>Rotas / Mapas</Text>
                  </View>
                </View>

                {/* Conversion Rate Card */}
                <View style={styles.conversionCard}>
                  <View style={styles.conversionLeft}>
                    <TrendingUp size={22} color={colors.brandPrimary} />
                    <View>
                      <Text style={styles.conversionTitle}>Taxa de Conversão em Leads</Text>
                      <Text style={styles.conversionSubtitle}>
                        Visitas convertidas em contatos de WhatsApp ou ligação
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.conversionRateValue}>
                    {metricsData?.conversion_rate_pct || "27.0"}%
                  </Text>
                </View>

                {/* Quick Shortcuts */}
                <Text style={styles.sectionHeader}>GESTÃO DO NEGÓCIO</Text>

                <Pressable
                  testID="goto-catalog-manager-btn"
                  style={styles.actionMenuCard}
                  onPress={() =>
                    router.push({
                      pathname: "/owner/catalog",
                      params: { store_id: currentStore.id },
                    } as any)
                  }
                >
                  <View style={[styles.actionIconCircle, { backgroundColor: colors.brandTertiary }]}>
                    <ShoppingBag size={22} color={colors.brandPrimary} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Gerenciar Catálogo & Produtos</Text>
                    <Text style={styles.actionSubtitle}>
                      {metricsData?.products_count ?? 4} produtos cadastrados
                    </Text>
                  </View>
                  <Edit3 size={18} color={colors.muted} />
                </Pressable>

                <Pressable
                  testID="goto-plans-upgrade-menu-btn"
                  style={styles.actionMenuCard}
                  onPress={() =>
                    router.push({
                      pathname: "/owner/plans",
                      params: { store_id: currentStore.id },
                    } as any)
                  }
                >
                  <View style={[styles.actionIconCircle, { backgroundColor: "#FEF3C7" }]}>
                    <CreditCard size={22} color="#B45309" />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>Destaque VIP & Planos SaaS</Text>
                    <Text style={styles.actionSubtitle}>
                      Ganhe selo verificado e apareça no topo da cidade
                    </Text>
                  </View>
                  <Sparkles size={18} color={colors.brandPrimary} />
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Store Modal */}
      <Modal
        visible={isEditStoreModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditStoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet} testID="edit-store-modal">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Dados da Loja</Text>
              <Pressable onPress={() => setIsEditStoreModalVisible(false)}>
                <X size={20} color={colors.onSurface} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome do Estabelecimento</Text>
                <TextInput
                  testID="edit-store-name-input"
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subcategoria / Especialidade</Text>
                <TextInput
                  testID="edit-store-sub-input"
                  style={styles.modalInput}
                  placeholder="Ex: Pizzas Artesanais, Salão de Beleza..."
                  placeholderTextColor={colors.muted}
                  value={editSubcategory}
                  onChangeText={setEditSubcategory}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WhatsApp (com DDD)</Text>
                <TextInput
                  testID="edit-store-whatsapp-input"
                  style={styles.modalInput}
                  placeholder="Ex: 5511987654321"
                  placeholderTextColor={colors.muted}
                  value={editWhatsApp}
                  onChangeText={setEditWhatsApp}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefone Fixo / Comercial</Text>
                <TextInput
                  testID="edit-store-phone-input"
                  style={styles.modalInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Endereço Completo</Text>
                <TextInput
                  testID="edit-store-address-input"
                  style={styles.modalInput}
                  value={editAddress}
                  onChangeText={setEditAddress}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descrição da Loja</Text>
                <TextInput
                  testID="edit-store-desc-input"
                  style={[styles.modalInput, { height: 80 }]}
                  multiline
                  value={editDesc}
                  onChangeText={setEditDesc}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>URL da Imagem de Banner</Text>
                <TextInput
                  testID="edit-store-banner-input"
                  style={styles.modalInput}
                  value={editBannerUrl}
                  onChangeText={setEditBannerUrl}
                />
              </View>
            </ScrollView>

            <Pressable
              testID="save-store-edit-btn"
              style={styles.modalSubmitBtn}
              onPress={handleSaveStoreEdit}
              disabled={isSavingStore}
            >
              {isSavingStore ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Salvar Alterações</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Create New Store Modal */}
      <Modal
        visible={isCreateStoreModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateStoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet} testID="create-store-modal">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cadastrar Novo Estabelecimento</Text>
              <Pressable onPress={() => setIsCreateStoreModalVisible(false)}>
                <X size={20} color={colors.onSurface} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome da Loja</Text>
                <TextInput
                  testID="new-store-name-input"
                  style={styles.modalInput}
                  placeholder="Ex: Padaria Central"
                  placeholderTextColor={colors.muted}
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Categoria Principal</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {categories.map((c) => (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.catSelectPill,
                        newCategoryId === c.id && styles.catSelectPillActive,
                      ]}
                      onPress={() => setNewCategoryId(c.id)}
                    >
                      <Text
                        style={[
                          styles.catSelectText,
                          newCategoryId === c.id && styles.catSelectTextActive,
                        ]}
                      >
                        {c.name.split(" & ")[0]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WhatsApp para Pedidos</Text>
                <TextInput
                  testID="new-store-whatsapp-input"
                  style={styles.modalInput}
                  placeholder="5511999999999"
                  placeholderTextColor={colors.muted}
                  value={newWhatsApp}
                  onChangeText={setNewWhatsApp}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Rua e Número</Text>
                <TextInput
                  testID="new-store-street-input"
                  style={styles.modalInput}
                  placeholder="Rua das Flores, 120"
                  placeholderTextColor={colors.muted}
                  value={newStreet}
                  onChangeText={setNewStreet}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bairro</Text>
                <TextInput
                  testID="new-store-neighborhood-input"
                  style={styles.modalInput}
                  placeholder="Ex: Pinheiros"
                  placeholderTextColor={colors.muted}
                  value={newNeighborhood}
                  onChangeText={setNewNeighborhood}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descrição</Text>
                <TextInput
                  testID="new-store-desc-input"
                  style={[styles.modalInput, { height: 70 }]}
                  multiline
                  placeholder="Conte o que sua loja oferece..."
                  placeholderTextColor={colors.muted}
                  value={newDesc}
                  onChangeText={setNewDesc}
                />
              </View>
            </ScrollView>

            <Pressable
              testID="submit-new-store-btn"
              style={styles.modalSubmitBtn}
              onPress={handleCreateNewStore}
              disabled={isSavingStore}
            >
              {isSavingStore ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Cadastrar Loja</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  addStoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addStoreBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  storeSelectorScroll: {
    gap: 8,
    marginBottom: 16,
  },
  storePill: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  storePillActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  storePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  storePillTextActive: {
    color: "#FFFFFF",
  },
  storeProfileCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 16,
  },
  bannerWrapper: {
    width: "100%",
    height: 100,
    position: "relative",
  },
  storeCardBanner: {
    width: "100%",
    height: "100%",
  },
  storeCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  storeCardInfo: {
    padding: 14,
  },
  storeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: -30,
    marginBottom: 12,
  },
  storeLogo: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surfaceSecondary,
    backgroundColor: colors.surfaceSecondary,
  },
  storeNameVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storeCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    flexShrink: 1,
  },
  storeCardCategory: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.brand,
    marginTop: 2,
  },
  storeCardActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandPrimary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  editProfileBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  viewCustomerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  viewCustomerBtnText: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  saasPlanCard: {
    backgroundColor: "#FFFDF5",
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  planBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  planBadgeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.5,
  },
  planTierName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.onSurface,
  },
  upgradePlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  upgradePlanBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  planFeaturesSummary: {
    borderTopWidth: 1,
    borderTopColor: "rgba(217,119,6,0.15)",
    paddingTop: 8,
    gap: 2,
  },
  planPerkText: {
    fontSize: 12,
    color: colors.onSurfaceTertiary,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.onSurfaceSecondary,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  conversionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  conversionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  conversionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  conversionSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  conversionRateValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  actionMenuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  emptyStoreContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStoreTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 8,
  },
  emptyStoreSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  createFirstStoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createFirstStoreBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.onSurface,
  },
  modalSubmitBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  catSelectPill: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
  },
  catSelectPillActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  catSelectText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  catSelectTextActive: {
    color: "#FFFFFF",
  },
}));
