import { Alert, Badge, Button, Card, MetricCard, TextField } from "@good-rapido/ui";

import type { PricingQuote } from "@/features/pricing/pricing.types";
import { VEHICLE_OPTIONS } from "./booking.constants";
import type { BookingLocationForm, VehicleType } from "./booking.types";
import { formatCurrency } from "./booking.utils";
import { useBookingHome } from "./useBookingHome";
import styles from "./BookingHomeScreen.module.css";

export function BookingHomeScreen() {
  const {
    form,
    errors,
    estimate,
    vehicleQuotes,
    message,
    isEstimating,
    isLoadingVehicleQuotes,
    updateLocation,
    selectVehicle,
    updatePassengers,
    createEstimate
  } = useBookingHome();
  const vehicleQuoteList = Object.values(vehicleQuotes).filter(Boolean) as PricingQuote[];
  const averageConfidence = average(vehicleQuoteList.map((quote) => quote.confidence.score));
  const bestRouteAccuracy = Math.max(
    0,
    ...vehicleQuoteList.map((quote) => quote.route?.quality.routeAccuracyScore ?? quote.route?.quality.score ?? 0)
  );
  const hasSurge = vehicleQuoteList.some((quote) => quote.surge.multiplier > 1);

  return (
    <section className={styles.root}>
      <aside className={styles.sidePanel}>
        <div className={styles.panelHeader}>
          <p className={styles.kicker}>Where to?</p>
          <h2>Book a transparent ride</h2>
        </div>

        <div className={styles.fieldStack}>
          <LocationFields
            label="Pickup"
            value={form.pickup}
            errors={errors.pickup}
            onChange={(patch) => updateLocation("pickup", patch)}
          />
          <LocationFields
            label="Dropoff"
            value={form.dropoff}
            errors={errors.dropoff}
            onChange={(patch) => updateLocation("dropoff", patch)}
          />
          <details className={styles.advancedFields}>
            <summary>Ride details</summary>
            <TextField
              label="Passengers"
              type="number"
              min={1}
              max={6}
              value={form.passengers}
              error={errors.passengers}
              onChange={(event) => updatePassengers(event.target.value)}
            />
          </details>
        </div>

        <div className={styles.vehicleSection}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Available Rides</p>
            <Badge tone={isLoadingVehicleQuotes ? "info" : "trust"} size="sm">
              {isLoadingVehicleQuotes ? "Syncing" : "Live"}
            </Badge>
          </div>
          <div className={styles.vehicleList}>
            {VEHICLE_OPTIONS.map((vehicle) => {
              const quote = vehicleQuotes[vehicle.type];

              return (
                <VehicleOption
                  key={vehicle.type}
                  type={vehicle.type}
                  label={vehicle.label}
                  eta={quote ? `${quote.durationMinutes} min` : vehicle.eta}
                  capacity={vehicle.capacity}
                  description={quote ? describeVehicleQuote(quote) : vehicle.description}
                  displayPrice={
                    quote
                      ? formatCurrency(quote.breakdown.totalFare, quote.breakdown.currency)
                      : vehicle.displayPrice
                  }
                  iconLabel={vehicle.iconLabel}
                  isSelected={form.vehicleType === vehicle.type}
                  onSelect={selectVehicle}
                />
              );
            })}
          </div>
        </div>

        <Card className={styles.trustCard} variant="mint">
          <div>
            <p className={styles.eyebrow}>Trust Assurance</p>
            <strong>{averageConfidence ? `${averageConfidence}% Fare Confidence` : "Ready To Price"}</strong>
          </div>
          <span>
            {vehicleQuoteList.length
              ? `${bestRouteAccuracy || averageConfidence}% route confidence. ${hasSurge ? "Surge is included in shown prices." : "No active surge in shown prices."}`
              : "Waiting for live fare signals."}
          </span>
        </Card>

        <div className={styles.panelFooter}>
          <Button fullWidth isLoading={isEstimating} onClick={() => void createEstimate()}>
            Estimate Fare
          </Button>
          {message ? (
            <Alert tone={estimate ? "trust" : "danger"} title={estimate ? "Estimate Ready" : "Estimate Failed"}>
              {message}
            </Alert>
          ) : null}
        </div>

        {estimate ? (
          <Card className={styles.estimateCard} variant="navy">
            <div className={styles.estimateHeader}>
              <div>
                <p className={styles.eyebrow}>Estimated Total</p>
                <strong>{formatCurrency(estimate.breakdown.totalFare, estimate.breakdown.currency)}</strong>
              </div>
              <Badge tone="trust">{estimate.confidence.level ?? "stable"}</Badge>
            </div>
            <div className={styles.metrics}>
              <MetricCard label="Distance" value={`${estimate.distanceKm} km`} />
              <MetricCard label="ETA" value={`${estimate.durationMinutes} min`} />
              <MetricCard label="Surge" value={`${estimate.surge.multiplier}x`} />
            </div>
            {estimate.surge.reason ? (
              <p className={styles.estimateNote}>{estimate.surge.reason}</p>
            ) : null}
          </Card>
        ) : null}
      </aside>

      <div className={styles.mapScene} aria-hidden="true">
        <div className={styles.trustPills}>
          <span><b>Trust Score</b> 98% Positive</span>
          <span><b>Route Accuracy</b> 100% Reliable</span>
          <span><b>Cancellation</b> Ultra Low</span>
        </div>
        <div className={styles.routePath}>
          <span className={styles.routeSegmentOne} />
          <span className={styles.routeSegmentTwo} />
          <span className={styles.routeSegmentThree} />
        </div>
        <span className={styles.pickupPin}>Pickup</span>
        <span className={styles.dropoffPin}>Dropoff</span>
        <div className={styles.helpBubble}>Need Help?</div>
      </div>
    </section>
  );
}

