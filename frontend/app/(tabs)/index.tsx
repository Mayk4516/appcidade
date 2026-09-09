import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  Shirt,
  Sparkle,
  ShoppingCart,
  Wrench,
  PawPrint,
  Home,
  Smartphone,
  CheckCircle2,
  X,
} from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { Header } from "@/src/components/Header";
import { StoreCard } from "@/src/components/StoreCard";
import { RoleSwitcherModal } from "@/src/components/RoleSwitcherModal";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";
import { Store, Category } from "@/src/types";

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

export default function ConsumerExploreScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, updateUserFavorites } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);

  // Queries
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });

  const {
    data: stores = [],
    isLoading: isLoadingStores,
    isRefetching,
    refetch: refetchStores,
  } = useQuery({
    queryKey: ["stores", selectedCategory, searchQuery, verifiedOnly],
    queryFn: () =>
      api.getStores({
        category_id: selectedCategory === "all" ? undefined : selectedCategory,
        query: searchQuery || undefined,
        verified_only: verifiedOnly || undefined,
      }),
  });

  const handleToggleFavorite = async (storeId: string) => {
    try {
      const res = await api.toggleFavorite(storeId);
      updateUserFavorites(res.saved_stores);
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
    } catch {
      // Prompt user to login
      setIsRoleModalVisible(true);
    }
  };

  const featuredStores = stores.filter((s) => s.is_featured || s.plan_tier === "premium");

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header with City & Role Switcher */}
      <Header onOpenRoleSwitcher={() => setIsRoleModalVisible(true)} />

      {/* Sticky Top Bar: Search input & Verified toggle */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBarContainer}>
          <Search size={18} color={colors.muted} />
          <TextInput
            testID="search-stores-input"
            style={styles.searchInput}
            placeholder="Buscar lojas, pizzas, roupas, serviços..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              testID="clear-search-btn"
              onPress={() => setSearchQuery("")}
              style={styles.clearSearchBtn}
            >
              <X size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <Pressable
          testID="filter-verified-toggle"
          style={[styles.verifiedFilterBtn, verifiedOnly && styles.verifiedFilterBtnActive]}
          onPress={() => setVerifiedOnly(!verifiedOnly)}
        >
          <CheckCircle2
            size={16}
            color={verifiedOnly ? "#FFFFFF" : colors.brandPrimary}
          />
          <Text
            style={[
              styles.verifiedFilterText,
              verifiedOnly && styles.verifiedFilterTextActive,
            ]}
          >
            Verificadas
          </Text>
        </Pressable>
      </View>

      {/* [P0 MANDATORY] Category Chip Scroller: fixed 56pt row, 36pt chips, flexShrink: 0, no wrap */}
      <View style={styles.categoryChipRowContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsContent}
        >
          <Pressable
            testID="category-chip-all"
            style={[
              styles.categoryChip,
              selectedCategory === "all" && styles.categoryChipSelected,
            ]}
            onPress={() => setSelectedCategory("all")}
          >
            <Sparkles
              size={15}
              color={selectedCategory === "all" ? "#FFFFFF" : colors.onSurfaceSecondary}
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === "all" && styles.categoryChipTextSelected,
              ]}
            >
              Todas
            </Text>
          </Pressable>

          {categories.map((cat) => {
            const IconComp = ICON_MAP[cat.icon] || Sparkles;
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                testID={`category-chip-${cat.id}`}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <IconComp
                  size={15}
                  color={isSelected ? "#FFFFFF" : colors.onSurfaceSecondary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat.name.split(" & ")[0]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Store Listings */}
      {isLoadingStores ? (
        <View style={styles.loadingContainer} testID="stores-loading">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
          <Text style={styles.loadingText}>Buscando lojas da cidade...</Text>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetchStores}
              tintColor={colors.brandPrimary}
            />
          }
          ListHeaderComponent={
            <>
              {/* Featured SaaS VIP Section (if 'all' or has featured) */}
              {selectedCategory === "all" && featuredStores.length > 0 && !searchQuery && (
                <View style={styles.featuredSection}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.featuredBadge}>
                      <Sparkles size={14} color="#FFFFFF" />
                      <Text style={styles.featuredBadgeText}>DESTAQUES VIP DA CIDADE</Text>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredListContent}
                  >
                    {featuredStores.map((item) => (
                      <Pressable
                        key={`featured-${item.id}`}
                        testID={`featured-card-${item.id}`}
                        style={styles.featuredCard}
                        onPress={() => router.push(`/store/${item.id}` as any)}
                      >
                        <Image
                          source={{ uri: item.featured_banner_url || item.banner_url }}
                          style={styles.featuredImage}
                          contentFit="cover"
                        />
                        <View style={styles.featuredCardOverlay} />
                        <View style={styles.featuredCardContent}>
                          <View style={styles.featuredPill}>
                            <Text style={styles.featuredPillText}>Patrocinado VIP</Text>
                          </View>
                          <Text style={styles.featuredStoreName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.featuredSub} numberOfLines={1}>
                            {item.subcategory || item.category_name}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Title before the main list */}
              <View style={styles.resultsTitleRow}>
                <Text style={styles.resultsCountText}>
                  {stores.length} {stores.length === 1 ? "loja encontrada" : "lojas encontradas"}
                </Text>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <StoreCard
              store={item}
              isFavorite={user?.saved_stores?.includes(item.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer} testID="stores-empty">
              <View style={styles.emptyIconCircle}>
                <Search size={32} color={colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma loja encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Tente buscar por outro termo ou selecione uma categoria diferente.
              </Text>
              <Pressable
                testID="reset-filters-btn"
                style={styles.resetFiltersBtn}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setVerifiedOnly(false);
                }}
              >
                <Text style={styles.resetFiltersText}>Limpar Filtros</Text>
              </Pressable>
            </View>
          }
        />
      )}

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
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: colors.surface,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    height: "100%",
  },
  clearSearchBtn: {
    padding: 4,
  },
  verifiedFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    backgroundColor: colors.surface,
  },
  verifiedFilterBtnActive: {
    backgroundColor: colors.brandPrimary,
  },
  verifiedFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brandPrimary,
  },
  verifiedFilterTextActive: {
    color: "#FFFFFF",
  },
  // [P0] Category Chip Row: Fixed 56pt height, 36pt chip height, flexShrink: 0
  categoryChipRowContainer: {
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    justifyContent: "center",
  },
  categoryChipsContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  categoryChip: {
    height: 36,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    borderRadius: 18,
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  featuredSection: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  featuredListContent: {
    gap: 12,
  },
  featuredCard: {
    width: 240,
    height: 130,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surfaceTertiary,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  featuredCardContent: {
    position: "absolute",
    bottom: 10,
    left: 12,
    right: 12,
  },
  featuredPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  featuredPillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  featuredStoreName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  featuredSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  resultsTitleRow: {
    marginBottom: 10,
  },
  resultsCountText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  resetFiltersBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetFiltersText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
}));
