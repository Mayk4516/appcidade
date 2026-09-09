import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Shield,
  DollarSign,
  Store,
  Users,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  Search,
  Check,
  AlertTriangle,
} from "lucide-react-native";
import { useTheme, makeStyles, TACTILE_CARD } from "@/src/theme";
import { api } from "@/src/api";
import { Store as StoreType, AdminMetrics } from "@/src/types";

export default function SuperAdminScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchFilter, setSearchFilter] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: api.getAdminMetrics,
  });

  const {
    data: stores = [],
    isLoading: isLoadingStores,
    isRefetching,
    refetch: refetchStores,
  } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => api.getAdminStores(),
  });

  const handleToggleVerification = async (storeId: string, currentStatus: boolean) => {
    try {
      await api.patchAdminStore(storeId, { is_verified: !currentStatus });
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar selo");
    }
  };

  const handleToggleFeatured = async (storeId: string, currentStatus: boolean) => {
    try {
      await api.patchAdminStore(storeId, { is_featured: !currentStatus });
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar destaque");
    }
  };

  const handleToggleStatus = async (storeId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await api.patchAdminStore(storeId, { status: nextStatus });
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar status da loja");
    }
  };

  const filteredStores = stores.filter((s) => {
    const matchesSearch =
      !searchFilter ||
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.category_name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesTier = tierFilter === "all" || s.plan_tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable
          testID="admin-back-btn"
          style={styles.backBtn}
          onPress={() => router.push("/(tabs)" as any)}
        >
          <ArrowLeft size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Console Super Admin</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchMetrics();
              refetchStores();
            }}
            tintColor={colors.brandPrimary}
          />
        }
      >
        {/* Platform Overview KPIs */}
        <Text style={styles.sectionHeader}>INDICADORES SAAS DA PLATAFORMA</Text>

        <View style={styles.kpiGrid}>
          {/* MRR */}
          <View style={[styles.kpiCard, { borderColor: colors.brandPrimary }]} testID="admin-mrr-card">
            <View style={[styles.kpiIcon, { backgroundColor: colors.brandTertiary }]}>
              <DollarSign size={22} color={colors.brandPrimary} />
            </View>
            <Text style={styles.kpiValue}>
              {metrics?.mrr_formatted || "R$ 377,00"}
            </Text>
            <Text style={styles.kpiLabel}>Receita Recorrente (MRR)</Text>
          </View>

          {/* Stores */}
          <View style={styles.kpiCard} testID="admin-stores-card">
            <View style={[styles.kpiIcon, { backgroundColor: "#DBEAFE" }]}>
              <Store size={22} color="#1D4ED8" />
            </View>
            <Text style={styles.kpiValue}>{metrics?.total_stores || stores.length}</Text>
            <Text style={styles.kpiLabel}>Lojas Cadastradas</Text>
          </View>

          {/* WhatsApp Leads */}
          <View style={styles.kpiCard} testID="admin-leads-card">
            <View style={[styles.kpiIcon, { backgroundColor: "#DCFCE7" }]}>
              <MessageCircle size={22} color="#15803D" />
            </View>
            <Text style={[styles.kpiValue, { color: "#15803D" }]}>
              {metrics?.total_whatsapp_leads || "1.291"}
            </Text>
            <Text style={styles.kpiLabel}>Leads de WhatsApp Gerados</Text>
          </View>

          {/* Registered Users */}
          <View style={styles.kpiCard} testID="admin-users-card">
            <View style={[styles.kpiIcon, { backgroundColor: "#F3E8FF" }]}>
              <Users size={22} color="#7E22CE" />
            </View>
            <Text style={styles.kpiValue}>{metrics?.total_users || 3}</Text>
            <Text style={styles.kpiLabel}>Usuários & Lojistas</Text>
          </View>
        </View>

        {/* Plan Distribution Stats */}
        <View style={styles.distributionCard}>
          <Text style={styles.distTitle}>Distribuição por Plano SaaS</Text>
          <View style={styles.distPillsRow}>
            <View style={[styles.distPill, { backgroundColor: colors.surfaceTertiary }]}>
              <Text style={styles.distPillLabel}>Grátis (R$0)</Text>
              <Text style={styles.distPillVal}>
                {metrics?.plans_distribution?.free ?? 1}
              </Text>
            </View>
            <View style={[styles.distPill, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[styles.distPillLabel, { color: "#B45309" }]}>Pro (R$79)</Text>
              <Text style={[styles.distPillVal, { color: "#B45309" }]}>
                {metrics?.plans_distribution?.pro ?? 2}
              </Text>
            </View>
            <View style={[styles.distPill, { backgroundColor: "#FFEDD5" }]}>
              <Text style={[styles.distPillLabel, { color: "#C2410C" }]}>Premium (R$149)</Text>
              <Text style={[styles.distPillVal, { color: "#C2410C" }]}>
                {metrics?.plans_distribution?.premium ?? 2}
              </Text>
            </View>
          </View>
        </View>

        {/* Stores Moderation Section */}
        <View style={styles.storesSectionHeader}>
          <Text style={styles.sectionHeader}>GESTÃO & MODERAÇÃO DE LOJAS</Text>
        </View>

        {/* Search & Tier Filter */}
        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.muted} />
            <TextInput
              testID="admin-search-input"
              style={styles.searchInput}
              placeholder="Buscar loja ou categoria..."
              placeholderTextColor={colors.muted}
              value={searchFilter}
              onChangeText={setSearchFilter}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {["all", "free", "pro", "premium"].map((t) => (
              <Pressable
                key={t}
                testID={`admin-tier-filter-${t}`}
                style={[
                  styles.tierFilterPill,
                  tierFilter === t && styles.tierFilterPillActive,
                ]}
                onPress={() => setTierFilter(t)}
              >
                <Text
                  style={[
                    styles.tierFilterText,
                    tierFilter === t && styles.tierFilterTextActive,
                  ]}
                >
                  {t === "all" ? "Todos" : t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Store items list */}
        {isLoadingStores ? (
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        ) : (
          <View style={styles.adminStoresList}>
            {filteredStores.map((s) => (
              <View
                key={s.id}
                style={styles.adminStoreCard}
                testID={`admin-store-row-${s.id}`}
              >
                <View style={styles.adminStoreHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminStoreName}>{s.name}</Text>
                    <Text style={styles.adminStoreCategory}>
                      {s.category_name} • Plano {s.plan_tier.toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      s.status === "active" ? styles.statusActive : styles.statusSuspended,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        s.status === "active"
                          ? styles.statusActiveText
                          : styles.statusSuspendedText,
                      ]}
                    >
                      {s.status === "active" ? "Ativa" : "Suspensa"}
                    </Text>
                  </View>
                </View>

                {/* Moderation Actions Row */}
                <View style={styles.adminActionsRow}>
                  {/* Toggle Verified */}
                  <Pressable
                    testID={`toggle-verified-btn-${s.id}`}
                    style={[
                      styles.modActionBtn,
                      s.is_verified && styles.modActionBtnActive,
                    ]}
                    onPress={() => handleToggleVerification(s.id, s.is_verified)}
                  >
                    <CheckCircle2
                      size={14}
                      color={s.is_verified ? "#FFFFFF" : colors.onSurfaceSecondary}
                    />
                    <Text
                      style={[
                        styles.modActionText,
                        s.is_verified && styles.modActionTextActive,
                      ]}
                    >
                      {s.is_verified ? "Selo Verificado" : "+ Selo"}
                    </Text>
                  </Pressable>

                  {/* Toggle Featured VIP */}
                  <Pressable
                    testID={`toggle-featured-btn-${s.id}`}
                    style={[
                      styles.modActionBtn,
                      s.is_featured && styles.modActionBtnVIP,
                    ]}
                    onPress={() => handleToggleFeatured(s.id, s.is_featured)}
                  >
                    <Sparkles
                      size={14}
                      color={s.is_featured ? "#FFFFFF" : colors.onSurfaceSecondary}
                    />
                    <Text
                      style={[
                        styles.modActionText,
                        s.is_featured && styles.modActionTextActive,
                      ]}
                    >
                      {s.is_featured ? "Destaque VIP" : "+ Destaque"}
                    </Text>
                  </Pressable>

                  {/* Suspend / Reactivate */}
                  <Pressable
                    testID={`toggle-status-btn-${s.id}`}
                    style={[
                      styles.modActionBtn,
                      s.status === "suspended" && styles.modActionBtnDanger,
                    ]}
                    onPress={() => handleToggleStatus(s.id, s.status)}
                  >
                    <Text
                      style={[
                        styles.modActionText,
                        s.status === "suspended" && styles.modActionTextActive,
                      ]}
                    >
                      {s.status === "active" ? "Suspender" : "Ativar"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    ...TACTILE_CARD,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurfaceSecondary,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  distributionCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  distTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginBottom: 10,
  },
  distPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  distPill: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  distPillLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.onSurfaceTertiary,
  },
  distPillVal: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurfaceSecondary,
    marginTop: 2,
  },
  storesSectionHeader: {
    marginTop: 6,
  },
  filterBar: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurface,
  },
  tierFilterPill: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 6,
  },
  tierFilterPillActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  tierFilterText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  tierFilterTextActive: {
    color: "#FFFFFF",
  },
  adminStoresList: {
    gap: 10,
  },
  adminStoreCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  adminStoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  adminStoreName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  adminStoreCategory: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: "#DCFCE7",
  },
  statusSuspended: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusActiveText: {
    color: "#15803D",
  },
  statusSuspendedText: {
    color: "#B91C1C",
  },
  adminActionsRow: {
    flexDirection: "row",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 8,
  },
  modActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  modActionBtnActive: {
    backgroundColor: colors.brandPrimary,
  },
  modActionBtnVIP: {
    backgroundColor: colors.brandSecondary,
  },
  modActionBtnDanger: {
    backgroundColor: "#EF4444",
  },
  modActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  modActionTextActive: {
    color: "#FFFFFF",
  },
}));
