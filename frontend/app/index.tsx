import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Store,
  User,
  Shield,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MessageCircle,
  Award,
} from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { UserRole } from "@/src/types";

export default function EntryRoleSwitcherScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { user, switchDemoRole } = useAuth();
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);

  const handleEnterRole = async (role: UserRole) => {
    setLoadingRole(role);
    try {
      await switchDemoRole(role);
      if (role === "store_owner") {
        router.push("/owner/dashboard" as any);
      } else if (role === "super_admin") {
        router.push("/admin/dashboard" as any);
      } else {
        router.push("/(tabs)" as any);
      }
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Hero */}
        <View style={styles.heroSection}>
          <View style={styles.badgeContainer}>
            <Sparkles size={14} color={colors.brandPrimary} />
            <Text style={styles.heroBadgeText}>PLATAFORMA SAAS DA CIDADE</Text>
          </View>
          <Text style={styles.heroTitle}>UrbanPulse CityHub</Text>
          <Text style={styles.heroSubtitle}>
            Conectando comércios locais, catálogo interativo e conversão em 1 clique no WhatsApp
          </Text>
        </View>

        {/* Feature Highlights Banner */}
        <View style={styles.highlightsContainer}>
          <View style={styles.highlightItem}>
            <MessageCircle size={18} color={colors.brandPrimary} />
            <Text style={styles.highlightText}>WhatsApp 1-Clique</Text>
          </View>
          <View style={styles.highlightDivider} />
          <View style={styles.highlightItem}>
            <Award size={18} color={colors.brandPrimary} />
            <Text style={styles.highlightText}>Selo Verificado</Text>
          </View>
          <View style={styles.highlightDivider} />
          <View style={styles.highlightItem}>
            <TrendingUp size={18} color={colors.brandPrimary} />
            <Text style={styles.highlightText}>Planos SaaS</Text>
          </View>
        </View>

        {/* Profile Selector Section */}
        <Text style={styles.sectionHeader}>ESCOLHA COMO QUER ENTRAR</Text>

        {/* Card 1: Consumidor */}
        <Pressable
          testID="btn-role-consumer"
          style={styles.roleCard}
          onPress={() => handleEnterRole("user")}
          disabled={!!loadingRole}
        >
          <View style={[styles.roleIconCircle, { backgroundColor: "#ECFDF5" }]}>
            <User size={26} color="#047857" />
          </View>
          <View style={styles.roleCardContent}>
            <View style={styles.roleCardTitleRow}>
              <Text style={styles.roleCardTitle}>Consumidor Final</Text>
              <View style={[styles.pillTag, { backgroundColor: "#ECFDF5" }]}>
                <Text style={[styles.pillTagText, { color: "#047857" }]}>Explorar</Text>
              </View>
            </View>
            <Text style={styles.roleCardDesc}>
              Descubra lojas por categorias, veja cardápios e produtos, e fale direto no WhatsApp.
            </Text>
          </View>
          {loadingRole === "user" ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          ) : (
            <ArrowRight size={20} color={colors.muted} />
          )}
        </Pressable>

        {/* Card 2: Lojista SaaS */}
        <Pressable
          testID="btn-role-store-owner"
          style={[styles.roleCard, styles.roleCardFeatured]}
          onPress={() => handleEnterRole("store_owner")}
          disabled={!!loadingRole}
        >
          <View style={styles.popularBanner}>
            <Text style={styles.popularBannerText}>PORTAL DO LOJISTA</Text>
          </View>
          <View style={[styles.roleIconCircle, { backgroundColor: colors.brandTertiary }]}>
            <Store size={26} color={colors.brandPrimary} />
          </View>
          <View style={styles.roleCardContent}>
            <View style={styles.roleCardTitleRow}>
              <Text style={styles.roleCardTitle}>Lojista (Comerciante)</Text>
              <View style={[styles.pillTag, { backgroundColor: colors.brandTertiary }]}>
                <Text style={[styles.pillTagText, { color: colors.brandPrimary }]}>SaaS</Text>
              </View>
            </View>
            <Text style={styles.roleCardDesc}>
              Gerencie sua loja, produtos, banner em destaque, métricas de visitas e faça upgrade de plano.
            </Text>
          </View>
          {loadingRole === "store_owner" ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          ) : (
            <ArrowRight size={20} color={colors.brandPrimary} />
          )}
        </Pressable>

        {/* Card 3: Super Admin */}
        <Pressable
          testID="btn-role-super-admin"
          style={styles.roleCard}
          onPress={() => handleEnterRole("super_admin")}
          disabled={!!loadingRole}
        >
          <View style={[styles.roleIconCircle, { backgroundColor: "#EEF2FF" }]}>
            <Shield size={26} color="#4338CA" />
          </View>
          <View style={styles.roleCardContent}>
            <View style={styles.roleCardTitleRow}>
              <Text style={styles.roleCardTitle}>Super Admin (Governança)</Text>
              <View style={[styles.pillTag, { backgroundColor: "#EEF2FF" }]}>
                <Text style={[styles.pillTagText, { color: "#4338CA" }]}>Gestão</Text>
              </View>
            </View>
            <Text style={styles.roleCardDesc}>
              Monitore faturamento MRR, aprove novas lojas, controle selos de verificação e categorias.
            </Text>
          </View>
          {loadingRole === "super_admin" ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          ) : (
            <ArrowRight size={20} color={colors.muted} />
          )}
        </Pressable>

        {/* Custom Auth & Direct Explorer Link */}
        <View style={styles.footerActions}>
          <Pressable
            testID="btn-direct-marketplace"
            style={styles.marketplaceDirectBtn}
            onPress={() => handleEnterRole("user")}
            disabled={!!loadingRole}
          >
            <Text style={styles.marketplaceDirectText}>
              Entrar direto no Catálogo da Cidade
            </Text>
          </Pressable>

          <Pressable
            testID="btn-custom-login"
            style={styles.loginLinkBtn}
            onPress={() => router.push("/auth/login" as any)}
          >
            <Text style={styles.loginLinkText}>
              Já tem conta própria? Fazer Login / Cadastro
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brandPrimary,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.onSurface,
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  highlightsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  highlightText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  highlightDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.divider,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  roleCardFeatured: {
    borderColor: colors.brand,
    borderWidth: 1.5,
    backgroundColor: "#FFFCF6",
    position: "relative",
    paddingTop: 20,
  },
  popularBanner: {
    position: "absolute",
    top: 0,
    left: 20,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  popularBannerText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  roleIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  roleCardContent: {
    flex: 1,
  },
  roleCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  pillTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  roleCardDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  footerActions: {
    marginTop: 12,
    gap: 10,
  },
  marketplaceDirectBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  marketplaceDirectText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  loginLinkBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  loginLinkText: {
    color: colors.brandPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
}));
