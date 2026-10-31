import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import {
  Link,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { Host, Picker, TextInput, useNativeState } from "@expo/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorMessage } from "@/api/client";
import { categories, urgencyLabels, type Problem } from "@/api/types";
import {
  Copy,
  Action,
  Notice,
  Panel,
  Section,
  StatusBadge,
} from "@/components/fixlens-ui";
import { DeleteJob } from "./delete-job";
import { JobThumbnail } from "./job-thumbnail";
import { Spacing, MaxContentWidth } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function ProblemsHome() {
  const theme = useTheme(),
    insets = useSafeAreaInsets();
  const { deleted } = useLocalSearchParams<{ deleted?: string }>();
  const [problems, setProblems] = useState<Problem[]>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [message, setMessage] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const search = useNativeState("");
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
  const attention =
    problems?.filter(
      (p) =>
        p.current_urgency === "pro_now" || p.current_urgency === "fix_soon",
    ).length ?? 0;
  const visible =
    problems?.filter(
      (p) =>
        (p.title + " " + (p.location_note ?? "") + " " + categories[p.category])
          .toLowerCase()
          .includes(query.trim().toLowerCase()) &&
        (filter === "all" ||
          (filter === "attention" &&
            (p.current_urgency === "pro_now" ||
              p.current_urgency === "fix_soon")) ||
          (filter === "monitor" && p.current_urgency === "monitor")),
    ) ?? [];
  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{
        padding: Spacing.four,
        gap: Spacing.three,
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
        <View style={{ gap: Spacing.three }}>
          <Copy
            variant="caption"
            style={{ color: theme.accent, fontWeight: "600" }}
          >
            A CLEARER PICTURE OF YOUR HOME
          </Copy>
          <Copy variant="title">
            {problems?.length === 0 && !error
              ? "Start with one photo."
              : "Your home, in focus."}
          </Copy>
          <Copy muted>
            Spot a problem, find your next step, and keep track of what changes.
          </Copy>
          <Action
            label="Check a problem"
            testID="check-problem"
            onPress={() => router.push("/capture")}
          />
          {problems?.length ? (
            <View
              style={{
                flexDirection: "row",
                gap: Spacing.four,
                flexWrap: "wrap",
                paddingVertical: Spacing.two,
              }}
            >
              <View>
                <Copy variant="title">{problems.length}</Copy>
                <Copy variant="caption" muted>
                  saved jobs
                </Copy>
              </View>
              <View>
                <Copy
                  variant="title"
                  style={{ color: attention ? theme.warning : theme.accent }}
                >
                  {attention}
                </Copy>
                <Copy variant="caption" muted>
                  need attention
                </Copy>
              </View>
            </View>
          ) : null}
          <Copy variant="caption" muted>
            Shared demo home · Everyone uses the same saved problems.
          </Copy>
          {message || deleted ? (
            <Notice>
              {message || "Job removed. Background cloud cleanup is finishing."}
            </Notice>
          ) : null}
          {problems?.length ? (
            <>
              <Copy variant="headline">Saved jobs</Copy>
              <Host matchContents ignoreSafeArea="all" seedColor={theme.accent}>
                <TextInput
                  value={search}
                  onChangeText={setQuery}
                  placeholder="Search jobs"
                  placeholderTextColor={theme.textSecondary}
                  autoCorrect={false}
                  textStyle={{ color: theme.text }}
                  style={{
                    padding: Spacing.three,
                    width: "100%",
                    backgroundColor: theme.surface,
                  }}
                />
              </Host>
              <Host matchContents ignoreSafeArea="all" seedColor={theme.accent}>
                <Picker
                  selectedValue={filter}
                  onValueChange={setFilter}
                  testID="job-filter"
                >
                  <Picker.Item value="all" label="All jobs" />
                  <Picker.Item value="attention" label="Needs attention" />
                  <Picker.Item value="monitor" label="Monitoring" />
                </Picker>
              </Host>
            </>
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
        loading && !problems ? (
          <Copy muted>Loading your home…</Copy>
        ) : problems && !error ? (
          <Panel>
            <Copy variant="headline">
              {problems.length
                ? "No matching jobs"
                : "A place for every home check."}
            </Copy>
            <Copy muted>
              {problems.length
                ? "Try another search or filter."
                : "Your photos, assessments, and follow-up checks will be saved here."}
            </Copy>
          </Panel>
        ) : undefined
      }
      renderItem={({ item }) => (
        <Panel>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: Spacing.two,
            }}
          >
            <Link
              href={{ pathname: "/problem/[id]", params: { id: item.id } }}
              asChild
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"Open " + item.title}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: pressed ? 0.65 : 1,
                  gap: Spacing.three,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    gap: Spacing.three,
                    alignItems: "center",
                  }}
                >
                  <JobThumbnail uri={item.latest_capture?.photo_url} />
                  <View style={{ flex: 1, gap: Spacing.one }}>
                    <Copy variant="caption" muted>
                      {categories[item.category]}
                    </Copy>
                    <Copy variant="headline" numberOfLines={2}>
                      {item.title}
                    </Copy>
                    <Copy variant="caption" muted>
                      {item.location_note ||
                        new Date(item.created_at).toLocaleDateString()}
                    </Copy>
                  </View>
                </View>
                <StatusBadge
                  label={
                    item.current_urgency
                      ? urgencyLabels[item.current_urgency]
                      : "Ready for assessment"
                  }
                  warning={
                    item.current_urgency === "pro_now" ||
                    item.current_urgency === "fix_soon"
                  }
                />
              </Pressable>
            </Link>
            <DeleteJob
              id={item.id}
              title={item.title}
              compact
              onDeleted={(result) => {
                setProblems((current) =>
                  current?.filter((p) => p.id !== item.id),
                );
                setMessage(
                  result.status === "deleting"
                    ? "Job removal queued. Cloud cleanup will retry automatically."
                    : "Job removed. Late uploads will be cleaned automatically.",
                );
              }}
            />
          </View>
        </Panel>
      )}
    />
  );
}
