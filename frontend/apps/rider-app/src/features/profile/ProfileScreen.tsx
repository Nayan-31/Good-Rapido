import { Alert, Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { readAuthSession } from "@/features/auth/authStorage";
import { formatCurrency } from "@/features/pricing/pricing.utils";
import { useProfileDashboard } from "./useProfileDashboard";
import { formatDate, getDisplayName } from "./profile.utils";
import styles from "./ProfileScreen.module.css";

export function ProfileScreen() {
  const {
    profile,
    rideHistory,
    transparency,
    isLoading,
    isSaving,
    message,
    loadProfile,
    toggleNotification,
    addHomeAddress,
    addEmergencyContact
  } = useProfileDashboard();
  const authUser = readAuthSession()?.user ?? null;
  const totalSpend = rideHistory.reduce((sum, ride) => sum + ride.totalFare, 0);

  return (
    <section className={styles.root}>
      <Card className={styles.hero} variant="navy">
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.eyebrow}>Rider Profile</p>
            <strong>{getDisplayName(profile, authUser)}</strong>
            <span>Member since {formatDate(profile?.createdAt ?? authUser?.createdAt)}</span>
          </div>
          <Badge tone={transparency.safetyReady ? "trust" : "warning"}>
            {transparency.safetyReady ? "Safe Profile" : "Needs Contact"}
          </Badge>
        </div>
        <div className={styles.metrics}>
          <MetricCard label="Rides" value={transparency.totalRides} />
          <MetricCard label="Recent Spend" value={formatCurrency(totalSpend)} />
          <MetricCard label="Notifications" value={`${transparency.notificationCoverage}%`} />
        </div>
      </Card>

      {message ? (
        <Alert tone="info" title="Profile Update">
          {message}
        </Alert>
      ) : null}

      <Card className={styles.section} variant="mint">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Trust Transparency</p>
            <h3>Profile readiness and ride signals</h3>
          </div>
          <Button size="sm" variant="secondary" isLoading={isLoading} onClick={() => void loadProfile()}>
            Refresh
          </Button>
        </div>
        <div className={styles.transparencyGrid}>
          <TransparencyCard label="Fair Price" value={transparency.averageFairPriceScore} />
          <TransparencyCard label="Route Accuracy" value={transparency.averageRouteAccuracyScore} />
          <TransparencyCard label="Safety Ready" value={transparency.safetyReady ? 100 : 40} />
        </div>
      </Card>

      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Saved Addresses</p>
            <h3>{profile?.savedAddresses.length ?? 0} saved places</h3>
          </div>
          <Button size="sm" variant="secondary" isLoading={isSaving} onClick={() => void addHomeAddress()}>
            Add Home
          </Button>
        </div>
        <div className={styles.list}>
          {profile?.savedAddresses.length ? profile.savedAddresses.map((address) => (
            <div className={styles.listItem} key={address.id}>
              <span>
                <strong>{address.label}</strong>
                <small>{address.addressLine}</small>
              </span>
              <Badge tone={address.isDefault ? "trust" : "neutral"}>{address.city ?? "saved"}</Badge>
            </div>
          )) : (
            <p className={styles.empty}>No saved addresses yet.</p>
          )}
        </div>
      </Card>

      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Emergency Contacts</p>
            <h3>{profile?.emergencyContacts.length ?? 0} trusted contacts</h3>
          </div>
          <Button size="sm" variant="secondary" isLoading={isSaving} onClick={() => void addEmergencyContact()}>
            Add Contact
          </Button>
        </div>
        <div className={styles.list}>
          {profile?.emergencyContacts.length ? profile.emergencyContacts.map((contact) => (
            <div className={styles.listItem} key={contact.id}>
              <span>
                <strong>{contact.name}</strong>
                <small>{contact.phone}</small>
              </span>
              <Badge tone="info">{contact.relationship ?? "contact"}</Badge>
            </div>
          )) : (
            <p className={styles.empty}>Add one contact to improve safety readiness.</p>
          )}
        </div>
      </Card>

      {profile ? (
        <Card className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Preferences</p>
              <h3>Notification coverage</h3>
            </div>
            <Badge tone="navy">{profile.preferences.language}</Badge>
          </div>
          <div className={styles.toggleGrid}>
            {Object.entries(profile.preferences.notifications).map(([channel, enabled]) => (
              <label className={styles.toggleItem} key={channel}>
                <span>{channel}</span>
                <input
                  checked={enabled}
                  type="checkbox"
                  onChange={(event) => void toggleNotification(
                    channel as keyof typeof profile.preferences.notifications,
                    event.target.checked
                  )}
                />
              </label>
            ))}
          </div>
        </Card>
      ) : null}
    </section>
  );
}

function TransparencyCard({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.transparencyCard}>
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <ProgressBar value={value} label={label} />
    </div>
  );
}
