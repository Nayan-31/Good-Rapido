import { EmptyScreen } from "@/components";

export function RideRequestsScreen() {
  return (
    <EmptyScreen
      eyebrow="Ride requests"
      title="Incoming ride request"
      description="Accept only after reviewing pickup distance, fare confidence, route fairness, and rider trust signals."
      badge="Step 04"
      badgeTone="warning"
      visualLabel="Pickup route preview"
      visualVariant="request"
      primaryAction="Accept ride"
      secondaryAction="Decline"
      primaryVariant="mint"
      routePreview={{
        pickup: "Eco Space, New Town",
        dropoff: "Howrah Station Gate 1",
        eta: "5 min",
        distance: "14.8 km",
        fare: "₹312"
      }}
      metrics={[
        { label: "Pickup", value: "5 min", hint: "2.1 km away", tone: "good" },
        { label: "Fare", value: "₹312", hint: "Transparent estimate", tone: "navy" },
        { label: "Rider", value: "4.8", hint: "Low cancellation history", tone: "good" }
      ]}
      panels={[
        {
          title: "Fare preview",
          items: [
            { label: "Base and distance", value: "₹248", tone: "neutral" },
            { label: "Peak bonus", value: "+₹42", tone: "success" },
            { label: "Platform fee", value: "-₹18", tone: "neutral" }
          ]
        },
        {
          title: "Trust signals",
          items: [
            { label: "Rider verification", value: "Strong", tone: "trust" },
            { label: "Route fairness", value: "98%", tone: "success" },
            { label: "Cancellation risk", value: "Low", tone: "success" }
          ]
        }
      ]}
    />
  );
}
