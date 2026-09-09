import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Star,
  CheckCircle2,
  MessageCircle,
  MapPin,
  Clock,
  Heart,
  Sparkles,
} from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { Store } from "@/src/types";
import { api } from "@/src/api";

interface StoreCardProps {
  store: Store;
  isFavorite?: boolean;
  onToggleFavorite?: (storeId: string) => void;
  showCategory?: boolean;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  isFavorite = false,
  onToggleFavorite,
  showCategory = true,
}) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();

  const handleWhatsApp = async (e: any) => {
    e?.stopPropagation?.();
    const phone = store.contact?.whatsapp?.replace(/\D/g, "");
    if (!phone) return;

    api.trackStoreClick(store.id, "whatsapp");
    const msg = encodeURIComponent(`Olá, encontrei a ${store.name} no aplicativo da cidade!`);
    const url = `https://wa.me/${phone}?text=${msg}`;
    try {
      await Linking.openURL(url);
    } catch {
      console.warn("Could not open WhatsApp");
    }
  };

  const handleCardPress = () => {
    router.push(`/store/${store.id}` as any);
  };

  const isPremium = store.plan_tier === "premium";

  return (
    <Pressable
      testID={`store-card-${store.id}`}
      style={[styles.card, isPremium && styles.premiumCard]}
      onPress={handleCardPress}
    >
      {/* Banner / Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: store.banner_url || store.logo_url }}
          style={styles.bannerImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.imageOverlay} />

        {/* Plan / VIP Badge */}
        {isPremium && (
          <View style={styles.vipBadge} testID={`vip-badge-${store.id}`}>
            <Sparkles size={12} color="#FFFFFF" />
            <Text style={styles.vipBadgeText}>DESTAQUE VIP</Text>
          </View>
        )}

        {/* Favorite Button */}
        {onToggleFavorite && (
          <Pressable
            testID={`favorite-btn-${store.id}`}
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite(store.id);
            }}
          >
            <Heart
              size={18}
              color={isFavorite ? "#EF4444" : "#FFFFFF"}
              fill={isFavorite ? "#EF4444" : "transparent"}
            />
          </Pressable>
        )}

        {/* Store Logo floating */}
        <View style={styles.logoBadgeContainer}>
          <Image
            source={{ uri: store.logo_url }}
            style={styles.logoImage}
            contentFit="cover"
          />
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.nameContainer}>
            <Text style={styles.storeName} numberOfLines={1}>
              {store.name}
            </Text>
            {store.is_verified && (
              <View style={styles.verifiedIcon} testID={`verified-badge-${store.id}`}>
                <CheckCircle2 size={16} color={colors.brand} />
              </View>
            )}
          </View>

          <View style={styles.ratingBadge}>
            <Star size={13} color="#D97706" fill="#D97706" />
            <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCountText}>({store.review_count})</Text>
          </View>
        </View>

        {showCategory && (
          <Text style={styles.categoryText} numberOfLines={1}>
            {store.subcategory || store.category_name}
          </Text>
        )}

        <Text style={styles.shortDescription} numberOfLines={2}>
          {store.short_description || store.description}
        </Text>

        {/* Location & Status info */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={13} color={colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {store.address?.neighborhood || store.address?.city}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Clock size={13} color={colors.success} />
            <Text style={styles.statusOpenText}>Aberto</Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <Pressable
            testID={`whatsapp-direct-btn-${store.id}`}
            style={styles.whatsappButton}
            onPress={handleWhatsApp}
          >
            <MessageCircle size={16} color="#FFFFFF" />
            <Text style={styles.whatsappButtonText}>WhatsApp Direto</Text>
          </Pressable>

          <Pressable
            testID={`view-store-btn-${store.id}`}
            style={styles.viewDetailsButton}
            onPress={handleCardPress}
          >
            <Text style={styles.viewDetailsText}>Ver Loja</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  premiumCard: {
    borderColor: colors.brand,
    borderWidth: 1.5,
    backgroundColor: "#FFFCF5",
  },
  imageContainer: {
    height: 140,
    width: "100%",
    position: "relative",
    backgroundColor: colors.surfaceTertiary,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  vipBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  vipBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  logoBadgeContainer: {
    position: "absolute",
    bottom: -18,
    left: 14,
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surfaceSecondary,
    backgroundColor: colors.surfaceSecondary,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  content: {
    paddingTop: 24,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    flexShrink: 1,
  },
  verifiedIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceTertiary,
  },
  reviewCountText: {
    fontSize: 11,
    color: colors.muted,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.brand,
    marginBottom: 4,
  },
  shortDescription: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
  },
  statusOpenText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  whatsappButton: {
    flex: 1.3,
    backgroundColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 10,
    gap: 6,
  },
  whatsappButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 10,
  },
  viewDetailsText: {
    color: colors.onSurfaceTertiary,
    fontSize: 13,
    fontWeight: "600",
  },
}));
