import React from "react";
import {
  View,
  Text,
  ScrollView,
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
import { useTheme, makeStyles, TACTILE_CARD } from "@/src/theme";
import { PressableScale } from "@/src/components/PressableScale";
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
    <View style={styles.container}>
      <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <Text style={styles.heroLabel}>GUIA COMERCIAL</Text>
        <Text style={styles.title}>Categorias</Text>
        <Text style={styles.subtitle}>
          Encontre exatamente o que procura nas melhores lojas da cidade
        </Text>
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
                <PressableScale
                  key={cat.id}
                  testID={`category-card-${cat.id}`}
                  style={styles.categoryCard}
                  scaleTo={0.97}
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
                </PressableScale>
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
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: colors.surfaceInverse,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 19,
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
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    ...TACTILE_CARD,
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
