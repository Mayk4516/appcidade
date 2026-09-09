import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface AnimatedItemProps {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  delayStep?: number;
}

/**
 * Soft staggered entrance used across lists/screens for a premium feel.
 * Fades + slides up with a spring, delayed by list index.
 */
export const AnimatedItem: React.FC<AnimatedItemProps> = ({
  children,
  index = 0,
  style,
  delayStep = 65,
}) => {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.delay(Math.min(index, 12) * delayStep)
        .springify()
        .damping(16)
        .mass(0.6)}
    >
      {children}
    </Animated.View>
  );
};
