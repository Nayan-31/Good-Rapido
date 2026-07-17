import { Alert, Badge, Button, Card, ProgressBar } from "@good-rapido/ui";

import { usePricingEstimate } from "./usePricingEstimate";
import { formatCurrency, formatVehicleType } from "./pricing.utils";
import styles from "./PricingEstimateScreen.module.css";

export function PricingEstimateScreen() {
  const { draft, quote, isLoading, message, loadQuote, continueToConfirm } = usePricingEstimate();

  if (!draft?.form) {
    return (
      <section className={styles.emptyRoot}>
        <Alert
          tone="warning"
          title="Start With Pickup"
          action={
            <Button size="sm" onClick={() => { window.location.hash = "/"; }}>
              Go Home
            </Button>
          }
        >
          Add pickup, dropoff, and ride type before reviewing a fare estimate.
        </Alert>
      </section>
    );
  }

  return (
    <section className={styles.root}>
      <div className={styles.mapPane} aria-hidden="true">
        <span className={styles.routeLineOne} />
        <span className={styles.routeLineTwo} />
        <span className={styles.routeLineThree} />
        <span className={styles.pickupMarker}>Pickup</span>
        <span className={styles.dropoffMarker}>Drop-off</span>
        <Card className={styles.routeCard}>
          <h3>Fastest Route</h3>
          <p>
            Traffic is lighter than usual. Estimated travel time:{" "}
            {quote?.durationMinutes ?? draft.fareEstimate?.durationMinutes ?? 42} mins.
          </p>
          <ProgressBar value={quote?.route?.quality?.score ?? 75} label="Route clarity" />
          <strong>{quote?.route?.quality?.score ?? 75}% Clear</strong>
        </Card>
      </div>

      <aside className={styles.farePanel}>
        <div className={styles.panelTop}>
          <div>
            <p className={styles.eyebrow}>Estimated Total</p>
            <strong>{quote ? formatCurrency(quote.breakdown.totalFare, quote.breakdown.currency) : "Calculating"}</strong>
            <span>Calculated for {formatVehicleType(quote?.vehicleType ?? draft.form.vehicleType)}</span>
          </div>
          <Badge tone={quote?.guidance.highSurge ? "danger" : "trust"}>
            {quote?.confidence.level ? `${quote.confidence.level} Confidence` : "High Confidence"}
          </Badge>
        </div>

        {message ? (
          <Alert tone={quote ? "trust" : "danger"} title={quote ? "Pricing Ready" : "Pricing Unavailable"}>
            {message}
          </Alert>
        ) : null}

        {quote ? (
          <>
            <Card className={styles.breakdownCard}>
              <div className={styles.sectionHeader}>
                <h3>Detailed Breakdown</h3>
                <Badge tone={quote.guidance.highSurge ? "danger" : "trust"}>{quote.surge.level ?? "stable"}</Badge>
              </div>
              <dl className={styles.breakdown}>
                <BreakdownRow label="Base Fare" value={quote.breakdown.baseFare} currency={quote.breakdown.currency} />
                <BreakdownRow label={`Distance (${quote.distanceKm} km)`} value={quote.breakdown.distanceFare} currency={quote.breakdown.currency} />
                <BreakdownRow label={`Time (${quote.durationMinutes} mins)`} value={quote.breakdown.timeFare} currency={quote.breakdown.currency} />
                <BreakdownRow label={`Surge Pricing (${quote.surge.multiplier}x)`} value={quote.breakdown.surgeFare} currency={quote.breakdown.currency} tone="danger" />
                <BreakdownRow label="Platform Fee" value={quote.breakdown.platformFee} currency={quote.breakdown.currency} />
                <BreakdownRow label="Taxes & GST" value={quote.breakdown.taxes} currency={quote.breakdown.currency} />
              </dl>
            </Card>

            <Card className={styles.savingTip} variant="mint">
              <div>
                <p className={styles.eyebrow}>Smart Saving Tip</p>
                <strong>{quote.alternativePickups[0]?.label ?? "Switch pickup nearby"}</strong>
              </div>
              <p>
                Moving your pickup point {quote.alternativePickups[0]?.walkingDistanceMeters ?? 200}m could save you{" "}
                {formatCurrency(quote.alternativePickups[0]?.estimatedSavings ?? 0, quote.breakdown.currency)} on surge pricing.
              </p>
              <button type="button">Switch Location</button>
            </Card>

            <div className={styles.contextBlock}>
              <div className={styles.sectionHeader}>
                <h3>Fare Context</h3>
                <Badge tone={quote.guidance.highSurge ? "danger" : "trust"}>
                  {quote.guidance.highSurge ? "Higher due to surge" : "Stable"}
                </Badge>
              </div>
              <FareContextChart />
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => void loadQuote()} isLoading={isLoading}>
                Lock Fare
              </Button>
              <Button onClick={continueToConfirm}>Book Ride</Button>
            </div>
          </>
        ) : (
          <Card className={styles.loadingCard}>
            <p>{draft.form.pickup.address} to {draft.form.dropoff.address}</p>
            <Button fullWidth isLoading={isLoading} onClick={() => void loadQuote()}>
            Calculate Fare Estimate
            </Button>
          </Card>
        )}
      </aside>
    </section>
  );
}

function BreakdownRow({
  label,
  value,
  currency,
  tone
}: {
  label: string;
  value: number;
  currency: string;
  tone?: "danger";
}) {
  return (
    <div className={tone === "danger" ? styles.dangerRow : undefined}>
      <dt>{label}</dt>
      <dd>{formatCurrency(value, currency)}</dd>
    </div>
  );
}

function FareContextChart() {
  return (
    <div className={styles.chart} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span className={styles.currentBar} />
      <span />
      <span />
    </div>
  );
}
