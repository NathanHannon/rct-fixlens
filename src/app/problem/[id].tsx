import { useCallback, useState } from "react";
import { ScrollView, RefreshControl } from "react-native";
import {
  Stack,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorMessage } from "@/api/client";
import {
  hazards,
  urgencyLabels,
  type Delta,
  type Hazard,
  type ProblemDetail,
} from "@/api/types";
import { DeviceCopies } from "@/components/device-copies";
import {
  Action,
  Copy,
  Disclosure,
  Notice,
  Section,
  Panel,
  StatusBadge,
} from "@/components/fixlens-ui";
import { DeleteJob } from "@/components/delete-job";
import { JobStorage } from "@/components/job-storage";
import { CapturePhoto } from "@/components/capture-photo";
import { FindRepairHelp } from "@/components/find-repair-help";
import { Spacing, MaxContentWidth } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { calibrationLabel } from "@/lib/reference-size";

export default function ProblemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [problem, setProblem] = useState<ProblemDetail>();
  const [deltas, setDeltas] = useState<Delta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const [detail, changes] = await Promise.all([
          api.problem(id, signal),
          api.deltas(id, signal),
        ]);
        if (!signal?.aborted) {
          setProblem(detail);
          setDeltas(changes);
          setError("");
        }
      } catch (e) {
        if (!signal?.aborted) setError(errorMessage(e));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id],
  );
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => controller.abort();
    }, [load]),
  );
  const report = problem?.latest_report;
  const delta = deltas.find((d) => d.to_capture_id === report?.capture_id);
  const photoOnly = Boolean(
    report?.confidence_note?.startsWith(
      "Photo-based assessment; measurements unavailable:",
    ),
  );
  const mock =
    report &&
    (report.spark_version.startsWith("mock") ||
      report.sam_version.startsWith("mock"));
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
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
          refreshing={loading && problem !== undefined}
          onRefresh={() => void load()}
        />
      }
    >
      <Stack.Screen options={{ title: problem?.title ?? "Your assessment" }} />
      {error ? (
        <Section>
          <Notice warning>{error}</Notice>
          <Action label="Try again" secondary onPress={() => void load()} />
        </Section>
      ) : null}
      {!problem && loading ? <Copy muted>Loading your assessment…</Copy> : null}
      {problem ? (
        <>
          <Copy variant="caption" muted>
            {problem.location_note || "Location not added"} · Saved{" "}
            {new Date(problem.created_at).toLocaleDateString()}
          </Copy>
          {mock ? (
            <Notice>
              Demo assessment · Findings, confidence, and measurements are
              simulated. This photo has not been analyzed by a model.
            </Notice>
          ) : null}
          {report ? (
            <>
              {photoOnly ? (
                <Notice warning>
                  Photo-based assessment. A reliable damage outline was
                  unavailable, so size and growth measurements were not recorded
                  for this photo.
                </Notice>
              ) : null}
              {report.safety_override ? (
                <Notice warning>
                  Professional help now · A safety concern was flagged. DIY
                  instructions are unavailable.
                </Notice>
              ) : null}
              <Panel>
                <StatusBadge
                  label={urgencyLabels[report.urgency]}
                  warning={
                    report.urgency === "pro_now" ||
                    report.urgency === "fix_soon"
                  }
                />
                <Copy variant="title">{report.verdict}</Copy>
                {report.likely_cause ? (
                  <Copy muted>{report.likely_cause}</Copy>
                ) : null}
                <Copy variant="caption" muted>
                  {mock ? "Demo confidence" : "Confidence"}:{" "}
                  {Math.round(Number(report.confidence) * 100)}%
                </Copy>
                {report.confidence_note ? (
                  <Disclosure label="Assessment details">
                    <Copy variant="caption" muted>
                      {report.confidence_note}
                    </Copy>
                  </Disclosure>
                ) : null}
                <CapturePhoto
                  key={report.capture_id}
                  problemId={id}
                  captureId={report.capture_id}
                />
              </Panel>
              {report.pro && (report.safety_override || !report.diy) ? (
                <Section>
                  <Copy variant="headline">Call a professional</Copy>
                  <Copy>{report.pro.trade}</Copy>
                  <Copy muted>{report.pro.what_to_tell_them}</Copy>
                </Section>
              ) : null}
              {report.diy && !report.safety_override ? (
                <Section>
                  <Copy variant="headline">Your next steps</Copy>
                  <Copy variant="caption" muted>
                    {report.diy.difficulty} · {report.diy.time_estimate}
                  </Copy>
                  {report.diy.steps.map((step, i) => (
                    <Copy key={`${i}-${step}`}>
                      {i + 1}. {step}
                    </Copy>
                  ))}
                  {report.diy.parts.length ? (
                    <Copy muted>
                      What you need: {report.diy.parts.join(", ")}
                    </Copy>
                  ) : null}
                  {report.pro ? (
                    <Copy muted>
                      Prefer help? {report.pro.trade} —{" "}
                      {report.pro.what_to_tell_them}
                    </Copy>
                  ) : null}
                </Section>
              ) : null}
              {report.red_flags.length ? (
                <Section>
                  <Copy variant="headline">Warning signs</Copy>
                  {report.red_flags.map((flag, i) => (
                    <Copy key={`${i}-${flag}`} style={{ color: theme.warning }}>
                      {hazards[flag as Hazard] ?? flag}
                    </Copy>
                  ))}
                </Section>
              ) : null}
              <FindRepairHelp key={report.id} report={report} />
            </>
          ) : (
            <Section>
              <Copy variant="headline">Your problem is saved.</Copy>
              <Copy muted>
                No assessment is available yet. Add a photo to get started.
              </Copy>
            </Section>
          )}
          <Section>
            <Copy variant="headline">How is it changing?</Copy>
            <Copy muted>
              {problem.latest_measurement?.calibrated_area_mm2 != null
                ? `Approximately ${(problem.latest_measurement.calibrated_area_mm2 / 100).toPrecision(2)} cm² of highlighted surface. Calibrated using ${calibrationLabel(problem.latest_measurement.calibration?.method ?? "")}. Accuracy depends on the highlight, calibration, and a flat surface. Crack width has not been measured.`
                : "No physical size estimate is available for this capture."}
            </Copy>
            {delta ? (
              <>
                <Copy>
                  {delta.growth === "unknown"
                    ? "Unable to compare yet"
                    : delta.growth.charAt(0).toUpperCase() +
                      delta.growth.slice(1)}
                </Copy>
                <Copy muted>
                  {delta.growth === "unknown"
                    ? "Comparable calibrated measurements are unavailable. Changes in framing can look like growth; no physical comparison is available."
                    : `${Number(delta.days_between).toFixed(1)} days between captures${delta.area_change_pct === null ? "" : ` · approximately ${delta.area_change_pct.toFixed(1)}% highlighted area change`}. Differences in segmentation, coverage, or calibration can affect this estimate.`}
                </Copy>
              </>
            ) : (
              <Copy muted>
                {photoOnly
                  ? "This photo has no reliable measurement to compare. Take another clear photo of the same spot to try again."
                  : report
                    ? "This is your starting point. Take another photo of the same spot to build a comparison."
                    : "Your first assessment will establish a starting point."}
              </Copy>
            )}
            {report?.recheck_days ? (
              <Copy variant="caption" muted>
                Suggested recheck:{" "}
                {new Date(
                  new Date(report.created_at).getTime() +
                    report.recheck_days * 86400000,
                ).toLocaleDateString()}
                . No reminder is scheduled.
              </Copy>
            ) : null}
          </Section>
          <Action
            label={report ? "Check again" : "Add a photo"}
            onPress={() =>
              router.push({ pathname: "/capture", params: { problemId: id } })
            }
          />
          <Action
            label="Back to my home"
            secondary
            onPress={() => router.dismissTo("/")}
          />
          {report ? (
            <Disclosure label="Save a device copy">
              <DeviceCopies
                key={report.capture_id}
                problemId={id}
                captureId={report.capture_id}
                mock={Boolean(mock) || photoOnly}
              />
            </Disclosure>
          ) : null}
          <Panel>
            <Copy variant="headline">Manage job</Copy>
            <JobStorage id={id} />
            <DeleteJob
              id={id}
              title={problem.title}
              onDeleted={() =>
                router.dismissTo({ pathname: "/", params: { deleted: "1" } })
              }
            />
          </Panel>
        </>
      ) : null}
    </ScrollView>
  );
}
