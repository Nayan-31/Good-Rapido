import { Alert, Badge, Button, ProgressBar } from "@good-rapido/ui";

import { useDriverProfile } from "./useDriverProfile";
import type { DriverProfileDocument } from "./profile.types";
import styles from "./ProfileScreen.module.css";

export interface ProfileScreenProps {
  onLogout?: () => void;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const profileState = useDriverProfile();
  const profile = profileState.profile;

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <Badge tone="navy">Step 09</Badge>
          <h1>Driver profile and account</h1>
          <p>Manage driver profile, vehicle info, document status, account settings, logout, and safety/compliance readiness.</p>
        </div>
        <Button type="button" variant="secondary" isLoading={profileState.isLoading} onClick={() => void profileState.reload()}>
          Refresh profile
        </Button>
      </section>

      {profileState.error ? (
        <Alert tone="danger" title="Profile failed">
          {profileState.error}
        </Alert>
      ) : null}
      {profileState.message ? (
        <Alert tone="trust" title="Account update">
          {profileState.message}
        </Alert>
      ) : null}
      {profile.backendNote ? (
        <Alert tone="info" title="Backend integration note">
          {profile.backendNote}
        </Alert>
      ) : null}

      <section className={styles.layout}>
        <article className={styles.profileCard}>
          <div className={styles.avatar}>{initials(profile.driverName)}</div>
          <div>
            <Badge tone={profile.approvalStatus === "approved" ? "success" : "warning"}>
              {formatStatus(profile.approvalStatus)}
            </Badge>
            <h2>{profile.driverName}</h2>
            <p>{profile.bio}</p>
          </div>
          <div className={styles.metaGrid}>
            <div>
              <span>Driver code</span>
              <strong>{profile.driverCode}</strong>
            </div>
            <div>
              <span>Service zone</span>
              <strong>{formatStatus(profile.serviceZone)}</strong>
            </div>
            <div>
              <span>Onboarding</span>
              <strong>{formatStatus(profile.onboardingStatus)}</strong>
            </div>
            <div>
              <span>Contact</span>
              <strong>{formatStatus(profile.settings.preferredContactChannel)}</strong>
            </div>
          </div>
          <Button type="button" variant="danger" onClick={onLogout}>
            Logout
          </Button>
        </article>

        <div className={styles.contentStack}>
          <article className={styles.panel}>
            <div className={styles.vehicleTitle}>
              <div>
                <span className={styles.eyebrow}>Vehicle info</span>
                <h2>{profile.vehicle.label}</h2>
              </div>
              <Badge tone={profile.vehicle.status === "approved" ? "success" : "warning"}>{formatStatus(profile.vehicle.status)}</Badge>
            </div>
            <div className={styles.vehicleGrid}>
              <div>
                <span>Make and model</span>
                <strong>{profile.vehicle.make} {profile.vehicle.model}</strong>
              </div>
              <div>
                <span>Registration</span>
                <strong>{profile.vehicle.registrationNumber}</strong>
              </div>
              <div>
                <span>Insurance expiry</span>
                <strong>{formatDate(profile.vehicle.insuranceExpiresAt)}</strong>
              </div>
              <div>
                <span>Primary vehicle</span>
                <strong>{profile.vehicle.id}</strong>
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>Document status</span>
                <h2>Compliance documents</h2>
              </div>
              <Badge tone={profile.documentPercent >= 80 ? "success" : "warning"}>{profile.documentPercent}% ready</Badge>
            </div>
            <ProgressBar value={profile.documentPercent} showValue label="Document readiness" tone={profile.documentPercent >= 80 ? "success" : "warning"} />
            <div className={styles.documentList}>
              {profile.documents.map((document) => (
                <DocumentRow key={document.type} document={document} />
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div>
              <span className={styles.eyebrow}>Account settings</span>
              <h2>Driver controls</h2>
            </div>
            <div className={styles.settingsList}>
              <ToggleRow
                label="Ride requests"
                helper="Allow incoming ride requests when online."
                active={profile.settings.rideRequestsEnabled}
                disabled={profileState.isSaving}
                onToggle={() => void profileState.updateSetting("rideRequestsEnabled", !profile.settings.rideRequestsEnabled)}
              />
              <ToggleRow
                label="Marketing updates"
                helper="Receive optional offers and product updates."
                active={profile.settings.marketingOptIn}
                disabled={profileState.isSaving}
                onToggle={() => void profileState.updateSetting("marketingOptIn", !profile.settings.marketingOptIn)}
              />
              <ToggleRow
                label="Safety training"
                helper="Confirm driver safety and compliance acknowledgement."
                active={profile.settings.safetyTrainingAccepted}
                disabled={profileState.isSaving}
                onToggle={() => void profileState.updateSetting("safetyTrainingAccepted", !profile.settings.safetyTrainingAccepted)}
              />
            </div>
          </article>

          <section className={styles.safetyGrid}>
            {profile.safetyCards.map((card) => (
              <article className={styles.safetyCard} key={card.title}>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <small>{card.helper}</small>
              </article>
            ))}
          </section>
        </div>
      </section>
    </section>
  );
}

function DocumentRow({ document }: { document: DriverProfileDocument }) {
  return (
    <div className={styles.documentRow}>
      <div>
        <span>{document.required ? "Required" : "Optional"}</span>
        <strong>{document.label}</strong>
      </div>
      <Badge tone={document.status === "approved" ? "success" : document.status === "missing" ? "danger" : "warning"}>
        {formatStatus(document.status)}
      </Badge>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  helper: string;
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, helper, active, disabled, onToggle }: ToggleRowProps) {
  return (
    <div className={styles.settingRow}>
      <div>
        <span>{label}</span>
        <strong>{helper}</strong>
      </div>
      <button
        className={styles.toggle}
        data-active={active}
        type="button"
        aria-pressed={active}
        disabled={disabled}
        onClick={onToggle}
      >
        <span />
      </button>
    </div>
  );
}

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join("") || "DR";

const formatStatus = (value: string) => value.replace(/_/g, " ");

const formatDate = (value: string) => {
  if (!value || value === "Not available") {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
};
