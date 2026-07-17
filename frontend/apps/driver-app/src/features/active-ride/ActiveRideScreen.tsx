import { EmptyScreen } from "@/components";

export function ActiveRideScreen() {
  return (
    <EmptyScreen
      eyebrow="Active ride"
      title="Navigate to pickup"
      description="The active ride flow keeps arrival, start, route fairness, and completion actions in one place."
      badge="Step 05"
      badgeTone="navy"
      visualLabel="Live ride route"
      visualVariant="ride"
      primaryAction="Mark arrived"
      secondaryAction="Contact rider"
      routePreview={{
        pickup: "Eco Space, New Town",
        dropoff: "Howrah Station Gate 1",
        eta: "4 min",
        distance: "2.1 km",
        fare: "Locked"
      }}
      metrics={[
        { label: "Stage", value: "Pickup", hint: "Arrive before 08:42 AM", tone: "navy" },
        { label: "Route", value: "98%", hint: "Fair route confidence", tone: "good" },
        { label: "Fare", value: "Locked", hint: "No rider-side change", tone: "good" }
      ]}
      panels={[
        {
          title: "Ride controls",
          items: [
            { label: "Arrived", value: "Next", tone: "info" },
            { label: "Start ride", value: "Locked", tone: "neutral" },
            { label: "Complete ride", value: "Locked", tone: "neutral" }
          ]
        },
        {
          title: "Safety",
          items: [
            { label: "Trip monitor", value: "Active", tone: "trust" },
            { label: "Route deviation", value: "None", tone: "success" },
            { label: "SOS", value: "Ready", tone: "danger" }
          ]
        }
      ]}
    />
  );
}
