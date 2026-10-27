import { Button, Collapsible, Host, RNHostView } from "@expo/ui";
import { useState, type PropsWithChildren } from "react";
import { Text, View, type TextProps } from "react-native";
import { Spacing, Typography, Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function Copy({
  variant = "body",
  muted = false,
  style,
  ...props
}: TextProps & { variant?: keyof typeof Typography; muted?: boolean }) {
  const theme = useTheme();
  return (
    <Text
      selectable
      {...props}
      style={[
        Typography[variant],
        { color: muted ? theme.textSecondary : theme.text },
        style,
      ]}
    />
  );
}
export function Section({ children }: PropsWithChildren) {
  return <View style={{ gap: Spacing.three }}>{children}</View>;
}
export function Disclosure({
  label,
  children,
}: PropsWithChildren<{ label: string }>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Host matchContents ignoreSafeArea="all" seedColor={theme.accent}>
      <Collapsible
        isOpen={open}
        onOpenChange={setOpen}
        label={label}
        labelStyle={{ ...Typography.body, color: theme.text }}
      >
        <RNHostView matchContents={{ vertical: true }}>
          <View style={{ width: "100%", gap: Spacing.three }}>{children}</View>
        </RNHostView>
      </Collapsible>
    </Host>
  );
}
export function Notice({
  children,
  warning = false,
}: PropsWithChildren<{ warning?: boolean }>) {
  const theme = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        padding: Spacing.three,
        borderRadius: Radius.small,
        borderCurve: "continuous",
        backgroundColor: warning ? theme.warningSurface : theme.accentSurface,
      }}
    >
      <Copy
        variant="caption"
        style={{ color: warning ? theme.warning : theme.accent }}
      >
        {children}
      </Copy>
    </View>
  );
}
export function Action({
  label,
  onPress,
  disabled = false,
  secondary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Host matchContents ignoreSafeArea="all" seedColor={theme.accent}>
      <Button
        label={label}
        onPress={onPress}
        disabled={disabled}
        variant={secondary ? "outlined" : "filled"}
        style={{ width: "100%", paddingVertical: Spacing.two }}
        testID={testID}
      />
    </Host>
  );
}
