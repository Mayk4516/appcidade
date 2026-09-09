import React from "react";
import { Pressable, PressableProps, ViewStyle, StyleProp, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticKind = "light" | "medium" | "heavy" | "selection" | "none";

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: HapticKind;
}

/**
 * Duolingo-style tactile press: springs down on press-in, back on release.
 * No opacity fade. Optional haptic feedback on native devices.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  scaleTo = 0.95,
  haptic = "light",
  onPressIn,
  onPress,
  disabled,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fireHaptic = () => {
    if (haptic === "none" || Platform.OS === "web") return;
    try {
      if (haptic === "selection") Haptics.selectionAsync();
      else if (haptic === "medium")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (haptic === "heavy")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // no-op
    }
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withSpring(disabled ? 1 : scaleTo, {
          damping: 15,
          stiffness: 400,
        });
        onPressIn?.(e);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={(e) => {
        if (!disabled) fireHaptic();
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
};
