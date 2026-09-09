import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  User,
  Store,
  Shield,
  CreditCard,
  Heart,
  LogOut,
  ChevronRight,
  MapPin,
  RefreshCw,
} from "lucide-react-native";
import { useTheme, makeStyles, INK, TACTILE_CARD } from "@/src/theme";
import { PressableScale } from "@/src/components/PressableScale";
import { AnimatedItem } from "@/src/components/AnimatedItem";
import { useAuth } from "@/src/context/AuthContext";
import { RoleSwitcherModal } from "@/src/components/RoleSwitcherModal";

interface MenuEntry {
  testID: string;
  title: string;
  subtitle: string;
  icon: any;
  bg: string;
  fg: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);

  const getRoleInfo = () => {
    if (user?.role === "super_admin")
      return { name: "Super Administrador", tag: "Governança", color: "#C7D2FE", icon: Shield };
    if (user?.role === "store_owner")
      return { name: "Lojista", tag: "Conta comercial", color: colors.brandTertiary, icon: Store };
    return { name: "Consumidor", tag: "Conta pessoal", color: "#BBF7D0", icon: User };
  };
  const roleInfo = getRoleInfo();

  // Role-scoped menu: each role only sees what belongs to it.
  const menu: MenuEntry[] = [];
  if (user?.role === "store_owner") {
    menu.push(
      {
        testID: "profile-goto-owner-dashboard-btn",
        title: "Painel do Lojista",
        subtitle: "Métricas, leads no WhatsApp e catálogo",
        icon: Store,
        bg: colors.brandTertiary,
        fg: colors.brandPrimary,
        onPress: () => router.push("/owner/dashboard" as any),
      },
      {
        testID: "profile-goto-plans-btn",
        title: "Planos & Destaques VIP",
        subtitle: "Grátis, Pro e Premium com banner",
        icon: CreditCard,
        bg: "#FEF3C7",
        fg: "#B45309",
        onPress: () => router.push("/owner/plans" as any),
      },
    );
  } else if (user?.role === "super_admin") {
    menu.push({
      testID: "profile-goto-admin-btn",
      title: "Console Super Admin",
      subtitle: "Governança da cidade, MRR e moderação",
      icon: Shield,
      bg: "#EEF2FF",
      fg: "#4338CA",
      onPress: () => router.push("/admin/dashboard" as any),
    });
  } else {
    // Consumer-only shortcuts
    menu.push({
      testID: "profile-goto-favorites-btn",
      title: "Minhas Lojas Favoritas",
      subtitle: "Acesse rapidamente o que você salvou",
      icon: Heart,
      bg: "#FFE4E6",
      fg: "#BE123C",
      onPress: () => router.push("/(tabs)/favorites" as any),
    });
  }

  return (
    <View style={styles.container}>
      {/* Dark hero header (same language as Home) */}
      <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <Text style={styles.heroLabel}>PERFIL</Text>
        <View style={styles.heroUserRow}>
          <View style={[styles.avatarCircle, { backgroundColor: roleInfo.color }]}>
            <roleInfo.icon size={26} color={INK} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {user ? user.name : "Visitante"}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user ? user.email : "Entre para salvar favoritos"}
            </Text>
          </View>
        </View>
        {user && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {roleInfo.name} • {roleInfo.tag}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {menu.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {user?.role === "store_owner" || user?.role === "super_admin"
                ? "SEU PAINEL"
                : "ATALHOS"}
            </Text>
            {menu.map((m, i) => (
              <AnimatedItem key={m.testID} index={i}>
                <PressableScale testID={m.testID} style={styles.menuItem} onPress={m.onPress}>
                  <View style={[styles.menuIconCircle, { backgroundColor: m.bg }]}>
                    <m.icon size={20} color={m.fg} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{m.title}</Text>
                    <Text style={styles.menuSubtitle}>{m.subtitle}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.muted} />
                </PressableScale>
              </AnimatedItem>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>SOBRE O APLICATIVO</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versão</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <MapPin size={14} color={colors.muted} />
              <Text style={styles.infoLabel}>Cidade</Text>
            </View>
            <Text style={styles.infoValue}>São Paulo, SP</Text>
          </View>
        </View>

        {user ? (
          <PressableScale
            testID="profile-logout-btn"
            style={styles.logoutBtn}
            onPress={async () => {
              await logout();
              router.replace("/" as any);
            }}
          >
            <LogOut size={18} color={colors.error} />
            <Text style={styles.logoutBtnText}>Sair da Conta</Text>
          </PressableScale>
        ) : (
          <PressableScale
            testID="profile-login-btn"
            style={styles.loginActionBtn}
            haptic="medium"
            onPress={() => router.push("/auth/login" as any)}
          >
            <Text style={styles.loginActionBtnText}>Fazer Login / Cadastrar</Text>
          </PressableScale>
        )}

        {/* Discreet demo-only role switcher */}
        <Pressable
          testID="profile-open-role-switcher-btn"
          style={styles.demoSwitch}
          onPress={() => setIsRoleModalVisible(true)}
        >
          <RefreshCw size={12} color={colors.muted} />
          <Text style={styles.demoSwitchText}>Modo demonstração · alternar perfil</Text>
        </Pressable>
      </ScrollView>

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
  hero: {
    backgroundColor: colors.surfaceInverse,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 14,
  },
  heroUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  userEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 14,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandTertiary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    ...TACTILE_CARD,
  },
  menuIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  infoCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    ...TACTILE_CARD,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 6,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    height: 54,
    borderRadius: 16,
    gap: 8,
  },
  logoutBtnText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: "800",
  },
  loginActionBtn: {
    backgroundColor: colors.brandPrimary,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loginActionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  demoSwitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 22,
    paddingVertical: 8,
  },
  demoSwitchText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
}));
