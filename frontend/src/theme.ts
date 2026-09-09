// Design tokens for UrbanPulse CityHub (SaaS City Store Platform)
// Theme tokens filled directly from /app/design_guidelines.json

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces: clean off-white / graphite neutrals.
  surface: "#F6F7F9",
  onSurface: "#1A1D23",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1A1D23",
  surfaceTertiary: "#EEF0F4",
  onSurfaceTertiary: "#4A5160",
  surfaceInverse: "#171A21",
  onSurfaceInverse: "#FFFFFF",
  muted: "#868D9A",

  // Brand: discreet, premium indigo
  brand: "#4F46E5",
  onBrand: "#FFFFFF",
  brandPrimary: "#4F46E5",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#4338CA",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#EEF0FF",
  onBrandTertiary: "#4338CA",

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
  border: "#E7E9EE",
  borderStrong: "#D5D9E0",
  divider: "#ECEEF2",
};

// Dark ink literal (kept for a few fixed-in-both-schemes needs).
export const INK = "#1A1D23";

// Soft, elegant elevation for cards (light + web). Android uses elevation.
export const TACTILE_CARD = {
  shadowColor: "#0B1220",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 2,
} as const;

export const TACTILE_BLOCK = {
  shadowColor: "#0B1220",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 20,
  elevation: 4,
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
