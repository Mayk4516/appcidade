import React from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
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
import { useTheme, makeStyles, INK, TACTILE_CARD } from "@/src/theme";
import { PressableScale } from "@/src/components/PressableScale";
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
    try {
      await Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
    } catch {
      console.warn("Could not open WhatsApp");
    }
  };

  const handleCardPress = () => {
    router.push(`/store/${store.id}` as any);
  };

  const isPremium = store.plan_tier === "premium";

  return (
    <PressableScale
      testID={`store-card-${store.id}`}
      style={[styles.card, isPremium && styles.premiumCard]}
      scaleTo={0.97}
      onPress={handleCardPress}
    >
      {/* Banner */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: store.banner_url || store.logo_url }}
          style={styles.bannerImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.imageScrim} />

        {isPremium && (
          <View style={styles.vipBadge} testID={`vip-badge-${store.id}`}>
            <Sparkles size={12} color="#FFFFFF" />
            <Text style={styles.vipBadgeText}>DESTAQUE VIP</Text>
          </View>
        )}

        {onToggleFavorite && (
          <Pressable
            testID={`favorite-btn-${store.id}`}
            style={styles.favoriteButton}
            hitSlop={6}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite(store.id);
            }}
          >
            <Heart
              size={19}
              color={isFavorite ? "#F43F5E" : "#FFFFFF"}
              fill={isFavorite ? "#F43F5E" : "transparent"}
            />
          </Pressable>
        )}

        <View style={styles.logoBadgeContainer}>
          <Image source={{ uri: store.logo_url }} style={styles.logoImage} contentFit="cover" />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.nameContainer}>
            <Text style={styles.storeName} numberOfLines={1}>
              {store.name}
            </Text>
            {store.is_verified && (
              <View testID={`verified-badge-${store.id}`}>
                <CheckCircle2 size={16} color={colors.brand} />
              </View>
            )}
          </View>

          <View style={styles.ratingBadge}>
            <Star size={13} color={colors.brand} fill={colors.brand} />
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

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={13} color={colors.muted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {store.address?.neighborhood || store.address?.city}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <View style={styles.openDot} />
            <Text style={styles.statusOpenText}>Aberto</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <PressableScale
            testID={`whatsapp-direct-btn-${store.id}`}
            style={styles.whatsappButton}
            haptic="medium"
            onPress={handleWhatsApp}
          >
            <MessageCircle size={17} color="#FFFFFF" />
            <Text style={styles.whatsappButtonText}>WhatsApp</Text>
          </PressableScale>

          <PressableScale
            testID={`view-store-btn-${store.id}`}
            style={styles.viewDetailsButton}
            onPress={handleCardPress}
          >
            <Text style={styles.viewDetailsText}>Ver Loja</Text>
          </PressableScale>
        </View>
      </View>
    </PressableScale>
  );
};

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 18,
    overflow: "hidden",
    ...TACTILE_CARD,
  },
  premiumCard: {
    borderColor: colors.brand,
    backgroundColor: "#FFFCF5",
  },
  imageContainer: {
    height: 150,
    width: "100%",
    position: "relative",
    backgroundColor: colors.surfaceTertiary,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28,25,23,0.16)",
  },
  vipBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  vipBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(28,25,23,0.5)",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  logoBadgeContainer: {
    position: "absolute",
    bottom: -20,
    left: 16,
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.surfaceSecondary,
    backgroundColor: colors.surfaceSecondary,
    overflow: "hidden",
    ...TACTILE_CARD,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  content: {
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
    flexShrink: 1,
    letterSpacing: -0.3,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onBrandTertiary,
  },
  reviewCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.brandPrimary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand,
    marginBottom: 6,
  },
  shortDescription: {
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusOpenText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.success,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  whatsappButton: {
    flex: 1.4,
    backgroundColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 14,
    gap: 7,
    borderBottomWidth: 4,
    borderBottomColor: "#15803D",
  },
  whatsappButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderStrong,
  },
  viewDetailsText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
  },
}));
