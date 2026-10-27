import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorMessage } from "@/api/client";
import { categories, urgencyLabels, type Problem } from "@/api/types";
import { Copy, Action, Notice, Section } from "@/components/fixlens-ui";
import { Spacing, MaxContentWidth } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function ProblemsHome() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [problems, setProblems] = useState<Problem[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const result = await api.problems(signal);
      if (!signal?.aborted) {
        setProblems(result);
        setError("");
      }
    } catch (e) {
      if (!signal?.aborted) setError(errorMessage(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => controller.abort();
    }, [load]),
  );
  return (
    <FlatList
      data={problems ?? []}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{
        padding: Spacing.four,
        gap: Spacing.four,
        paddingBottom: insets.bottom + Spacing.four,
        maxWidth: MaxContentWidth,
        width: "100%",
        alignSelf: "center",
      }}
      refreshControl={
        <RefreshControl
          refreshing={loading && problems !== undefined}
          onRefresh={() => void load()}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: Spacing.four }}>
          <Copy variant="title">
            {problems?.length === 0 && !error
              ? "Start with one photo."
              : "My home"}
          </Copy>
          <Copy muted>
            Photograph what looks wrong. Keep the assessment and check how it
            changes over time.
          </Copy>
          <Action
            label="Check a problem"
            onPress={() => router.push("/capture")}
            testID="check-problem"
          />
          <Copy variant="caption" muted>
            Shared demo home · Everyone uses the same saved problems.
          </Copy>
          {problems?.length ? (
            <Copy variant="headline">Saved problems</Copy>
          ) : null}
          {error ? (
            <Section>
              <Notice warning>{error}</Notice>
              <Action label="Try again" secondary onPress={() => void load()} />
            </Section>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <Copy muted>Loading your home…</Copy>
        ) : problems && !error ? (
          <Section>
            <Copy muted>
              Your saved problems and follow-up assessments will live here. Try
              a wall crack, water stain, or worn caulking.
            </Copy>
          </Section>
        ) : undefined
      }
      renderItem={({ item }) => (
        <Link
          href={{ pathname: "/problem/[id]", params: { id: item.id } }}
          asChild
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.title}`}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              paddingVertical: Spacing.three,
              borderBottomWidth: 1,
              borderColor: theme.backgroundSelected,
              gap: Spacing.two,
            })}
          >
            <Copy variant="caption" muted>
              {categories[item.category]} ·{" "}
              {new Date(item.created_at).toLocaleDateString()}
            </Copy>
            <Copy variant="headline">{item.title}</Copy>
            {item.location_note ? (
              <Copy muted>{item.location_note}</Copy>
            ) : null}
            <Copy
              variant="caption"
              style={{
                color:
                  item.current_urgency === "pro_now"
                    ? theme.warning
                    : theme.accent,
              }}
            >
              {item.current_urgency
                ? urgencyLabels[item.current_urgency]
                : "Ready for an assessment"}
            </Copy>
          </Pressable>
        </Link>
      )}
    />
  );
}
