import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  User,
  Store,
  Shield,
  CreditCard,
  Layers,
  Sparkles,
  LogOut,
  ChevronRight,
  Info,
  RefreshCw,
} from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { RoleSwitcherModal } from "@/src/components/RoleSwitcherModal";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);

  const getRoleInfo = () => {
    if (user?.role === "super_admin") {
      return {
        name: "Super Administrador",
        tag: "Governança da Plataforma",
        color: "#4338CA",
        bg: "#EEF2FF",
        icon: Shield,
      };
    }
    if (user?.role === "store_owner") {
      return {
        name: "Lojista & Comerciante",
        tag: "Plano SaaS Ativo",
        color: colors.brandPrimary,
        bg: colors.brandTertiary,
        icon: Store,
      };
    }
    return {
      name: "Consumidor Local",
      tag: "Conta Pessoal",
      color: "#047857",
      bg: "#ECFDF5",
      icon: User,
    };
  };

  const roleInfo = getRoleInfo();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatarContainer}>
            <View style={[styles.avatarCircle, { backgroundColor: roleInfo.bg }]}>
              <roleInfo.icon size={28} color={roleInfo.color} />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user ? user.name : "Visitante Não Autenticado"}
            </Text>
            <Text style={styles.userEmail}>
              {user ? user.email : "Entre para salvar favoritos e acessar seu painel"}
            </Text>
            {user && (
              <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                  {roleInfo.tag}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 1-Tap Role Switcher Banner */}
        <Pressable
          testID="profile-open-role-switcher-btn"
          style={styles.switcherBanner}
          onPress={() => setIsRoleModalVisible(true)}
        >
          <View style={styles.switcherLeft}>
            <View style={styles.switcherIconCircle}>
              <RefreshCw size={18} color={colors.brandPrimary} />
            </View>
            <View>
              <Text style={styles.switcherTitle}>Alternar Modo do App</Text>
              <Text style={styles.switcherSubtitle}>
                Trocar entre Consumidor, Lojista e Super Admin
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.brandPrimary} />
        </Pressable>

        {/* Portal Shortcuts Section */}
        <Text style={styles.sectionTitle}>PAINÉIS & RECURSOS SAAS</Text>

        {/* Lojista Dashboard Button */}
        <Pressable
          testID="profile-goto-owner-dashboard-btn"
          style={styles.menuItem}
          onPress={() => router.push("/owner/dashboard" as any)}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: colors.brandTertiary }]}>
            <Store size={20} color={colors.brandPrimary} />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Painel do Lojista</Text>
            <Text style={styles.menuSubtitle}>
              Métricas de visitas, leads no WhatsApp e catálogo
            </Text>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </Pressable>

        {/* SaaS Plans & Upgrades */}
        <Pressable
          testID="profile-goto-plans-btn"
          style={styles.menuItem}
          onPress={() => router.push("/owner/plans" as any)}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: "#FEF3C7" }]}>
            <CreditCard size={20} color="#B45309" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Planos SaaS & Destaques VIP</Text>
            <Text style={styles.menuSubtitle}>
              Planos Grátis, Pro e Premium VIP com banner
            </Text>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </Pressable>

        {/* Super Admin Console */}
        <Pressable
          testID="profile-goto-admin-btn"
          style={styles.menuItem}
          onPress={() => router.push("/admin/dashboard" as any)}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: "#EEF2FF" }]}>
            <Shield size={20} color="#4338CA" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Console Super Admin</Text>
            <Text style={styles.menuSubtitle}>
              Governança da cidade, MRR e moderação de lojas
            </Text>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </Pressable>

        {/* App Info Section */}
        <Text style={styles.sectionTitle}>SOBRE O APLICATIVO</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versão do App</Text>
            <Text style={styles.infoValue}>1.0.0 (UrbanPulse Hub 2026)</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cidade Operacional</Text>
            <Text style={styles.infoValue}>São Paulo, SP</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Modelo de Negócios</Text>
            <Text style={styles.infoValue}>SaaS Local + Destaques VIP</Text>
          </View>
        </View>

        {/* Auth Action (Login / Logout) */}
        {user ? (
          <Pressable
            testID="profile-logout-btn"
            style={styles.logoutBtn}
            onPress={async () => {
              await logout();
              router.push("/" as any);
            }}
          >
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Sair da Conta</Text>
          </Pressable>
        ) : (
          <Pressable
            testID="profile-login-btn"
            style={styles.loginActionBtn}
            onPress={() => router.push("/auth/login" as any)}
          >
            <Text style={styles.loginActionBtnText}>Fazer Login / Cadastrar</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Role Switcher Modal */}
      <RoleSwitcherModal
        visible={isRoleModalVisible}
        onClose={() => setIsRoleModalVisible(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  userAvatarContainer: {},
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  switcherBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFDF6",
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },
  switcherLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  switcherIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  switcherTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  switcherSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  menuItem: {
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
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  infoCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 4,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutBtnText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "700",
  },
  loginActionBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  loginActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
}));
