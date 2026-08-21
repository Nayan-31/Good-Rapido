import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, MetricCard, TextField } from "@good-rapido/ui";

import type { PricingQuote } from "@/features/pricing/pricing.types";
import { VEHICLE_OPTIONS } from "./booking.constants";
import { bookingService } from "./booking.service";
import { searchKnownLocations } from "./locationPresets";
import type { BookingLocationForm, LocationSuggestion, VehicleType } from "./booking.types";
import { formatCurrency, hasResolvedCoordinates } from "./booking.utils";
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
    canEstimate,
    estimateDisabledReason,
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
            label="Drop-off"
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
          <Button
            fullWidth
            disabled={!canEstimate}
            isLoading={isEstimating}
            onClick={() => void createEstimate()}
          >
            Estimate Fare
          </Button>
          {!canEstimate && estimateDisabledReason ? (
            <p className={styles.disabledHint}>{estimateDisabledReason}</p>
          ) : null}
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
  const localSuggestions = useMemo(() => searchKnownLocations(value.address), [value.address]);
  const sessionToken = useMemo(() => createLocationSearchSessionToken(), []);
  const [remoteSuggestions, setRemoteSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [searchProvider, setSearchProvider] = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const normalizedAddress = value.address.trim();
  const isSelectedLocation = hasResolvedCoordinates(value);
  const shouldSearch = normalizedAddress.length >= 2 && !isSelectedLocation;
  const suggestions = remoteSuggestions.length ? remoteSuggestions : localSuggestions;
  const hasNoResults = shouldSearch && !isSearching && !suggestions.length;

  useEffect(() => {
    if (!shouldSearch) {
      setRemoteSuggestions([]);
      setSearchProvider(null);
      setFallbackReason(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let isActive = true;
    setIsSearching(true);
    setSearchError(null);

    const timerId = window.setTimeout(() => {
      void bookingService.searchLocations(normalizedAddress, sessionToken)
        .then((response) => {
          if (!isActive) {
            return;
          }

          const locationSearch = response.data?.locationSearch;

          setRemoteSuggestions(locationSearch?.suggestions ?? []);
          setSearchProvider(locationSearch?.provider ?? null);
          setFallbackReason(locationSearch?.fallbackReason ?? null);
        })
        .catch(() => {
          if (!isActive) {
            return;
          }

          setRemoteSuggestions([]);
          setSearchProvider("local");
          setFallbackReason("client_search_failed");
          setSearchError("Search is temporarily unavailable. Showing supported local locations.");
        })
        .finally(() => {
          if (isActive) {
            setIsSearching(false);
          }
        });
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timerId);
    };
  }, [normalizedAddress, sessionToken, shouldSearch]);

  const selectSuggestion = async (suggestion: LocationSuggestion) => {
    if (suggestion.latitude && suggestion.longitude) {
      onChange({
        address: suggestion.address,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude
      });
      setRemoteSuggestions([]);
      setSearchProvider(suggestion.provider);
      setFallbackReason(null);
      setSearchError(null);
      return;
    }

    setResolvingId(suggestion.id);

    try {
      const response = await bookingService.resolveLocation(suggestion.id, sessionToken);
      const location = response.data?.location;

      onChange({
        address: location?.address ?? suggestion.address,
        latitude: location?.latitude ?? "",
        longitude: location?.longitude ?? ""
      });
      setRemoteSuggestions([]);
      setSearchProvider(location?.provider ?? suggestion.provider);
      setFallbackReason(null);
      setSearchError(null);
    } catch {
      onChange({
        address: suggestion.address,
        latitude: "",
        longitude: ""
      });
      setSearchError("Please select a valid location");
    } finally {
      setResolvingId(null);
    }
  };

  const statusMessage = resolveLocationStatusMessage({
    fallbackReason,
    isSearching,
    searchProvider
  });

  return (
    <div className={styles.locationGroup}>
      <TextField
        label={label}
        value={value.address}
        error={errors?.address}
        helperText={isSelectedLocation ? `${label} selected for fare estimate` : "Type a location and choose a suggestion"}
        autoComplete="off"
        onChange={(event) => {
          setSearchError(null);
          onChange({ address: event.target.value });
        }}
      />
      {isSelectedLocation ? (
        <div className={styles.selectionSummary}>
          <span>Selected</span>
          <strong>{value.address}</strong>
        </div>
      ) : null}
      {shouldSearch ? (
        <p className={styles.suggestionStatus} aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      {searchError ? <p className={styles.locationNotice}>{searchError}</p> : null}
      {hasNoResults ? (
        <p className={styles.locationNotice}>Please select a valid location</p>
      ) : null}
      {suggestions.length ? (
        <div className={styles.suggestionList} role="listbox" aria-label={`${label} suggestions`}>
          {suggestions.map((suggestion) => (
            <button
              className={styles.suggestionItem}
              key={`${label}-${suggestion.provider}-${suggestion.id}`}
              type="button"
              disabled={resolvingId === suggestion.id}
              onClick={() => void selectSuggestion(suggestion)}
            >
              <strong>{suggestion.address}</strong>
              <span>{resolvingId === suggestion.id ? "Resolving location..." : suggestion.context}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const resolveLocationStatusMessage = ({
  fallbackReason,
  isSearching,
  searchProvider
}: {
  fallbackReason: string | null;
  isSearching: boolean;
  searchProvider: string | null;
}) => {
  if (isSearching) {
    return "Searching supported locations...";
  }

  if (searchProvider === "google") {
    return "Google Places results";
  }

  if (fallbackReason === "missing_provider_token") {
    return "Local supported locations";
  }

  if (fallbackReason === "provider_unavailable") {
    return "Google Places is unavailable. Showing local supported locations.";
  }

  if (fallbackReason === "no_provider_results") {
    return "No Google match found. Showing local supported locations.";
  }

  if (fallbackReason === "client_search_failed") {
    return "Showing local supported locations";
  }

  return "Supported location results";
};

const createLocationSearchSessionToken = () => {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `gr-location-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

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
