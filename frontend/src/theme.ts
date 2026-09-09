// Design tokens for UrbanPulse CityHub (SaaS City Store Platform)
// Theme tokens filled directly from /app/design_guidelines.json

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces: backgrounds, from the screen down to small fills.
  surface: "#F9F8F6",
  onSurface: "#1C1917",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1C1917",
  surfaceTertiary: "#F5F5F5",
  onSurfaceTertiary: "#374151",
  surfaceInverse: "#1C1917",
  onSurfaceInverse: "#FFFFFF",
  muted: "#78716C",

  // Brand: Warm Ochre & Amber palette
  brand: "#D97706",
  onBrand: "#FFFFFF",
  brandPrimary: "#B45309",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#D97706",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FEF3C7",
  onBrandTertiary: "#B45309",

  // Semantic Status
  success: "#16A34A",
  onSuccess: "#FFFFFF",
  warning: "#D97706",
  onWarning: "#FFFFFF",
  error: "#DC2626",
  onError: "#FFFFFF",
  info: "#2563EB",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E7E5E4",
  borderStrong: "#D6D3D1",
  divider: "#E7E5E4",
};

// Duolingo-style tactile "sticker" depth. Dark ink shadow stays identical in
// both schemes, so these literals are intentional.
export const INK = "#1C1917";

// Solid offset shadow for chunky cards / buttons (iOS + web). Android falls
// back to elevation. Pair with a thicker bottom border for the 3D block feel.
export const TACTILE_CARD = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 3,
} as const;

export const TACTILE_BLOCK = {
  shadowColor: INK,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
} as const;

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
