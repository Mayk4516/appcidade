import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Utensils,
  Shirt,
  Sparkles,
  ShoppingCart,
  Wrench,
  PawPrint,
  Home,
  Smartphone,
  ChevronRight,
  Store,
} from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { Header } from "@/src/components/Header";
import { api } from "@/src/api";
import { Category } from "@/src/types";

const ICON_MAP: Record<string, any> = {
  utensils: Utensils,
  shirt: Shirt,
  sparkles: Sparkles,
  "shopping-cart": ShoppingCart,
  wrench: Wrench,
  "paw-print": PawPrint,
  home: Home,
  smartphone: Smartphone,
};

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();

  const {
    data: categories = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });

  const handleCategoryPress = (catId: string) => {
    router.push({
      pathname: "/(tabs)",
      params: { category_id: catId },
    } as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header />

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
        <View style={styles.titleSection}>
          <Text style={styles.title}>Categorias Comerciais</Text>
          <Text style={styles.subtitle}>
            Encontre exatamente o que procura nas melhores lojas de São Paulo
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer} testID="categories-loading">
            <ActivityIndicator size="large" color={colors.brandPrimary} />
            <Text style={styles.loadingText}>Carregando categorias...</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {categories.map((cat) => {
              const IconComp = ICON_MAP[cat.icon] || Store;
              return (
                <Pressable
                  key={cat.id}
                  testID={`category-card-${cat.id}`}
                  style={styles.categoryCard}
                  onPress={() => handleCategoryPress(cat.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconCircle}>
                      <IconComp size={24} color={colors.brandPrimary} />
                    </View>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>
                        {cat.store_count} {cat.store_count === 1 ? "loja" : "lojas"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catDescription} numberOfLines={2}>
                    {cat.description}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.viewStoresText}>Ver estabelecimentos</Text>
                    <ChevronRight size={14} color={colors.brandPrimary} />
                  </View>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  gridContainer: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  countBadge: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceTertiary,
  },
  catName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginBottom: 4,
  },
  catDescription: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  viewStoresText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
}));
