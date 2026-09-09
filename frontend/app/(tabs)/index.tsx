import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  FlatList,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Search,
  Sparkles,
  Utensils,
  Shirt,
  ShoppingCart,
  Wrench,
  PawPrint,
  Home as HomeIcon,
  Smartphone,
  CheckCircle2,
  X,
  MapPin,
  ChevronDown,
  User,
  Store as StoreIcon,
  Shield,
} from "lucide-react-native";
import { useTheme, makeStyles, TACTILE_CARD } from "@/src/theme";
import { PressableScale } from "@/src/components/PressableScale";
import { AnimatedItem } from "@/src/components/AnimatedItem";
import { StoreCard } from "@/src/components/StoreCard";
import { RoleSwitcherModal } from "@/src/components/RoleSwitcherModal";
import { useAuth } from "@/src/context/AuthContext";
import { api, resolveMediaUrl } from "@/src/api";

const ICON_MAP: Record<string, any> = {
  utensils: Utensils,
  shirt: Shirt,
  sparkles: Sparkles,
  "shopping-cart": ShoppingCart,
  wrench: Wrench,
  "paw-print": PawPrint,
  home: HomeIcon,
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

  const { data: categories = [] } = useQuery({
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
      setIsRoleModalVisible(true);
    }
  };

  const featuredStores = stores.filter((s) => s.is_featured || s.plan_tier === "premium");
  const isVip = (s: (typeof stores)[number]) =>
    s.plan_tier === "premium" || s.is_featured ? 1 : 0;
  // Premium / featured stores are pinned to the top of discovery.
  const sortedStores = [...stores].sort((a, b) => isVip(b) - isVip(a));
  const firstName = user?.name?.split(" ")[0] || "Visitante";

  const roleMeta = () => {
    if (user?.role === "super_admin") return { label: "Admin", Icon: Shield };
    if (user?.role === "store_owner") return { label: "Lojista", Icon: StoreIcon };
    if (user) return { label: "Consumidor", Icon: User };
    return { label: "Entrar", Icon: User };
  };
  const rm = roleMeta();

  return (
    <View style={styles.container}>
      {/* ===== Nubank-style bold dark hero block ===== */}
      <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreeting}>Olá, {firstName} 👋</Text>
            <Text style={styles.heroTagline}>O que você procura hoje na cidade?</Text>
          </View>
          <PressableScale
            testID="header-profile-role-btn"
            style={styles.rolePill}
            haptic="selection"
            onPress={() => setIsRoleModalVisible(true)}
          >
            <rm.Icon size={14} color={colors.brandTertiary} />
            <Text style={styles.rolePillText}>{rm.label}</Text>
            <ChevronDown size={13} color={colors.brandTertiary} />
          </PressableScale>
        </View>

        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.brandTertiary} />
          <Text style={styles.locationText}>São Paulo, SP</Text>
        </View>
      </View>

      {/* ===== Floating search bar overlapping the hero ===== */}
      <View style={styles.searchFloatWrap}>
        <View style={styles.searchBar}>
          <Search size={19} color={colors.muted} />
          <TextInput
            testID="search-stores-input"
            style={styles.searchInput}
            placeholder="Buscar lojas, pizzas, roupas..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              testID="clear-search-btn"
              onPress={() => setSearchQuery("")}
              hitSlop={8}
            >
              <X size={17} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <PressableScale
          testID="filter-verified-toggle"
          style={[styles.verifiedBtn, verifiedOnly && styles.verifiedBtnActive]}
          onPress={() => setVerifiedOnly(!verifiedOnly)}
        >
          <CheckCircle2 size={22} color={verifiedOnly ? "#FFFFFF" : colors.brandPrimary} />
        </PressableScale>
      </View>

      <FlatList
        data={sortedStores}
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
            {/* ===== Chunky category tiles (horizontal scroller) ===== */}
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Categorias</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tilesContent}
            >
              <PressableScale
                testID="category-chip-all"
                style={styles.catTile}
                onPress={() => setSelectedCategory("all")}
              >
                <View
                  style={[
                    styles.catTileIcon,
                    { backgroundColor: colors.brandPrimary },
                    selectedCategory === "all" && styles.catTileIconActiveRing,
                  ]}
                >
                  <Sparkles size={24} color="#FFFFFF" />
                </View>
                <Text
                  style={[
                    styles.catTileLabel,
                    selectedCategory === "all" && styles.catTileLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  Todas
                </Text>
              </PressableScale>

              {categories.map((cat) => {
                const IconComp = ICON_MAP[cat.icon] || Sparkles;
                const isSel = selectedCategory === cat.id;
                return (
                  <PressableScale
                    key={cat.id}
                    testID={`category-chip-${cat.id}`}
                    style={styles.catTile}
                    onPress={() => setSelectedCategory(isSel ? "all" : cat.id)}
                  >
                    <View
                      style={[
                        styles.catTileIcon,
                        isSel ? styles.catTileIconSelected : styles.catTileIconDefault,
                      ]}
                    >
                      <IconComp
                        size={22}
                        color={isSel ? colors.brandPrimary : colors.onSurfaceTertiary}
                      />
                    </View>
                    <Text
                      style={[styles.catTileLabel, isSel && styles.catTileLabelActive]}
                      numberOfLines={1}
                    >
                      {cat.name.split(" & ")[0]}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>

            {/* ===== VIP Featured carousel ===== */}
            {selectedCategory === "all" && featuredStores.length > 0 && !searchQuery && (
              <View style={styles.featuredSection}>
                <View style={styles.sectionHeadRow}>
                  <Text style={styles.sectionTitle}>Destaques VIP</Text>
                  <View style={styles.vipDot}>
                    <Sparkles size={13} color={colors.brandPrimary} />
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredContent}
                >
                  {featuredStores.map((item) => (
                    <PressableScale
                      key={`featured-${item.id}`}
                      testID={`featured-card-${item.id}`}
                      style={styles.featuredCard}
                      onPress={() => router.push(`/store/${item.id}` as any)}
                    >
                      <Image
                        source={{ uri: resolveMediaUrl(item.featured_banner_url || item.banner_url) }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={200}
                      />
                      <View style={styles.featuredScrim} />
                      <View style={styles.featuredPill}>
                        <Text style={styles.featuredPillText}>PATROCINADO</Text>
                      </View>
                      <View style={styles.featuredBottom}>
                        <Text style={styles.featuredName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.featuredSub} numberOfLines={1}>
                          {item.subcategory || item.category_name}
                        </Text>
                      </View>
                    </PressableScale>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ===== Results header ===== */}
            <View style={styles.resultsRow}>
              <Text style={styles.sectionTitle}>
                {selectedCategory === "all" && !searchQuery
                  ? "Lojas na cidade"
                  : "Resultados"}
              </Text>
              <Text style={styles.resultsCount}>
                {stores.length} {stores.length === 1 ? "loja" : "lojas"}
              </Text>
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <AnimatedItem index={index}>
            <StoreCard
              store={item}
              isFavorite={user?.saved_stores?.includes(item.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          </AnimatedItem>
        )}
        ListEmptyComponent={
          isLoadingStores ? (
            <View style={styles.skeletonWrap} testID="stores-loading">
              {[1, 2, 3].map((k) => (
                <View key={k} style={styles.skeletonCard}>
                  <View style={styles.skeletonBanner} />
                  <View style={styles.skeletonLineWide} />
                  <View style={styles.skeletonLine} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer} testID="stores-empty">
              <View style={styles.emptyIconCircle}>
                <Search size={30} color={colors.brandPrimary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma loja encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Tente outro termo ou toque em uma categoria diferente.
              </Text>
              <PressableScale
                testID="reset-filters-btn"
                style={styles.resetBtn}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setVerifiedOnly(false);
                }}
              >
                <Text style={styles.resetBtnText}>Limpar filtros</Text>
              </PressableScale>
            </View>
          )
        }
      />

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
    paddingHorizontal: 22,
    paddingBottom: 46,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroGreeting: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.onSurfaceInverse,
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 999,
  },
  rolePillText: {
    color: colors.brandTertiary,
    fontSize: 13,
    fontWeight: "800",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 16,
  },
  locationText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  searchFloatWrap: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 22,
    marginTop: -28,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 54,
    ...TACTILE_CARD,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.onSurface,
    height: "100%",
  },
  verifiedBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...TACTILE_CARD,
  },
  verifiedBtnActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 32,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  vipDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  tilesContent: {
    gap: 18,
    paddingRight: 8,
    paddingBottom: 6,
  },
  catTile: {
    width: 68,
    alignItems: "center",
    gap: 7,
  },
  catTileIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
    ...TACTILE_CARD,
  },
  catTileIconDefault: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
  },
  catTileIconSelected: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
  },
  catTileIconActiveRing: {
    borderColor: colors.onSurfaceInverse,
  },
  catTileLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceTertiary,
  },
  catTileLabelActive: {
    color: colors.onSurface,
    fontWeight: "800",
  },
  featuredSection: {
    marginTop: 34,
  },
  featuredContent: {
    gap: 14,
    paddingRight: 8,
    paddingBottom: 6,
  },
  featuredCard: {
    width: 260,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  featuredScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28,25,23,0.42)",
  },
  featuredPill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredPillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  featuredBottom: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
  },
  featuredName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  featuredSub: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    marginTop: 1,
  },
  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 34,
    marginBottom: 18,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  skeletonWrap: {
    gap: 18,
  },
  skeletonCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  skeletonBanner: {
    height: 130,
    borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
  },
  skeletonLineWide: {
    height: 16,
    width: "70%",
    borderRadius: 8,
    backgroundColor: colors.surfaceTertiary,
  },
  skeletonLine: {
    height: 12,
    width: "45%",
    borderRadius: 6,
    backgroundColor: colors.surfaceTertiary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  resetBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 24,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
}));
