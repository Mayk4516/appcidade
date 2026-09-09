import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MapPin, User, Shield, Store, Sparkles, ChevronDown } from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";

interface HeaderProps {
  city?: string;
  onOpenRoleSwitcher?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  city = "São Paulo, SP",
  onOpenRoleSwitcher,
}) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const { user } = useAuth();
  const router = useRouter();

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === "super_admin") {
      return {
        label: "Admin Geral",
        icon: Shield,
        color: colors.brandSecondary,
        bg: colors.brandTertiary,
      };
    }
    if (user.role === "store_owner") {
      return {
        label: "Painel Lojista",
        icon: Store,
        color: colors.brandPrimary,
        bg: colors.brandTertiary,
      };
    }
    return {
      label: "Consumidor",
      icon: User,
      color: colors.success,
      bg: "#ECFDF5",
    };
  };

  const roleBadge = getRoleBadge();

  return (
    <View style={styles.container}>
      {/* City / Location pill */}
      <View style={styles.locationContainer}>
        <View style={styles.iconCircle}>
          <MapPin size={16} color={colors.brandPrimary} />
        </View>
        <View>
          <Text style={styles.locationLabel}>GUIA COMERCIAL</Text>
          <Text style={styles.locationCity}>{city}</Text>
        </View>
      </View>

      {/* Role / Profile Pill */}
      <Pressable
        testID="header-profile-role-btn"
        style={styles.profileButton}
        onPress={() => {
          if (onOpenRoleSwitcher) {
            onOpenRoleSwitcher();
          } else {
            router.push("/auth/login" as any);
          }
        }}
      >
        {roleBadge ? (
          <View style={[styles.rolePill, { backgroundColor: roleBadge.bg }]}>
            <roleBadge.icon size={13} color={roleBadge.color} />
            <Text style={[styles.rolePillText, { color: roleBadge.color }]}>
              {roleBadge.label}
            </Text>
            <ChevronDown size={12} color={roleBadge.color} />
          </View>
        ) : (
          <View style={styles.loginPill}>
            <User size={14} color={colors.onBrandPrimary} />
            <Text style={styles.loginPillText}>Entrar</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.6,
  },
  locationCity: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  profileButton: {
    paddingVertical: 4,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  loginPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  loginPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
}));
