import { Alert, Badge, Button, ProgressBar } from "@good-rapido/ui";

import { useDriverTrust } from "./useDriverTrust";
import type { DriverTrustScore, DriverTrustTip } from "./trust.types";
import styles from "./TrustScreen.module.css";

export function TrustScreen() {
  const { profile, error, isLoading, reload } = useDriverTrust();

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <Badge tone="trust">Step 07</Badge>
          <h1>Driver trust profile</h1>
          <p>Monitor trust score, cancellation score, route fairness, reliability, safety signals, and improvement guidance.</p>
        </div>
        <div className={styles.scoreHero}>
          <span>Overall trust score</span>
          <strong>{profile.trustScore}</strong>
          <small>{profile.trustLevel} driver band</small>
          <ProgressBar value={profile.trustScore} tone="success" />
        </div>
      </section>

      {error ? (
        <Alert tone="danger" title="Trust profile failed">
          {error}
        </Alert>
      ) : null}
      {profile.backendNote ? (
        <Alert tone="info" title="Backend integration note">
          {profile.backendNote}
        </Alert>
      ) : null}

      <section className={styles.layout}>
        <article className={styles.profileCard}>
          <div className={styles.profileAvatar}>{initials(profile.driverName)}</div>
          <div>
            <Badge tone="success">{formatStatus(profile.riskLevel)} risk</Badge>
            <h2>{profile.driverName}</h2>
            <p>{profile.nextAction}</p>
          </div>
          <div className={styles.profileMeta}>
            <div>
              <span>Trust code</span>
              <strong>{profile.trustCode}</strong>
            </div>
            <div>
              <span>Review</span>
              <strong>{formatStatus(profile.reviewStatus)}</strong>
            </div>
            <div>
              <span>Completed rides</span>
              <strong>{profile.completedRides.toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <span>Cancellation</span>
              <strong>{profile.cancellationRatio}%</strong>
            </div>
          </div>
          <Button type="button" variant="secondary" isLoading={isLoading} onClick={() => void reload()}>
            Refresh trust profile
          </Button>
        </article>

        <div className={styles.contentStack}>
          <article className={styles.panel}>
            <div>
              <span className={styles.eyebrow}>Score breakdown</span>
              <h2>Trust signals</h2>
            </div>
            <div className={styles.scoreGrid}>
              {profile.scores.map((score) => (
                <ScoreCard key={score.label} score={score} />
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div>
              <span className={styles.eyebrow}>Improvement tips</span>
              <h2>Next best actions</h2>
            </div>
            <div className={styles.tipGrid}>
              {profile.tips.map((tip) => (
                <TipCard key={tip.title} tip={tip} />
              ))}
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}

function ScoreCard({ score }: { score: DriverTrustScore }) {
  return (
    <article className={styles.scoreCard}>
      <span>{score.label}</span>
      <strong>{score.value}%</strong>
      <small>{score.helper}</small>
      <ProgressBar value={score.value} tone={score.value >= 90 ? "success" : "warning"} />
    </article>
  );
}

function TipCard({ tip }: { tip: DriverTrustTip }) {
  return (
    <article className={styles.tipCard} data-priority={tip.priority}>
      <span>{tip.priority} priority</span>
      <h3>{tip.title}</h3>
      <p>{tip.description}</p>
    </article>
  );
}

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join("") || "DR";

const formatStatus = (value: string) => value.replace(/_/g, " ");
