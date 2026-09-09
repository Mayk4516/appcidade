import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, X, Images } from "lucide-react-native";
import { useTheme, makeStyles, TACTILE_CARD } from "@/src/theme";
import { PressableScale } from "@/src/components/PressableScale";
import { api, resolveMediaUrl } from "@/src/api";

interface ImagePickerFieldProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  aspect?: "square" | "banner";
  testID?: string;
}

export const ImagePickerField: React.FC<ImagePickerFieldProps> = ({
  label,
  value,
  onChange,
  aspect = "square",
  testID,
}) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const [uploading, setUploading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState("");

  const ratio: [number, number] = aspect === "banner" ? [16, 9] : [1, 1];

  const doUpload = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setUploading(true);
    setError("");
    try {
      const name = asset.fileName || `photo_${Date.now()}.jpg`;
      const mime = asset.mimeType || "image/jpeg";
      const url = await api.uploadImage(asset.uri, name, mime);
      onChange(url);
    } catch (e: any) {
      setError(e?.message?.slice(0, 80) || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const pickFromGallery = async () => {
    setSheetOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        setError("Permissão negada. Abra os ajustes para liberar a galeria.");
        Linking.openSettings();
      } else {
        setError("Permissão da galeria necessária para enviar fotos.");
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: ratio,
      quality: 0.7,
    });
    await doUpload(result);
  };

  const pickFromCamera = async () => {
    setSheetOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        setError("Permissão negada. Abra os ajustes para liberar a câmera.");
        Linking.openSettings();
      } else {
        setError("Permissão da câmera necessária para tirar fotos.");
      }
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: ratio,
      quality: 0.7,
    });
    await doUpload(result);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale
        testID={testID}
        style={[styles.preview, aspect === "banner" ? styles.previewBanner : styles.previewSquare]}
        haptic="selection"
        onPress={() => (Platform.OS === "web" ? pickFromGallery() : setSheetOpen(true))}
      >
        {value ? (
          <Image source={{ uri: resolveMediaUrl(value) }} style={styles.previewImg} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <ImagePlus size={26} color={colors.brandPrimary} />
            <Text style={styles.placeholderText}>Toque para enviar foto</Text>
          </View>
        )}
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.uploadingText}>Enviando...</Text>
          </View>
        )}
        {value && !uploading && (
          <View style={styles.editBadge}>
            <Camera size={13} color="#FFFFFF" />
            <Text style={styles.editBadgeText}>Trocar</Text>
          </View>
        )}
      </PressableScale>
      {error ? (
        <Text style={styles.errorText} testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}

      <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSheetOpen(false)}>
          <View style={styles.sheet} testID="image-source-sheet">
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Enviar foto</Text>
              <Pressable onPress={() => setSheetOpen(false)} hitSlop={8}>
                <X size={20} color={colors.onSurface} />
              </Pressable>
            </View>
            <PressableScale style={styles.sheetOption} testID="pick-camera-btn" onPress={pickFromCamera}>
              <View style={styles.sheetIcon}>
                <Camera size={20} color={colors.brandPrimary} />
              </View>
              <Text style={styles.sheetOptionText}>Tirar foto agora</Text>
            </PressableScale>
            <PressableScale style={styles.sheetOption} testID="pick-gallery-btn" onPress={pickFromGallery}>
              <View style={styles.sheetIcon}>
                <Images size={20} color={colors.brandPrimary} />
              </View>
              <Text style={styles.sheetOptionText}>Escolher da galeria</Text>
            </PressableScale>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: 8,
  },
  preview: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: "hidden",
    ...TACTILE_CARD,
  },
  previewSquare: {
    width: 110,
    height: 110,
  },
  previewBanner: {
    width: "100%",
    height: 130,
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  uploadingOverlay: {
    ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const),
    backgroundColor: "rgba(28,25,23,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadingText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  editBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(28,25,23,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
}));
