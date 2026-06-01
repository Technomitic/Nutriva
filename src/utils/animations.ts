/**
 * Fresh — Shared Animation Utilities
 * Premium 3D-like animation hooks and components for React Native
 */

import { useEffect, useRef, useCallback } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

/**
 * Staggered fade-in + slide-up entrance for list items
 */
export function useStaggerEntrance(itemCount: number, delay = 80) {
  const anims = useRef(
    Array.from({ length: Math.min(itemCount, 20) }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: i * delay,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      })
    );
    Animated.stagger(delay, animations).start();
  }, []);

  return anims.map((anim) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [40, 0],
        }),
      },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  }));
}

/**
 * Single card entrance with 3D tilt perspective
 */
export function useCardEntrance3D(delay = 0) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      delay,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  }, []);

  return {
    opacity: progress,
    transform: [
      { perspective: 800 },
      {
        rotateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['12deg', '0deg'],
        }),
      },
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
      },
    ],
  };
}

/**
 * Hero section entrance — scale up + fade
 */
export function useHeroEntrance() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return {
    opacity: progress,
    transform: [
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
      },
    ],
  };
}

/**
 * Bounce press animation hook — returns [animatedStyle, onPressIn, onPressOut]
 */
export function useBouncePress(scaleDown = 0.95) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleDown,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = { transform: [{ scale }] };

  return { animatedStyle, onPressIn, onPressOut };
}

/**
 * Floating / breathing animation (for decorative elements)
 */
export function useFloating(duration = 3000, distance = 8) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return {
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -distance],
        }),
      },
    ],
  };
}

/**
 * Parallax scroll header — returns scrollY ref and animated header style
 */
export function useParallaxScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerStyle = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, 150],
          outputRange: [0, -30],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: scrollY.interpolate({
          inputRange: [-100, 0],
          outputRange: [1.3, 1],
          extrapolate: 'clamp',
        }),
      },
    ],
    opacity: scrollY.interpolate({
      inputRange: [0, 120],
      outputRange: [1, 0.7],
      extrapolate: 'clamp',
    }),
  };

  return { scrollY, headerStyle };
}

/**
 * Section entrance — slides in from right with fade
 */
export function useSectionEntrance(delay = 0) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 600,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return {
    opacity: progress,
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
    ],
  };
}

/**
 * Shimmer pulse for loading states
 */
export function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return {
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0.8],
    }),
  };
}

/**
 * 3D card tilt on scroll (for horizontal scroll lists)
 */
export function useScrollTilt3D() {
  const scrollX = useRef(new Animated.Value(0)).current;
  return { scrollX };
}
