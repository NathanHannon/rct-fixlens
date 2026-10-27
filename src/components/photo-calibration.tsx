import { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Host, Column, Switch } from "@expo/ui";
import Svg, { Circle, Polygon, Text as SvgText } from "react-native-svg";
import type { Photo, SelectionPoint, CalibrationInput } from "@/api/types";
import { Action, Copy, Notice, Section } from "./fixlens-ui";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function PhotoCalibration({
  photo,
  onDone,
}: {
  photo: Photo;
  onDone: (calibration?: CalibrationInput) => void;
}) {
  const theme = useTheme();
  const [points, setPoints] = useState<SelectionPoint[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [samePlane, setSamePlane] = useState(false);
  const [error, setError] = useState("");
  const gesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e, ok) => {
      if (ok && size.width > 0) {
        const point = {
          x: Math.max(
            0,
            Math.min(photo.width, (e.x * photo.width) / size.width),
          ),
          y: Math.max(
            0,
            Math.min(photo.height, (e.y * photo.height) / size.height),
          ),
        };
        setPoints((current) =>
          current.length < 4 ? [...current, point] : current,
        );
      }
    });
  function useCard() {
    const cross = points.map((a, i) => {
      const b = points[(i + 1) % 4],
        c = points[(i + 2) % 4];
      return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    });
    if (!cross.every((c) => c > 1) && !cross.every((c) => c < -1)) {
      setError(
        "Those corners cross or overlap. Undo and tap around the card in order.",
      );
      return;
    }
    onDone({
      method: "reference_card",
      points,
      width_mm: 85.6,
      height_mm: 53.98,
    });
  }
  return (
    <Section>
      <Copy variant="headline">Add a size reference (optional)</Copy>
      <Copy muted>
        Use a standard bank-size plastic card, 85.60 × 53.98 mm, blank side up.
        Place it flat beside the damage on the same surface before taking the
        photo. If it is not already in this photo, retake it or skip this step.
      </Copy>
      <Copy>
        Tap its four corners in order: first one end of a long edge, then the
        other end, then continue around the card. The first two taps must follow
        the long edge.
      </Copy>
      <GestureDetector gesture={gesture}>
        <View
          testID="photo-calibration"
          accessibilityLabel="Tap four reference card corners"
          onLayout={(e) => setSize(e.nativeEvent.layout)}
          style={{ width: "100%", aspectRatio: photo.width / photo.height }}
        >
          <Image
            source={{ uri: photo.uri }}
            contentFit="fill"
            pointerEvents="none"
            style={{ width: "100%", height: "100%" }}
          />
          <Svg
            pointerEvents="none"
            viewBox={`0 0 ${photo.width} ${photo.height}`}
            style={{ position: "absolute", width: "100%", height: "100%" }}
          >
            {points.length > 1 ? (
              <Polygon
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="rgba(17,107,93,0.16)"
                stroke={theme.accent}
                strokeWidth={photo.width / 150}
              />
            ) : null}
            {points.map((p, i) => (
              <ViewlessPoint
                key={i}
                p={p}
                i={i}
                width={photo.width}
                color={theme.accent}
              />
            ))}
          </Svg>
        </View>
      </GestureDetector>
      <Copy variant="caption" muted>
        {points.length} / 4 corners selected
      </Copy>
      <Action
        label="Undo corner"
        secondary
        disabled={!points.length}
        onPress={() => {
          setPoints(points.slice(0, -1));
          setError("");
        }}
      />
      <Host matchContents ignoreSafeArea="all" seedColor={theme.accent}>
        <Column spacing={Spacing.two}>
          <Switch
            label="Standard card on the same flat surface"
            value={samePlane}
            onValueChange={setSamePlane}
          />
        </Column>
      </Host>
      {error ? <Notice warning>{error}</Notice> : null}
      <Copy muted>
        Approximate area only. This does not measure crack width or certify
        structural safety. Rounded corners and uncertain taps affect accuracy.
      </Copy>
      <Action
        label="Use reference card"
        disabled={points.length !== 4 || !samePlane}
        onPress={useCard}
      />
      <Action
        label="Continue without measurements"
        secondary
        onPress={() => onDone()}
      />
    </Section>
  );
}
function ViewlessPoint({
  p,
  i,
  width,
  color,
}: {
  p: SelectionPoint;
  i: number;
  width: number;
  color: string;
}) {
  return (
    <>
      <Circle cx={p.x} cy={p.y} r={width / 35} fill={color} />
      <SvgText
        x={p.x}
        y={p.y + width / 100}
        fill="white"
        fontSize={width / 30}
        textAnchor="middle"
      >
        {i + 1}
      </SvgText>
    </>
  );
}
