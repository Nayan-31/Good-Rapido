import { EmptyScreen } from "@/components";

export function EarningsScreen() {
  return (
    <EmptyScreen
      eyebrow="Earnings"
      title="Shift earnings"
      description="Daily income view separates gross fare, incentives, platform fee, deductions, and payout status."
      badge="Step 06"
      badgeTone="success"
      visualLabel="Earnings trend"
      visualVariant="earnings"
      primaryAction="View payout"
      secondaryAction="Download summary"
      routePreview={{
        pickup: "Morning shift",
        dropoff: "Evening payout",
        eta: "6 rides",
        distance: "74 km",
        fare: "₹1,240"
      }}
      metrics={[
        { label: "Gross", value: "₹1,430", hint: "Before platform fee", tone: "navy" },
        { label: "Incentive", value: "₹180", hint: "Peak bonus included", tone: "good" },
        { label: "Payout", value: "₹1,240", hint: "Ready by 9 PM", tone: "good" }
      ]}
      panels={[
        {
          title: "Breakdown",
          items: [
            { label: "Ride fares", value: "₹1,250", tone: "neutral" },
            { label: "Incentives", value: "+₹180", tone: "success" },
            { label: "Platform fee", value: "-₹190", tone: "neutral" }
          ]
        },
        {
          title: "Payout",
          items: [
            { label: "Bank", value: "Verified", tone: "success" },
            { label: "Settlement", value: "Today", tone: "info" },
            { label: "Hold amount", value: "₹0", tone: "success" }
          ]
        }
      ]}
    />
  );
}
