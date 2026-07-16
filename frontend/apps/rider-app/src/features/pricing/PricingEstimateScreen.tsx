import { Alert, Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { usePricingEstimate } from "./usePricingEstimate";
import { formatCurrency, formatVehicleType } from "./pricing.utils";
import styles from "./PricingEstimateScreen.module.css";

export function PricingEstimateScreen() {
  const { draft, quote, isLoading, message, loadQuote, continueToConfirm } = usePricingEstimate();

  if (!draft?.form) {
    return (
      <section className={styles.root}>
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
      <Card className={styles.hero} variant="navy">
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.eyebrow}>Estimated Total</p>
            <strong>{quote ? formatCurrency(quote.breakdown.totalFare, quote.breakdown.currency) : "Calculating"}</strong>
          </div>
          <Badge tone={quote?.guidance.highSurge ? "danger" : "trust"}>
            {quote?.surge.level ?? "Stable"}
          </Badge>
        </div>
        <ProgressBar value={quote?.confidence.score ?? 0} label="Fare Confidence" showValue />
        <p className={styles.heroNote}>{quote?.guidance.nextAction ?? "Pricing engine is preparing a transparent quote."}</p>
      </Card>

      {message ? (
        <Alert tone={quote ? "trust" : "danger"} title={quote ? "Pricing Ready" : "Pricing Unavailable"}>
          {message}
        </Alert>
      ) : null}

      {quote ? (
        <>
          <div className={styles.metrics}>
            <MetricCard label="Vehicle" value={formatVehicleType(quote.vehicleType)} />
            <MetricCard label="Distance" value={`${quote.distanceKm} km`} />
            <MetricCard label="ETA" value={`${quote.durationMinutes} min`} />
          </div>

          <Card className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Surge Transparency</p>
                <h3>{quote.surge.multiplier}x Multiplier</h3>
              </div>
              <Badge tone={quote.guidance.highSurge ? "danger" : "success"}>{quote.surge.level ?? "normal"}</Badge>
            </div>
            <p className={styles.copy}>{quote.surge.reason ?? "Demand and driver availability are normal."}</p>
            {quote.confidence.factors.length ? (
              <ul className={styles.factorList}>
                {quote.confidence.factors.map((factor) => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Detailed Breakdown</p>
                <h3>{formatCurrency(quote.breakdown.totalFare, quote.breakdown.currency)}</h3>
              </div>
              <Badge tone="navy">{quote.confidence.level ?? "confidence"}</Badge>
            </div>
            <dl className={styles.breakdown}>
              <BreakdownRow label="Base fare" value={quote.breakdown.baseFare} currency={quote.breakdown.currency} />
              <BreakdownRow label="Distance fare" value={quote.breakdown.distanceFare} currency={quote.breakdown.currency} />
              <BreakdownRow label="Time fare" value={quote.breakdown.timeFare} currency={quote.breakdown.currency} />
              <BreakdownRow label="Minimum adjustment" value={quote.breakdown.minFareAdjustment} currency={quote.breakdown.currency} />
              <BreakdownRow label="Surge fare" value={quote.breakdown.surgeFare} currency={quote.breakdown.currency} tone="danger" />
              <BreakdownRow label="Platform fee" value={quote.breakdown.platformFee} currency={quote.breakdown.currency} />
              <BreakdownRow label="Tax" value={quote.breakdown.taxes} currency={quote.breakdown.currency} />
            </dl>
          </Card>

          {quote.alternativePickups.length ? (
            <Card className={styles.section} variant="mint">
              <p className={styles.eyebrow}>Smart Pickup Tips</p>
              <div className={styles.alternatives}>
                {quote.alternativePickups.map((alternative) => (
                  <div key={`${alternative.label}-${alternative.walkingDistanceMeters}`} className={styles.alternative}>
                    <strong>{alternative.label}</strong>
                    <span>
                      Walk {alternative.walkingDistanceMeters}m and save{" "}
                      {formatCurrency(alternative.estimatedSavings, quote.breakdown.currency)}
                    </span>
                    <small>{alternative.reason}</small>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => void loadQuote()} isLoading={isLoading}>
              Refresh Quote
            </Button>
            <Button onClick={continueToConfirm}>Continue To Confirm</Button>
          </div>
        </>
      ) : (
        <Card className={styles.section}>
          <Button fullWidth isLoading={isLoading} onClick={() => void loadQuote()}>
            Calculate Fare Estimate
          </Button>
        </Card>
      )}
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
