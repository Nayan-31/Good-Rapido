import { EmptyScreen } from "@/components";

export function AuthScreen() {
  return (
    <EmptyScreen
      eyebrow="Driver access"
      title="Sign in to start your shift"
      description="Amit Das is registered as a Kolkata driver partner with a verified bike profile."
      badge="Step 01"
      badgeTone="navy"
      visualLabel="Secure driver access"
      visualVariant="auth"
      primaryAction="Send OTP"
      secondaryAction="Restore session"
      metrics={[
        { label: "Phone", value: "+91 98xx xxx210", hint: "OTP login enabled", tone: "navy" },
        { label: "Account", value: "Verified", hint: "Driver ID GRD-2048", tone: "good" },
        { label: "Device", value: "Trusted", hint: "Last active 08:20 AM", tone: "good" }
      ]}
      panels={[
        {
          title: "Login checks",
          items: [
            { label: "Driver role", value: "Active", tone: "success" },
            { label: "Token storage", value: "Ready", tone: "trust" },
            { label: "Session restore", value: "Available", tone: "info" }
          ]
        }
      ]}
    />
  );
}
