import React, { useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

interface Props {
  uri: string;
  authHeader: string;
  onTap: (xRatio: number) => void;
}

function clampTranslation(
  value: number,
  currentScale: number,
  dimension: number,
) {
  'worklet';
  const maxOffset = (dimension * (currentScale - 1)) / 2;
  return Math.max(-maxOffset, Math.min(maxOffset, value));
}

export function ZoomablePage({ uri, authHeader, onTap }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const pinchGesture = Gesture.Pinch()
    .onUpdate(event => {
      const next = savedScale.value * event.scale;
      scale.value = Math.max(1, Math.min(MAX_SCALE, next));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      translateX.value = clampTranslation(translateX.value, scale.value, SCREEN_W);
      translateY.value = clampTranslation(translateY.value, scale.value, SCREEN_H);
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(setIsZoomed)(scale.value > 1.05);
    });

  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .onUpdate(event => {
      translateX.value = clampTranslation(
        savedTranslateX.value + event.translationX,
        scale.value,
        SCREEN_W,
      );
      translateY.value = clampTranslation(
        savedTranslateY.value + event.translationY,
        scale.value,
        SCREEN_H,
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const targetScale = scale.value > 1 ? 1 : DOUBLE_TAP_SCALE;
      scale.value = withTiming(targetScale);
      savedScale.value = targetScale;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      runOnJS(setIsZoomed)(targetScale > 1);
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(event => {
      runOnJS(onTap)(event.x / SCREEN_W);
    });

  const tapGesture = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={styles.container}>
        <Animated.Image
          source={{ uri, headers: { Authorization: authHeader } }}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  image: { width: SCREEN_W, height: SCREEN_H },
});
