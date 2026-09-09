import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
  TextInput,
  Modal,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Heart,
  Share2,
  CheckCircle2,
  Star,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  Instagram,
  Globe,
  Sparkles,
  ShoppingBag,
  Plus,
  X,
} from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";
import { Store, Product, Review } from "@/src/types";

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, updateUserFavorites } = useAuth();

  const [activeTab, setActiveTab] = useState<"catalog" | "info" | "reviews">("catalog");
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Queries
  const {
    data: store,
    isLoading: isLoadingStore,
    error: storeError,
  } = useQuery({
    queryKey: ["store", id],
    queryFn: () => api.getStoreDetail(id as string),
    enabled: !!id,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["store-products", id],
    queryFn: () => api.getStoreProducts(id as string),
    enabled: !!id,
  });

  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ["store-reviews", id],
    queryFn: () => api.getStoreReviews(id as string),
    enabled: !!id,
  });

  const isFavorite = user?.saved_stores?.includes(id as string);

  const handleToggleFavorite = async () => {
    if (!id) return;
    try {
      const res = await api.toggleFavorite(id);
      updateUserFavorites(res.saved_stores);
      queryClient.invalidateQueries({ queryKey: ["store", id] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
    } catch {
      router.push("/auth/login" as any);
    }
  };

  const handleWhatsApp = async (productName?: string) => {
    if (!store?.contact?.whatsapp) return;
    const phone = store.contact.whatsapp.replace(/\D/g, "");
    api.trackStoreClick(store.id, "whatsapp");

    let text = `Olá! Vi a loja ${store.name} no aplicativo da cidade e gostaria de atendimento.`;
    if (productName) {
      text = `Olá! Gostaria de mais informações e pedir o item *${productName}* que vi no aplicativo da cidade.`;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    try {
      await Linking.openURL(url);
    } catch {
      console.warn("Could not open WhatsApp URL");
    }
  };

  const handlePhoneCall = async () => {
    if (!store?.contact?.phone) return;
    const phone = store.contact.phone.replace(/\D/g, "");
    api.trackStoreClick(store.id, "phone");
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      console.warn("Could not trigger phone call");
    }
  };

  const handleDirections = async () => {
    if (!store) return;
    api.trackStoreClick(store.id, "directions");
    const address = encodeURIComponent(
      store.address.formatted || `${store.address.street}, ${store.address.number} - ${store.address.neighborhood}, ${store.address.city}`
    );
    const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
    try {
      await Linking.openURL(url);
    } catch {
      console.warn("Could not open maps");
    }
  };

  const handleSubmitReview = async () => {
    if (!id || !newComment.trim()) return;
    setReviewError("");
    setIsSubmittingReview(true);
    try {
      await api.addReview(id, { rating: newRating, comment: newComment.trim() });
      setNewComment("");
      setNewRating(5);
      setIsReviewModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["store", id] });
      queryClient.invalidateQueries({ queryKey: ["store-reviews", id] });
    } catch (err: any) {
      setReviewError(err?.message || "Erro ao publicar avaliação. Faça login novamente.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const openReviewModal = () => {
    if (!user) {
      router.push("/auth/login" as any);
      return;
    }
    setReviewError("");
    setNewComment("");
    setNewRating(5);
    setIsReviewModalVisible(true);
  };

  if (isLoadingStore) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={styles.loadingScreenText}>Carregando perfil da loja...</Text>
      </View>
    );
  }

  if (storeError || !store) {
    return (
      <View style={[styles.errorScreen, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Loja não encontrada</Text>
        <Pressable
          style={styles.backButtonDefault}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar para o início</Text>
        </Pressable>
      </View>
    );
  }

  const isPremium = store.plan_tier === "premium";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Full-bleed Hero Banner */}
        <View style={styles.heroBannerContainer}>
          <Image
            source={{ uri: store.banner_url || store.logo_url }}
            style={styles.heroBanner}
            contentFit="cover"
          />
          <View style={styles.heroGradient} />

          {/* Top Floating Nav Buttons */}
          <View style={[styles.topNavRow, { top: insets.top + 8 }]}>
            <Pressable
              testID="store-back-btn"
              style={styles.circleNavBtn}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </Pressable>

            <View style={styles.topRightNav}>
              <Pressable
                testID="store-favorite-toggle-btn"
                style={styles.circleNavBtn}
                onPress={handleToggleFavorite}
              >
                <Heart
                  size={20}
                  color={isFavorite ? "#EF4444" : "#FFFFFF"}
                  fill={isFavorite ? "#EF4444" : "transparent"}
                />
              </Pressable>
              <Pressable
                testID="store-share-btn"
                style={styles.circleNavBtn}
                onPress={() => api.trackStoreClick(store.id, "share")}
              >
                <Share2 size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Floating Store Logo Avatar */}
          <View style={styles.logoBadge}>
            <Image
              source={{ uri: store.logo_url }}
              style={styles.logoImage}
              contentFit="cover"
            />
          </View>
        </View>

        {/* Store Title & Badges Section */}
        <View style={styles.storeHeaderSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.storeName}>{store.name}</Text>
              {store.is_verified && (
                <View style={styles.verifiedPill} testID="store-verified-pill">
                  <CheckCircle2 size={14} color="#FFFFFF" />
                  <Text style={styles.verifiedPillText}>Verificada</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.categorySub}>{store.subcategory || store.category_name}</Text>

          {/* Ratings & Metrics Bar */}
          <View style={styles.metaRatingRow}>
            <View style={styles.ratingBox}>
              <Star size={16} color="#D97706" fill="#D97706" />
              <Text style={styles.ratingNumber}>{store.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({store.review_count} avaliações)</Text>
            </View>

            <View style={styles.statusBox}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Aberto Agora</Text>
            </View>

            {isPremium && (
              <View style={styles.vipTag}>
                <Sparkles size={12} color="#FFFFFF" />
                <Text style={styles.vipTagText}>VIP DESTAQUE</Text>
              </View>
            )}
          </View>

          <Text style={styles.description}>{store.description}</Text>

          {/* Quick Action Channels Bar */}
          <View style={styles.channelBar}>
            <Pressable
              testID="channel-whatsapp-btn"
              style={[styles.channelBtn, styles.channelBtnWhatsApp]}
              onPress={() => handleWhatsApp()}
            >
              <MessageCircle size={18} color="#FFFFFF" />
              <Text style={styles.channelBtnWhatsAppText}>Chamar no WhatsApp</Text>
            </Pressable>

            {store.contact?.phone ? (
              <Pressable
                testID="channel-phone-btn"
                style={styles.channelBtnSecondary}
                onPress={handlePhoneCall}
              >
                <Phone size={18} color={colors.onSurfaceSecondary} />
                <Text style={styles.channelBtnSecondaryText}>Ligar</Text>
              </Pressable>
            ) : null}

            <Pressable
              testID="channel-directions-btn"
              style={styles.channelBtnSecondary}
              onPress={handleDirections}
            >
              <MapPin size={18} color={colors.onSurfaceSecondary} />
              <Text style={styles.channelBtnSecondaryText}>Rotas</Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Selector: Catálogo | Informações | Avaliações */}
        <View style={styles.tabSelectorRow}>
          <Pressable
            testID="store-tab-catalog"
            style={[styles.tabButton, activeTab === "catalog" && styles.tabButtonActive]}
            onPress={() => setActiveTab("catalog")}
          >
            <ShoppingBag
              size={16}
              color={activeTab === "catalog" ? colors.brandPrimary : colors.muted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "catalog" && styles.tabButtonTextActive,
              ]}
            >
              Catálogo ({products.length})
            </Text>
          </Pressable>

          <Pressable
            testID="store-tab-info"
            style={[styles.tabButton, activeTab === "info" && styles.tabButtonActive]}
            onPress={() => setActiveTab("info")}
          >
            <Clock
              size={16}
              color={activeTab === "info" ? colors.brandPrimary : colors.muted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "info" && styles.tabButtonTextActive,
              ]}
            >
              Horários & Local
            </Text>
          </Pressable>

          <Pressable
            testID="store-tab-reviews"
            style={[styles.tabButton, activeTab === "reviews" && styles.tabButtonActive]}
            onPress={() => setActiveTab("reviews")}
          >
            <Star
              size={16}
              color={activeTab === "reviews" ? colors.brandPrimary : colors.muted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "reviews" && styles.tabButtonTextActive,
              ]}
            >
              Avaliações ({reviews.length})
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: Products / Catalog Grid */}
        {activeTab === "catalog" && (
          <View style={styles.tabContentContainer}>
            {isLoadingProducts ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : products.length === 0 ? (
              <View style={styles.emptyTabBox} testID="catalog-empty">
                <ShoppingBag size={32} color={colors.muted} />
                <Text style={styles.emptyTabText}>Nenhum produto cadastrado no catálogo.</Text>
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {products.map((item) => (
                  <View
                    key={item.id}
                    style={styles.productCard}
                    testID={`product-card-${item.id}`}
                  >
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.productImage}
                      contentFit="cover"
                    />
                    <View style={styles.productInfo}>
                      <Text style={styles.productCategory}>{item.category || "Item"}</Text>
                      <Text style={styles.productName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text style={styles.productDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}

                      <View style={styles.productPriceRow}>
                        {item.promo_price ? (
                          <View>
                            <Text style={styles.productOldPrice}>
                              R$ {item.price.toFixed(2)}
                            </Text>
                            <Text style={styles.productPromoPrice}>
                              R$ {item.promo_price.toFixed(2)}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.productPrice}>
                            R$ {item.price.toFixed(2)}
                          </Text>
                        )}

                        <Pressable
                          testID={`order-product-whatsapp-btn-${item.id}`}
                          style={styles.orderWhatsAppBtn}
                          onPress={() => handleWhatsApp(item.name)}
                        >
                          <MessageCircle size={14} color="#FFFFFF" />
                          <Text style={styles.orderWhatsAppText}>Pedir</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: Info & Hours */}
        {activeTab === "info" && (
          <View style={styles.tabContentContainer}>
            {/* Address box */}
            <View style={styles.infoSectionCard}>
              <Text style={styles.infoSectionTitle}>Localização & Endereço</Text>
              <View style={styles.infoDetailRow}>
                <MapPin size={18} color={colors.brandPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoDetailMain}>
                    {store.address.formatted || `${store.address.street}, ${store.address.number}`}
                  </Text>
                  <Text style={styles.infoDetailSub}>
                    {store.address.neighborhood} - {store.address.city}, {store.address.state}
                  </Text>
                </View>
              </View>
              <Pressable
                testID="maps-open-btn"
                style={styles.openMapsActionBtn}
                onPress={handleDirections}
              >
                <Text style={styles.openMapsActionText}>Abrir no Google Maps / Waze</Text>
              </Pressable>
            </View>

            {/* Operating Hours */}
            <View style={styles.infoSectionCard}>
              <Text style={styles.infoSectionTitle}>Horário de Funcionamento</Text>
              {Object.entries(store.hours || {}).map(([day, val]) => {
                const dayLabels: Record<string, string> = {
                  monday: "Segunda-feira",
                  tuesday: "Terça-feira",
                  wednesday: "Quarta-feira",
                  thursday: "Quinta-feira",
                  friday: "Sexta-feira",
                  saturday: "Sábado",
                  sunday: "Domingo",
                };
                return (
                  <View key={day} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{dayLabels[day] || day}</Text>
                    <Text
                      style={[
                        styles.hoursTime,
                        val.is_closed && styles.hoursTimeClosed,
                      ]}
                    >
                      {val.is_closed ? "Fechado" : `${val.open} às ${val.close}`}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Social & Contact */}
            <View style={styles.infoSectionCard}>
              <Text style={styles.infoSectionTitle}>Contatos & Redes</Text>
              {store.contact?.whatsapp ? (
                <View style={styles.contactItemRow}>
                  <MessageCircle size={16} color="#25D366" />
                  <Text style={styles.contactItemText}>{store.contact.whatsapp}</Text>
                </View>
              ) : null}
              {store.contact?.phone ? (
                <View style={styles.contactItemRow}>
                  <Phone size={16} color={colors.brandPrimary} />
                  <Text style={styles.contactItemText}>{store.contact.phone}</Text>
                </View>
              ) : null}
              {store.contact?.instagram ? (
                <View style={styles.contactItemRow}>
                  <Instagram size={16} color="#E1306C" />
                  <Text style={styles.contactItemText}>{store.contact.instagram}</Text>
                </View>
              ) : null}
              {store.contact?.website ? (
                <View style={styles.contactItemRow}>
                  <Globe size={16} color={colors.brandPrimary} />
                  <Text style={styles.contactItemText}>{store.contact.website}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* TAB 3: Reviews */}
        {activeTab === "reviews" && (
          <View style={styles.tabContentContainer}>
            <View style={styles.reviewHeaderRow}>
              <View>
                <Text style={styles.reviewOverallScore}>{store.rating.toFixed(1)} de 5.0</Text>
                <Text style={styles.reviewOverallSub}>
                  Baseado em {reviews.length} avaliações
                </Text>
              </View>

              <Pressable
                testID="open-add-review-modal-btn"
                style={styles.addReviewBtn}
                onPress={openReviewModal}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addReviewBtnText}>Avaliar Loja</Text>
              </Pressable>
            </View>

            {isLoadingReviews ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : reviews.length === 0 ? (
              <View style={styles.emptyTabBox} testID="reviews-empty">
                <Star size={32} color={colors.muted} />
                <Text style={styles.emptyTabText}>
                  Seja o primeiro a avaliar este estabelecimento!
                </Text>
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {reviews.map((rev) => (
                  <View key={rev.id} style={styles.reviewCard} testID={`review-item-${rev.id}`}>
                    <View style={styles.reviewCardHeader}>
                      <Text style={styles.reviewAuthor}>{rev.user_name}</Text>
                      <View style={styles.reviewStarsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            color="#D97706"
                            fill={s <= rev.rating ? "#D97706" : "transparent"}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{rev.comment}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom 1-Click WhatsApp CTA Bar */}
      <View style={[styles.stickyBottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          testID="sticky-whatsapp-cta-btn"
          style={styles.stickyWhatsAppBtn}
          onPress={() => handleWhatsApp()}
        >
          <MessageCircle size={20} color="#FFFFFF" />
          <Text style={styles.stickyWhatsAppText}>Conversar no WhatsApp</Text>
        </Pressable>
      </View>

      {/* Write Review Modal */}
      <Modal
        visible={isReviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="add-review-modal">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Avaliar {store.name}</Text>
              <Pressable
                testID="close-review-modal-btn"
                onPress={() => setIsReviewModalVisible(false)}
              >
                <X size={20} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* Star Picker */}
            <Text style={styles.modalSubtitle}>Sua nota para o atendimento e produtos:</Text>
            <View style={styles.starPickerRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable
                  key={s}
                  testID={`rating-star-btn-${s}`}
                  onPress={() => setNewRating(s)}
                  style={styles.starTouch}
                >
                  <Star
                    size={32}
                    color="#D97706"
                    fill={s <= newRating ? "#D97706" : "transparent"}
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              testID="review-comment-input"
              style={styles.reviewTextInput}
              placeholder="Escreva como foi sua experiência com a loja..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              value={newComment}
              onChangeText={setNewComment}
            />

            {reviewError ? (
              <View style={styles.reviewErrorBox} testID="review-error-box">
                <Text style={styles.reviewErrorText}>{reviewError}</Text>
              </View>
            ) : null}

            <Pressable
              testID="submit-review-btn"
              style={styles.modalSubmitBtn}
              onPress={handleSubmitReview}
              disabled={isSubmittingReview || !newComment.trim()}
            >
              {isSubmittingReview ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Publicar Avaliação</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  heroBannerContainer: {
    height: 230,
    position: "relative",
    backgroundColor: colors.surfaceTertiary,
  },
  heroBanner: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  topNavRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topRightNav: {
    flexDirection: "row",
    gap: 10,
  },
  circleNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoBadge: {
    position: "absolute",
    bottom: -28,
    left: 20,
    width: 68,
    height: 68,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceSecondary,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  storeHeaderSection: {
    paddingTop: 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  storeName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onSurface,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  categorySub: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.brand,
    marginTop: 2,
    marginBottom: 8,
  },
  metaRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.muted,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
  },
  vipTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vipTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  description: {
    fontSize: 13,
    color: colors.onSurfaceSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  channelBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  channelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    gap: 8,
  },
  channelBtnWhatsApp: {
    flex: 1.6,
    backgroundColor: "#25D366",
  },
  channelBtnWhatsAppText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  channelBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  channelBtnSecondaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  tabSelectorRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: colors.brandPrimary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  tabButtonTextActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },
  tabContentContainer: {
    padding: 16,
  },
  productsGrid: {
    gap: 12,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
    padding: 10,
    gap: 12,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
  },
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  productCategory: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    textTransform: "uppercase",
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  productDesc: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.brandPrimary,
  },
  productOldPrice: {
    fontSize: 10,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  productPromoPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.success,
  },
  orderWhatsAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  orderWhatsAppText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  infoSectionCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginBottom: 10,
  },
  infoDetailRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  infoDetailMain: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  infoDetailSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  openMapsActionBtn: {
    backgroundColor: colors.surfaceTertiary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  openMapsActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.onSurfaceTertiary,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  hoursDay: {
    fontSize: 12,
    color: colors.onSurfaceSecondary,
  },
  hoursTime: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.success,
  },
  hoursTimeClosed: {
    color: colors.error,
  },
  contactItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  contactItemText: {
    fontSize: 13,
    color: colors.onSurfaceSecondary,
  },
  reviewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewOverallScore: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.onSurface,
  },
  reviewOverallSub: {
    fontSize: 12,
    color: colors.muted,
  },
  addReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addReviewBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  reviewsList: {
    gap: 10,
  },
  reviewCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  reviewStarsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: 12,
    color: colors.onSurfaceTertiary,
    lineHeight: 17,
  },
  emptyTabBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyTabText: {
    fontSize: 13,
    color: colors.muted,
  },
  stickyBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  stickyWhatsAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  stickyWhatsAppText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  starPickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  starTouch: {
    padding: 4,
  },
  reviewTextInput: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.onSurface,
    textAlignVertical: "top",
    height: 100,
    marginBottom: 16,
  },
  reviewErrorBox: {
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  reviewErrorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    gap: 12,
  },
  loadingScreenText: {
    fontSize: 14,
    color: colors.muted,
  },
  errorScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    gap: 16,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
  },
  backButtonDefault: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
}));
