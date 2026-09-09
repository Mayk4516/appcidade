import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Sparkles,
  Award,
  Crown,
  Shield,
  Zap,
} from "lucide-react-native";
import { useTheme, makeStyles, TACTILE_CARD } from "@/src/theme";
import { api } from "@/src/api";
import { SaasPlan } from "@/src/types";

export default function OwnerPlansScreen() {
  const { store_id } = useLocalSearchParams<{ store_id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { data: stores = [] } = useQuery({
    queryKey: ["owner-stores"],
    queryFn: api.getOwnerStores,
  });

  const activeStore = stores.find((s) => s.id === store_id) || stores[0];
  const targetStoreId = activeStore?.id || store_id || "";

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["saas-plans"],
    queryFn: api.getSaasPlans,
  });

  const handleUpgrade = async (tier: string) => {
    if (!targetStoreId) return;
    setIsUpgrading(true);
    setSuccessMessage("");
    try {
      const res = await api.upgradePlan(targetStoreId, tier);
      setSuccessMessage(res.message || "Plano atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["owner-stores"] });
      queryClient.invalidateQueries({ queryKey: ["store", targetStoreId] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    } catch (err: any) {
      alert(err.message || "Erro ao assinar plano");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable
          testID="plans-back-btn"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Planos SaaS & Destaques</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Sparkles size={14} color={colors.brandPrimary} />
            <Text style={styles.heroBadgeText}>CRESÇA SUAS VENDAS LOCAIS</Text>
          </View>
          <Text style={styles.heroTitle}>Destaque sua Loja na Cidade</Text>
          <Text style={styles.heroSubtitle}>
            Escolha o plano ideal para receber mais clientes, ter selo verificado e banner em destaque.
          </Text>
        </View>

        {successMessage ? (
          <View style={styles.successBox} testID="plan-upgrade-success">
            <Check size={20} color="#047857" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        ) : (
          <View style={styles.plansContainer}>
            {plans.map((p) => {
              const isCurrent = activeStore?.plan_tier === p.tier;
              const isSelected = selectedPlan === p.tier;
              const isVIP = p.tier === "premium";

              return (
                <Pressable
                  key={p.tier}
                  testID={`plan-card-${p.tier}`}
                  style={[
                    styles.planCard,
                    isVIP && styles.planCardVIP,
                    isSelected && styles.planCardSelected,
                  ]}
                  onPress={() => setSelectedPlan(p.tier)}
                >
                  {isVIP && (
                    <View style={styles.vipTag}>
                      <Crown size={12} color="#FFFFFF" />
                      <Text style={styles.vipTagText}>MAIS POPULAR & COMPLETO</Text>
                    </View>
                  )}

                  <View style={styles.planCardHeader}>
                    <View>
                      <Text style={styles.planName}>{p.name}</Text>
                      <Text style={styles.planDesc}>{p.description}</Text>
                    </View>
                    <Text style={styles.planPrice}>{p.price_display}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.featuresList}>
                    {p.features.map((f, i) => (
                      <View key={i} style={styles.featureItem}>
                        <Check size={14} color={colors.brandPrimary} />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    testID={`subscribe-btn-${p.tier}`}
                    style={[
                      styles.subscribeBtn,
                      isCurrent && styles.currentPlanBtn,
                      isVIP && !isCurrent && styles.subscribeBtnVIP,
                    ]}
                    onPress={() => handleUpgrade(p.tier)}
                    disabled={isUpgrading || isCurrent}
                  >
                    {isUpgrading && isSelected ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.subscribeBtnText,
                          isCurrent && styles.currentPlanBtnText,
                        ]}
                      >
                        {isCurrent ? "Plano Atual Ativo" : `Assinar ${p.name}`}
                      </Text>
                    )}
                  </Pressable>
                </Pressable>
              );
            })}
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
  heroSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brandPrimary,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.onSurface,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  successText: {
    color: "#047857",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    ...TACTILE_CARD,
  },
  planCardVIP: {
    borderColor: colors.brand,
    borderWidth: 2,
    backgroundColor: "#FFFDF6",
    position: "relative",
    paddingTop: 24,
  },
  planCardSelected: {
    borderColor: colors.brandPrimary,
  },
  vipTag: {
    position: "absolute",
    top: 0,
    left: 20,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  vipTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  planName: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onSurfaceSecondary,
  },
  planDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    maxWidth: 200,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },
  featuresList: {
    gap: 8,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: colors.onSurfaceSecondary,
  },
  subscribeBtn: {
    backgroundColor: colors.brandPrimary,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#1C1917",
  },
  subscribeBtnVIP: {
    backgroundColor: colors.brandSecondary,
  },
  currentPlanBtn: {
    backgroundColor: colors.surfaceTertiary,
    borderBottomColor: colors.borderStrong,
  },
  subscribeBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  currentPlanBtnText: {
    color: colors.muted,
  },
}));
