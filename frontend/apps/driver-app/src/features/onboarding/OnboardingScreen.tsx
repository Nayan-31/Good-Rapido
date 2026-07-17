import { EmptyScreen } from "@/components";

export function OnboardingScreen() {
  return (
    <EmptyScreen
      eyebrow="Driver onboarding"
      title="Approval checklist"
      description="Driver profile is almost ready. Complete documents and vehicle verification before going online."
      badge="Step 02"
      badgeTone="info"
      visualLabel="Document review"
      visualVariant="setup"
      primaryAction="Upload RC"
      secondaryAction="View documents"
      metrics={[
        { label: "Identity", value: "Verified", hint: "PAN and phone matched", tone: "good" },
        { label: "Vehicle", value: "2/3", hint: "RC upload pending", tone: "warning" },
        { label: "Approval", value: "82%", hint: "Ops review in progress", tone: "navy" }
      ]}
      panels={[
        {
          title: "Required steps",
          items: [
            { label: "Driving license", value: "Done", tone: "success" },
            { label: "Bank account", value: "Done", tone: "success" },
            { label: "Vehicle RC", value: "Pending", tone: "warning" }
          ]
        },
        {
          title: "Compliance",
          items: [
            { label: "Background check", value: "Clear", tone: "success" },
            { label: "Service city", value: "Kolkata", tone: "neutral" },
            { label: "Go online", value: "Locked", tone: "warning" }
          ]
        }
      ]}
    />
  );
}
