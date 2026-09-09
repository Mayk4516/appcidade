import React from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Heart, Compass, LogIn } from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { Header } from "@/src/components/Header";
import { StoreCard } from "@/src/components/StoreCard";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, updateUserFavorites } = useAuth();

  const {
    data: favoriteStores = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["user-favorites", user?.id],
    queryFn: api.getUserFavorites,
    enabled: !!user,
  });

  const handleToggleFavorite = async (storeId: string) => {
    try {
      const res = await api.toggleFavorite(storeId);
      updateUserFavorites(res.saved_stores);
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    } catch (e) {
      console.warn("Error toggling favorite", e);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header />

      <View style={styles.titleSection}>
        <Text style={styles.title}>Lojas Salvas</Text>
        <Text style={styles.subtitle}>
          Seus comércios favoritos da cidade reunidos em um só lugar
        </Text>
      </View>

      {!user ? (
        <View style={styles.emptyContainer} testID="favorites-unauth">
          <View style={styles.iconCircle}>
            <LogIn size={32} color={colors.brandPrimary} />
          </View>
          <Text style={styles.emptyTitle}>Faça Login para Ver Salvos</Text>
          <Text style={styles.emptySubtitle}>
            Entre na sua conta para acessar suas lojas preferidas e chamar no WhatsApp a qualquer momento.
          </Text>
          <Pressable
            testID="login-favorites-btn"
            style={styles.actionBtn}
            onPress={() => router.push("/auth/login" as any)}
          >
            <Text style={styles.actionBtnText}>Entrar na Conta</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer} testID="favorites-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={styles.loadingText}>Carregando lojas salvas...</Text>
        </View>
      ) : (
        <FlatList
          data={favoriteStores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.brandPrimary}
            />
          }
          renderItem={({ item }) => (
            <StoreCard
              store={item}
              isFavorite={true}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer} testID="favorites-empty">
              <View style={styles.iconCircle}>
                <Heart size={32} color={colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma loja salva ainda</Text>
              <Text style={styles.emptySubtitle}>
                Toque no ícone de coração nos cartões de lojas para salvá-las aqui.
              </Text>
              <Pressable
                testID="explore-favorites-btn"
                style={styles.actionBtn}
                onPress={() => router.push("/(tabs)" as any)}
              >
                <Compass size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Explorar Lojas</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 16,
    gap: 8,
    borderBottomWidth: 4,
    borderBottomColor: "#1C1917",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
}));
