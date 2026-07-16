import { Alert, Badge, Button, Card, MetricCard, TextField } from "@good-rapido/ui";

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
    message,
    isEstimating,
    updateLocation,
    selectVehicle,
    updatePassengers,
    createEstimate
  } = useBookingHome();

  return (
    <section className={styles.root}>
      <div className={styles.mapPanel} aria-hidden="true">
        <div className={styles.routeLine} />
        <span className={styles.pickupPin} />
        <span className={styles.dropoffPin} />
        <div className={styles.badges}>
          <Badge tone="trust">Fair Price Score: 98%</Badge>
          <Badge tone="info">Accuracy: 95%</Badge>
          <Badge tone="success">Low Cancellation</Badge>
        </div>
      </div>

      <Card className={styles.bookingCard}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Book Ride</p>
            <h2>Choose pickup, dropoff, and ride type</h2>
          </div>
          <Badge tone="trust">Transparent Fare</Badge>
        </div>

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

        <TextField
          label="Passengers"
          type="number"
          min={1}
          max={6}
          value={form.passengers}
          error={errors.passengers}
          onChange={(event) => updatePassengers(event.target.value)}
        />

        <div className={styles.vehicleSection}>
          <p className={styles.eyebrow}>Choose Your Ride</p>
          <div className={styles.vehicleGrid}>
            {VEHICLE_OPTIONS.map((vehicle) => (
              <VehicleOption
                key={vehicle.type}
                type={vehicle.type}
                label={vehicle.label}
                eta={vehicle.eta}
                capacity={vehicle.capacity}
                description={vehicle.description}
                isSelected={form.vehicleType === vehicle.type}
                onSelect={selectVehicle}
              />
            ))}
          </div>
        </div>

        <Button fullWidth isLoading={isEstimating} onClick={() => void createEstimate()}>
          Get Fare Estimate
        </Button>
      </Card>

      {message ? (
        <Alert tone={estimate ? "trust" : "danger"} title={estimate ? "Estimate Ready" : "Estimate Failed"}>
          {message}
        </Alert>
      ) : null}

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
    </section>
  );
}

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
    </div>
  );
}

interface VehicleOptionProps {
  type: VehicleType;
  label: string;
  eta: string;
  capacity: string;
  description: string;
  isSelected: boolean;
  onSelect: (vehicleType: VehicleType) => void;
}

function VehicleOption({ type, label, eta, capacity, description, isSelected, onSelect }: VehicleOptionProps) {
  return (
    <button
      className={isSelected ? `${styles.vehicleOption} ${styles.selectedVehicle}` : styles.vehicleOption}
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(type)}
    >
      <span>{label}</span>
      <strong>{eta}</strong>
      <em>{capacity}</em>
      <small>{description}</small>
    </button>
  );
}
