import { Platform, ViewStyle } from 'react-native';

/**
 * Cross-platform shadow utility
 * Converts React Native shadow props to boxShadow for web
 * and keeps native shadow props for iOS/Android
 */
export const createShadow = (
  elevation: number = 2,
  color: string = '#000',
  opacity: number = 0.1
): ViewStyle => {
  if (Platform.OS === 'web') {
    // Calculate offset and blur based on elevation
    const offset = Math.ceil(elevation / 2);
    const blur = elevation * 2;
    
    return {
      boxShadow: `0px ${offset}px ${blur}px rgba(0, 0, 0, ${opacity})`,
    } as ViewStyle;
  }

  // Native platforms (iOS/Android)
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
    shadowOpacity: opacity,
    shadowRadius: elevation,
    elevation: elevation, // Android elevation
  };
};

// Common shadow presets
export const shadows = {
  small: createShadow(1, '#000', 0.1),
  medium: createShadow(2, '#000', 0.1),
  large: createShadow(4, '#000', 0.15),
  xl: createShadow(8, '#000', 0.2),
};
