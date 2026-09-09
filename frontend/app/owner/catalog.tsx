import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  ShoppingBag,
  Tag,
  X,
  Check,
} from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { ImagePickerField } from "@/src/components/ImagePickerField";
import { api, resolveMediaUrl } from "@/src/api";
import { Product, Store } from "@/src/types";

export default function OwnerCatalogScreen() {
  const { store_id } = useLocalSearchParams<{ store_id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodPromoPrice, setProdPromoPrice] = useState("");
  const [prodCategory, setProdCategory] = useState("Geral");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodAvailable, setProdAvailable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: stores = [] } = useQuery({
    queryKey: ["owner-stores"],
    queryFn: api.getOwnerStores,
  });

  const activeStore = stores.find((s) => s.id === store_id) || stores[0];
  const targetStoreId = activeStore?.id || store_id || "";

  const {
    data: products = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["store-products", targetStoreId],
    queryFn: () => api.getStoreProducts(targetStoreId),
    enabled: !!targetStoreId,
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setProdName("");
    setProdDesc("");
    setProdPrice("");
    setProdPromoPrice("");
    setProdCategory("Geral");
    setProdImageUrl("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop");
    setProdAvailable(true);
    setIsProductModalVisible(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDesc(p.description || "");
    setProdPrice(p.price.toString());
    setProdPromoPrice(p.promo_price ? p.promo_price.toString() : "");
    setProdCategory(p.category || "Geral");
    setProdImageUrl(p.image_url || "");
    setProdAvailable(p.is_available);
    setIsProductModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!prodName.trim() || !prodPrice.trim()) {
      alert("Nome e preço são obrigatórios.");
      return;
    }

    const priceNum = parseFloat(prodPrice.replace(",", "."));
    const promoNum = prodPromoPrice ? parseFloat(prodPromoPrice.replace(",", ".")) : null;

    if (isNaN(priceNum)) {
      alert("Preço inválido.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await api.updateProduct(targetStoreId, editingProduct.id, {
          name: prodName.trim(),
          description: prodDesc.trim(),
          price: priceNum,
          promo_price: promoNum,
          category: prodCategory.trim(),
          image_url: prodImageUrl.trim() || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop",
          is_available: prodAvailable,
        });
      } else {
        await api.createProduct(targetStoreId, {
          name: prodName.trim(),
          description: prodDesc.trim(),
          price: priceNum,
          promo_price: promoNum,
          category: prodCategory.trim(),
          image_url: prodImageUrl.trim() || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop",
          is_available: prodAvailable,
        });
      }
      setIsProductModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["store-products", targetStoreId] });
      queryClient.invalidateQueries({ queryKey: ["owner-metrics", targetStoreId] });
    } catch (err: any) {
      alert(err.message || "Erro ao salvar produto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    try {
      await api.deleteProduct(targetStoreId, prodId);
      queryClient.invalidateQueries({ queryKey: ["store-products", targetStoreId] });
      queryClient.invalidateQueries({ queryKey: ["owner-metrics", targetStoreId] });
    } catch (err: any) {
      alert(err.message || "Erro ao excluir produto");
    }
  };

  const planLimit = activeStore?.plan_tier === "premium" ? 100 : activeStore?.plan_tier === "pro" ? 25 : 5;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          testID="catalog-back-btn"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Catálogo & Cardápio</Text>
        <Pressable
          testID="add-new-product-btn"
          style={styles.addBtn}
          onPress={openAddModal}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Novo Item</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SaaS Plan Limit Card */}
        <View style={styles.planLimitCard}>
          <View style={styles.limitLeft}>
            <Text style={styles.limitTitle}>
              {products.length} de {planLimit} itens usados
            </Text>
            <Text style={styles.limitSubtitle}>
              Plano {activeStore?.plan_tier?.toUpperCase() || "GRÁTIS"}
            </Text>
          </View>
          {activeStore?.plan_tier !== "premium" && (
            <Pressable
              testID="catalog-upgrade-plan-btn"
              style={styles.upgradeLimitBtn}
              onPress={() =>
                router.push({
                  pathname: "/owner/plans",
                  params: { store_id: targetStoreId },
                } as any)
              }
            >
              <Sparkles size={12} color="#FFFFFF" />
              <Text style={styles.upgradeLimitText}>Aumentar Limite</Text>
            </Pressable>
          )}
        </View>

        {/* Products List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brandPrimary} />
            <Text style={styles.loadingText}>Carregando catálogo...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyCatalogBox} testID="catalog-manager-empty">
            <ShoppingBag size={40} color={colors.muted} />
            <Text style={styles.emptyCatalogTitle}>Seu catálogo está vazio</Text>
            <Text style={styles.emptyCatalogSub}>
              Adicione produtos, serviços ou pratos para os clientes verem no app e pedirem no WhatsApp.
            </Text>
            <Pressable
              testID="add-first-product-btn"
              style={styles.addFirstProductBtn}
              onPress={openAddModal}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addFirstProductText}>Adicionar Primeiro Item</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.productListGrid}>
            {products.map((item) => (
              <View
                key={item.id}
                style={styles.productRowCard}
                testID={`product-row-${item.id}`}
              >
                <Image
                  source={{ uri: resolveMediaUrl(item.image_url) }}
                  style={styles.productThumb}
                  contentFit="cover"
                />

                <View style={styles.productDetails}>
                  <View style={styles.productCategoryRow}>
                    <Text style={styles.productCatTag}>{item.category || "Geral"}</Text>
                    {!item.is_available && (
                      <Text style={styles.unavailableTag}>Pausado</Text>
                    )}
                  </View>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.productPriceText}>
                    R$ {item.price.toFixed(2)}
                    {item.promo_price ? ` (Promo: R$ ${item.promo_price.toFixed(2)})` : ""}
                  </Text>
                </View>

                {/* Actions: Edit & Delete */}
                <View style={styles.productActions}>
                  <Pressable
                    testID={`edit-product-btn-${item.id}`}
                    style={styles.actionBtnEdit}
                    onPress={() => openEditModal(item)}
                  >
                    <Edit3 size={16} color={colors.brandPrimary} />
                  </Pressable>
                  <Pressable
                    testID={`delete-product-btn-${item.id}`}
                    style={styles.actionBtnDelete}
                    onPress={() => handleDeleteProduct(item.id)}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Product Add / Edit Modal */}
      <Modal
        visible={isProductModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsProductModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet} testID="product-form-modal">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? "Editar Produto" : "Novo Produto / Serviço"}
              </Text>
              <Pressable onPress={() => setIsProductModalVisible(false)}>
                <X size={20} color={colors.onSurface} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome do Produto</Text>
                <TextInput
                  testID="product-name-input"
                  style={styles.modalInput}
                  placeholder="Ex: Pizza Calabresa Especial"
                  placeholderTextColor={colors.muted}
                  value={prodName}
                  onChangeText={setProdName}
                />
              </View>

              <View style={styles.priceRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Preço Padrão (R$)</Text>
                  <TextInput
                    testID="product-price-input"
                    style={styles.modalInput}
                    placeholder="79.90"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    value={prodPrice}
                    onChangeText={setProdPrice}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Preço Promoção (Opcional)</Text>
                  <TextInput
                    testID="product-promo-price-input"
                    style={styles.modalInput}
                    placeholder="69.90"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    value={prodPromoPrice}
                    onChangeText={setProdPromoPrice}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Categoria Interna</Text>
                <TextInput
                  testID="product-category-input"
                  style={styles.modalInput}
                  placeholder="Ex: Pizzas, Bebidas, Roupas..."
                  placeholderTextColor={colors.muted}
                  value={prodCategory}
                  onChangeText={setProdCategory}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descrição</Text>
                <TextInput
                  testID="product-desc-input"
                  style={[styles.modalInput, { height: 60 }]}
                  multiline
                  placeholder="Ingredientes, detalhes técnicos..."
                  placeholderTextColor={colors.muted}
                  value={prodDesc}
                  onChangeText={setProdDesc}
                />
              </View>

              <ImagePickerField
                label="Foto do Produto"
                value={prodImageUrl}
                onChange={setProdImageUrl}
                aspect="square"
                testID="product-image-picker"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Disponível para Pedidos</Text>
                <Switch
                  value={prodAvailable}
                  onValueChange={setProdAvailable}
                  trackColor={{ false: colors.border, true: colors.brandPrimary }}
                />
              </View>
            </ScrollView>

            <Pressable
              testID="save-product-btn"
              style={styles.modalSubmitBtn}
              onPress={handleSaveProduct}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  {editingProduct ? "Salvar Alterações" : "Adicionar ao Catálogo"}
                </Text>
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
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.surfaceInverse,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  planLimitCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  limitLeft: {},
  limitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  limitSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  upgradeLimitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  upgradeLimitText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  emptyCatalogBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyCatalogTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.onSurface,
  },
  emptyCatalogSub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12,
  },
  addFirstProductBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  addFirstProductText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  productListGrid: {
    gap: 10,
  },
  productRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.surfaceTertiary,
  },
  productDetails: {
    flex: 1,
  },
  productCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  productCatTag: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.brand,
    textTransform: "uppercase",
  },
  unavailableTag: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.error,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
  },
  productPriceText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brandPrimary,
    marginTop: 2,
  },
  productActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtnEdit: {
    padding: 6,
    backgroundColor: colors.brandTertiary,
    borderRadius: 6,
  },
  actionBtnDelete: {
    padding: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  inputGroup: {
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.onSurface,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
  },
  modalSubmitBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
}));