const describeVehicleQuote = (quote: PricingQuote) => {
  if (quote.surge.multiplier > 1) {
    return `${quote.confidence.score}% confidence • ${quote.surge.multiplier}x surge`;
  }

  return `${quote.confidence.score}% confidence • ${quote.distanceKm} km`;
};

const average = (values: number[]) => {
  const validValues = values.filter((value) => Number.isFinite(value) && value > 0);

  if (!validValues.length) {
    return 0;
  }

  return Math.round(validValues.reduce((sum, value) => sum + value, 0) / validValues.length);
};

interface LocationFieldsProps {
  label: string;
  value: BookingLocationForm;
  errors?: Partial<Record<keyof BookingLocationForm, string>>;
  onChange: (patch: Partial<BookingLocationForm>) => void;
}

function LocationFields({ label, value, errors, onChange }: LocationFieldsProps) {
  return (
    <div className={styles.locationGroup}>
      <TextField
        label={label}
        value={value.address}
        onChange={(event) => onChange({ address: event.target.value })}
      />
      <details className={styles.coordinateDetails}>
        <summary>Coordinates</summary>
        <div className={styles.coordinateGrid}>
          <TextField
            label="Latitude"
            value={value.latitude}
            error={errors?.latitude}
            onChange={(event) => onChange({ latitude: event.target.value })}
          />
          <TextField
            label="Longitude"
            value={value.longitude}
            error={errors?.longitude}
            onChange={(event) => onChange({ longitude: event.target.value })}
          />
        </div>
      </details>
    </div>
  );
}

interface VehicleOptionProps {
  type: VehicleType;
  label: string;
  eta: string;
  capacity: string;
  description: string;
  displayPrice: string;
  iconLabel: string;
  isSelected: boolean;
  onSelect: (vehicleType: VehicleType) => void;
}

function VehicleOption({ type, label, eta, capacity, description, displayPrice, iconLabel, isSelected, onSelect }: VehicleOptionProps) {
  return (
    <button
      className={isSelected ? `${styles.vehicleOption} ${styles.selectedVehicle}` : styles.vehicleOption}
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(type)}
    >
      <span className={styles.vehicleIcon}>{iconLabel}</span>
      <span className={styles.vehicleCopy}>
        <strong>{label}</strong>
        <small>{eta} away • {description}</small>
        <em>{capacity}</em>
      </span>
      <b>{displayPrice}</b>
    </button>
  );
}
