import { EmptyScreen } from "@/components";

export function ProfileScreen() {
  return (
    <EmptyScreen
      eyebrow="Driver profile"
      title="Amit Das"
      description="Driver profile combines personal details, active vehicle, documents, emergency contact, and preferences."
      badge="Step 09"
      badgeTone="navy"
      visualLabel="Account control"
      visualVariant="profile"
      primaryAction="Edit profile"
      secondaryAction="Manage vehicle"
      metrics={[
        { label: "Vehicle", value: "Bike", hint: "WB 02 AC 4522", tone: "navy" },
        { label: "Docs", value: "2/3", hint: "RC pending", tone: "warning" },
        { label: "Rating", value: "4.9", hint: "1,280 rides", tone: "good" }
      ]}
      panels={[
        {
          title: "Saved details",
          items: [
            { label: "Home city", value: "Kolkata", tone: "neutral" },
            { label: "Bank account", value: "Verified", tone: "success" },
            { label: "Emergency contact", value: "Added", tone: "trust" }
          ]
        },
        {
          title: "Preferences",
          items: [
            { label: "Silent rides", value: "On", tone: "success" },
            { label: "Route alerts", value: "On", tone: "success" },
            { label: "Large text", value: "Off", tone: "neutral" }
          ]
        }
      ]}
    />
  );
}
