import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { User, Store, Shield, X, Check, ArrowRight } from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { UserRole } from "@/src/types";

interface RoleSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const { user, switchDemoRole } = useAuth();
  const router = useRouter();

  const handleSelectRole = async (role: UserRole) => {
    try {
      await switchDemoRole(role);
    } catch {
      onClose();
      router.push("/auth/login" as any);
      return;
    }
    onClose();
    if (role === "store_owner") {
      router.push("/owner/dashboard" as any);
    } else if (role === "super_admin") {
      router.push("/admin/dashboard" as any);
    } else {
      router.push("/(tabs)" as any);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet} testID="role-switcher-modal">
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Alternar Perfil da Plataforma</Text>
              <Text style={styles.subtitle}>
                Explore as 3 experiências do app em 1 toque
              </Text>
            </View>
            <Pressable
              testID="close-role-switcher-btn"
              style={styles.closeBtn}
              onPress={onClose}
            >
              <X size={20} color={colors.onSurface} />
            </Pressable>
          </View>

          {/* Option 1: Consumidor */}
          <Pressable
            testID="role-option-consumer"
            style={[
              styles.optionCard,
              user?.role === "user" && styles.selectedOptionCard,
            ]}
            onPress={() => handleSelectRole("user")}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#ECFDF5" }]}>
              <User size={22} color="#047857" />
            </View>
            <View style={styles.optionInfo}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Consumidor Final</Text>
                {user?.role === "user" && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Ativo</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionDescription}>
                Navegar por lojas da cidade, ver catálogo, favoritar e chamar no WhatsApp
              </Text>
            </View>
            <ArrowRight size={18} color={colors.muted} />
          </Pressable>

          {/* Option 2: Lojista */}
          <Pressable
            testID="role-option-store-owner"
            style={[
              styles.optionCard,
              user?.role === "store_owner" && styles.selectedOptionCard,
            ]}
            onPress={() => handleSelectRole("store_owner")}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.brandTertiary }]}>
              <Store size={22} color={colors.brandPrimary} />
            </View>
            <View style={styles.optionInfo}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Lojista (Painel SaaS)</Text>
                {user?.role === "store_owner" && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Ativo</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionDescription}>
                Gerenciar catálogo, métricas de WhatsApp, banner e planos SaaS
              </Text>
            </View>
            <ArrowRight size={18} color={colors.muted} />
          </Pressable>

          {/* Option 3: Super Admin */}
          <Pressable
            testID="role-option-super-admin"
            style={[
              styles.optionCard,
              user?.role === "super_admin" && styles.selectedOptionCard,
            ]}
            onPress={() => handleSelectRole("super_admin")}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#EEF2FF" }]}>
              <Shield size={22} color="#4338CA" />
            </View>
            <View style={styles.optionInfo}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Super Admin (Governança)</Text>
                {user?.role === "super_admin" && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Ativo</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionDescription}>
                Receita MRR, aprovar lojas, conceder selos e gerenciar planos
              </Text>
            </View>
            <ArrowRight size={18} color={colors.muted} />
          </Pressable>

          <Pressable
            testID="login-other-account-btn"
            style={styles.customLoginBtn}
            onPress={() => {
              onClose();
              router.push("/auth/login" as any);
            }}
          >
            <Text style={styles.customLoginText}>Entrar com Outra Conta / Cadastrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const useStyles = makeStyles((colors) => ({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  selectedOptionCard: {
    borderColor: colors.brand,
    backgroundColor: "#FFFDF9",
    borderWidth: 1.5,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  activePill: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  optionDescription: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  customLoginBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
  },
  customLoginText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurfaceTertiary,
  },
}));
