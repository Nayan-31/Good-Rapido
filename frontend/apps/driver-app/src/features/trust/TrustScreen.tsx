import { EmptyScreen } from "@/components";

export function TrustScreen() {
  return (
    <EmptyScreen
      eyebrow="Trust score"
      title="Driver trust profile"
      description="Trust view highlights fair routes, low cancellation, rider ratings, and safety consistency."
      badge="Step 07"
      badgeTone="trust"
      visualLabel="Reliability profile"
      visualVariant="trust"
      primaryAction="Review tips"
      secondaryAction="Open history"
      metrics={[
        { label: "Trust", value: "9.4", hint: "Elite driver band", tone: "good" },
        { label: "Route", value: "98%", hint: "Fairness score", tone: "good" },
        { label: "Cancel", value: "1.4%", hint: "Low risk", tone: "good" }
      ]}
      panels={[
        {
          title: "Score sources",
          items: [
            { label: "On-time pickup", value: "94%", tone: "success" },
            { label: "Route detour", value: "0.8%", tone: "success" },
            { label: "Safety reports", value: "0", tone: "success" }
          ]
        },
        {
          title: "Priority access",
          items: [
            { label: "Airport rides", value: "Eligible", tone: "trust" },
            { label: "Premium rides", value: "Eligible", tone: "trust" },
            { label: "Weekly bonus", value: "Active", tone: "info" }
          ]
        }
      ]}
    />
  );
}
