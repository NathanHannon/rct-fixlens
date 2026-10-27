import { useEffect, useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Host, Picker } from "@expo/ui";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedProps,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { G, Path, Rect } from "react-native-svg";
import type { Photo, Selection, SelectionPoint } from "@/api/types";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  selectionFromStrokes,
  strokePath,
  type BrushStroke,
} from "@/lib/selection";
import { Action, Copy } from "@/components/fixlens-ui";
const AnimatedPath = Animated.createAnimatedComponent(Path);
const MAX_STROKES = 16;
export function PhotoSelection({
  photo,
  selection,
  onChange,
  strokes,
  onStrokesChange,
  disabled = false,
  maskUrl,
  onMaskReady,
  onMaskError,
}: {
  photo: Photo;
  selection: Selection | null;
  onChange: (selection: Selection | null) => void;
  strokes: BrushStroke[];
  onStrokesChange: (strokes: BrushStroke[]) => void;
  disabled?: boolean;
  maskUrl?: string | null;
  onMaskReady?: () => void;
  onMaskError?: () => void;
}) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [brush, setBrush] = useState("28");
  const activePath = useSharedValue("");
  const activePoints = useSharedValue<SelectionPoint[]>([]);
  const activeRadius = useSharedValue(1);
  useEffect(() => {
    activePath.set("");
  }, [strokes, activePath]);
  function update(next: BrushStroke[]) {
    onStrokesChange(next);
    onChange(selectionFromStrokes(next, photo.width, photo.height));
  }
  function commit(points: SelectionPoint[], radius: number) {
    if (!points.length || strokes.length >= MAX_STROKES) return;
    update([...strokes, { points, radius }]);
  }
  function point(x: number, y: number) {
    "worklet";
    return {
      x: Math.max(0, Math.min(photo.width - 1, (x * photo.width) / size.width)),
      y: Math.max(
        0,
        Math.min(photo.height - 1, (y * photo.height) / size.height),
      ),
    };
  }
  const gesture = Gesture.Pan()
    .enabled(!disabled && size.width > 0 && strokes.length < MAX_STROKES)
    .minDistance(0)
    .maxPointers(1)
    .onBegin((event) => {
      const p = point(event.x, event.y);
      activeRadius.set(((Number(brush) / 2) * photo.width) / size.width);
      activePoints.set([p]);
      activePath.set(`M${p.x},${p.y}L${p.x + 0.01},${p.y}`);
    })
    .onUpdate((event) => {
      const p = point(event.x, event.y),
        points = activePoints.get(),
        last = points[points.length - 1];
      if (
        points.length >= 1024 ||
        Math.hypot(p.x - last.x, p.y - last.y) < (photo.width / size.width) * 2
      )
        return;
      activePoints.set([...points, p]);
      activePath.set(activePath.get() + `L${p.x},${p.y}`);
    })
    .onEnd(() => {
      scheduleOnRN(commit, activePoints.get(), activeRadius.get());
    })
    .onFinalize((_event, success) => {
      if (!success) activePath.set("");
    });
  const animatedProps = useAnimatedProps(() => ({
    d: activePath.get(),
    strokeWidth: activeRadius.get() * 2,
  }));
  return (
    <View style={{ gap: Spacing.three, width: "100%" }}>
      <View style={{ width: "100%", alignItems: "center" }}>
        <GestureDetector gesture={gesture} touchAction="none">
          <View
            testID="photo-selection"
            accessibilityLabel="Paint over the affected area on the photo"
            onLayout={(e) =>
              setSize({
                width: e.nativeEvent.layout.width,
                height: e.nativeEvent.layout.height,
              })
            }
            style={{
              width: "100%",
              maxWidth: (520 * photo.width) / photo.height,
              aspectRatio: photo.width / photo.height,
              overflow: "hidden",
              borderRadius: Radius.medium,
              backgroundColor: theme.backgroundElement,
            }}
          >
            <Image
              pointerEvents="none"
              source={{ uri: photo.uri }}
              contentFit="contain"
              accessibilityLabel="Selected problem photo"
              style={{ position: "absolute", width: "100%", height: "100%" }}
            />
            {maskUrl ? (
              <Image
                pointerEvents="none"
                key={maskUrl}
                source={{ uri: maskUrl }}
                cachePolicy="none"
                contentFit="contain"
                accessibilityLabel="SAM affected-area highlight"
                onLoad={onMaskReady}
                onError={onMaskError}
                style={{ position: "absolute", width: "100%", height: "100%" }}
              />
            ) : (
              <Svg
                pointerEvents="none"
                width="100%"
                height="100%"
                viewBox={`0 0 ${photo.width} ${photo.height}`}
                style={{ position: "absolute" }}
              >
                <G
                  opacity={0.5}
                  stroke={theme.accent}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {strokes.map((stroke, i) => (
                    <Path
                      key={i}
                      testID={`brush-stroke-${i}`}
                      d={strokePath(stroke.points)}
                      strokeWidth={stroke.radius * 2}
                    />
                  ))}
                  <AnimatedPath animatedProps={animatedProps} />
                </G>
                {selection && !selection.points ? (
                  <Rect
                    x={selection.x1}
                    y={selection.y1}
                    width={selection.x2 - selection.x1 + 1}
                    height={selection.y2 - selection.y1 + 1}
                    fill={theme.accent}
                    opacity={0.3}
                  />
                ) : null}
              </Svg>
            )}
          </View>
        </GestureDetector>
      </View>
      {!disabled ? (
        <>
          <Copy variant="caption" muted>
            Brush size
          </Copy>
          <Host matchContents ignoreSafeArea="all" seedColor={theme.accent}>
            <Picker selectedValue={brush} onValueChange={setBrush}>
              <Picker.Item value="14" label="Fine" />
              <Picker.Item value="28" label="Medium" />
              <Picker.Item value="44" label="Wide" />
            </Picker>
          </Host>
          <View style={{ flexDirection: "row", gap: Spacing.two }}>
            <View style={{ flex: 1 }}>
              <Action
                label="Undo stroke"
                secondary
                disabled={!strokes.length}
                onPress={() => update(strokes.slice(0, -1))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Action
                label="Clear selection"
                secondary
                disabled={!selection}
                onPress={() => update([])}
              />
            </View>
          </View>
          <Copy variant="caption" muted>
            {strokes.length >= MAX_STROKES
              ? "Stroke limit reached. Undo or clear to paint again."
              : "Paint directly over the damage. Add strokes to cover its shape."}
          </Copy>
        </>
      ) : null}
    </View>
  );
}
