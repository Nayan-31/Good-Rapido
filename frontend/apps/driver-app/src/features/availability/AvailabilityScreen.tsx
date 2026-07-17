import { EmptyScreen } from "@/components";

export function AvailabilityScreen() {
  return (
    <EmptyScreen
      eyebrow="Driver home"
      title="Ready near Salt Lake"
      description="Shift dashboard shows earnings, service zone, safety status, and request readiness before accepting rides."
      badge="Step 03"
      badgeTone="trust"
      visualLabel="Current service zone"
      visualVariant="online"
      primaryAction="Go online"
      secondaryAction="Check zone"
      primaryVariant="mint"
      routePreview={{
        pickup: "Salt Lake Sector V",
        dropoff: "Open driver zone",
        eta: "Online",
        distance: "4.2 km",
        fare: "Ready"
      }}
      metrics={[
        { label: "Today", value: "₹1,240", hint: "6 completed rides", tone: "good" },
        { label: "Demand", value: "High", hint: "Peak window active", tone: "warning" },
        { label: "Trust", value: "9.4", hint: "Eligible for priority requests", tone: "navy" }
      ]}
      panels={[
        {
          title: "Shift status",
          items: [
            { label: "Availability", value: "Offline", tone: "neutral" },
            { label: "Location sharing", value: "Ready", tone: "success" },
            { label: "Safety shield", value: "Active", tone: "trust" }
          ]
        },
        {
          title: "Zone signals",
          items: [
            { label: "Demand", value: "High", tone: "warning" },
            { label: "Cancellation risk", value: "Low", tone: "success" },
            { label: "Next incentive", value: "2 rides", tone: "info" }
          ]
        }
      ]}
    />
  );
}
