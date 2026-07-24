import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { findOpsRouteById } from "@/routes";
import { trustSafetyService } from "./trustSafety.service";
import type {
  DocumentReviewQueueItem,
  TrustProfile,
  TrustProfileItem,
  TrustSummary,
  VehicleReviewQueueItem
} from "./trustSafety.types";
import styles from "./TrustSafetyScreen.module.css";

const route = findOpsRouteById("trustSafety");

const emptySummary: TrustSummary = {
  totalProfiles: 0,
  lowRiskProfiles: 0,
  mediumRiskProfiles: 0,
  highRiskProfiles: 0,
  criticalRiskProfiles: 0,
  openReviews: 0,
  underReviewProfiles: 0,
  resolvedReviews: 0,
  restrictedProfiles: 0,
  suspendedProfiles: 0,
  averageOverallScore: 0
};

export function TrustSafetyScreen() {
  const [summary, setSummary] = useState<TrustSummary>(emptySummary);
  const [profiles, setProfiles] = useState<TrustProfileItem[]>([]);
  const [documentQueue, setDocumentQueue] = useState<DocumentReviewQueueItem[]>([]);
  const [vehicleQueue, setVehicleQueue] = useState<VehicleReviewQueueItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TrustProfile | null>(null);
  const [reviewerId, setReviewerId] = useState("ops-reviewer");
  const [reviewNote, setReviewNote] = useState("Ops reviewed trust and compliance signals");
  const [resolutionStatus, setResolutionStatus] = useState("monitoring");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTrustSafety = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await trustSafetyService.load();
      setSummary(data.profiles?.summary ?? data.dashboard?.summary ?? emptySummary);
      setProfiles(data.profiles?.profiles ?? data.dashboard?.openReviews ?? []);
      setDocumentQueue(data.documentQueue);
      setVehicleQueue(data.vehicleQueue);
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
      setProfiles([]);
      setDocumentQueue([]);
      setVehicleQueue([]);
      setSummary(emptySummary);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrustSafety();
  }, [loadTrustSafety]);

  const complianceScore = useMemo(() => {
    const queuePenalty = Math.min(45, documentQueue.length * 4 + vehicleQueue.length * 5);
    const riskPenalty = summary.criticalRiskProfiles * 10 + summary.highRiskProfiles * 5;

    return Math.max(40, 100 - queuePenalty - riskPenalty);
  }, [documentQueue.length, summary.criticalRiskProfiles, summary.highRiskProfiles, vehicleQueue.length]);

  const runAction = async (actionName: string, action: () => Promise<unknown>, successMessage: string) => {
    setPendingAction(actionName);
    setError(null);
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
      await loadTrustSafety();
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  };

  const openProfile = async (profile: TrustProfileItem) => {
    await runAction(`profile:${profile.id}`, async () => {
      const detail = await trustSafetyService.getProfile(profile.id);
      setSelectedProfile(detail ?? null);
    }, `Opened ${profile.trustCode || profile.subjectLabel || profile.id}`);
  };

  const reviewFirstDocument = (item: DocumentReviewQueueItem, status: string) => {
    const reviewDoc = item.documents.documents.find((document) => document.status === "under_review" || document.status === "uploaded")
      ?? item.documents.documents.find((document) => document.required);

    if (!reviewDoc) {
      return;
    }

    void runAction(
      `doc:${item.driver.id}:${reviewDoc.type}:${status}`,
      () => trustSafetyService.reviewDocument(item.driver.id, reviewDoc.type, status),
      `${reviewDoc.label} marked ${status}`
    );
  };

  const reviewVehicle = (item: VehicleReviewQueueItem, status: string) => runAction(
    `vehicle:${item.vehicle.id}:${status}`,
    () => trustSafetyService.reviewVehicle(item.driver.id, item.vehicle.id, status),
    `${item.vehicle.registrationNumber || item.vehicle.id} marked ${status}`
  );

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Trust And Safety</span>
          <h1>Review driver trust, documents, vehicles, and compliance risk</h1>
          <p>Connected with {route.backendModules.join(", ")} for trust reviews, document queues, vehicle queues, notes, assignments, and resolution.</p>
        </div>
        <div className={styles.heroActions}>
          <Button type="button" onClick={() => void loadTrustSafety()} isLoading={isLoading}>Refresh Reviews</Button>
          <Badge tone={error ? "danger" : "trust"}>{error ? "Needs auth/data" : "Backend wired"}</Badge>
        </div>
      </section>

      <section className={styles.metrics}>
        <MetricCard label="Trust Profiles" value={String(summary.totalProfiles)} meta={`${summary.openReviews} open reviews`} tone="navy" />
        <MetricCard label="Avg Trust" value={`${summary.averageOverallScore}%`} meta="overall score" tone="success" />
        <MetricCard label="Docs Queue" value={String(documentQueue.length)} meta="submitted docs" tone="warning" />
        <MetricCard label="Vehicle Queue" value={String(vehicleQueue.length)} meta="submitted vehicles" tone="danger" />
      </section>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {message ? <div className={styles.successBanner}>{message}</div> : null}

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Trust Profile Queue</span>
              <h2>Open reviews</h2>
            </div>
            <Badge tone="warning">{profiles.length} profiles</Badge>
          </div>
          <div className={styles.queue}>
            {profiles.map((profile) => (
              <button type="button" key={profile.id} className={styles.queueItem} onClick={() => void openProfile(profile)}>
                <span>{profile.trustCode || formatLabel(profile.subjectType)}</span>
                <strong>{profile.subjectLabel || profile.subjectId}</strong>
                <small>{profile.guidance.nextAction}</small>
                <Badge tone={toneForRisk(profile.riskLevel)}>{formatLabel(profile.riskLevel)}</Badge>
              </button>
            ))}
            {!profiles.length ? <p>No trust profiles found.</p> : null}
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Driver Compliance</span>
              <h2>Readiness cards</h2>
            </div>
            <Badge tone={complianceScore > 80 ? "success" : "warning"}>{complianceScore}% ready</Badge>
          </div>
          <div className={styles.complianceScore}>
            <ProgressBar value={complianceScore} label="Docs, vehicles, and trust risk readiness" showValue tone="trust" />
          </div>
          <div className={styles.complianceGrid}>
            <div><span>High Risk</span><strong>{summary.highRiskProfiles + summary.criticalRiskProfiles}</strong></div>
            <div><span>Restricted</span><strong>{summary.restrictedProfiles}</strong></div>
            <div><span>Suspended</span><strong>{summary.suspendedProfiles}</strong></div>
          </div>
        </Card>
      </section>

      <section className={styles.reviewGrid}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Document Review Queue</span>
              <h2>Submitted documents</h2>
            </div>
            <Badge tone="navy">driver-documents</Badge>
          </div>
          <div className={styles.queue}>
            {documentQueue.map((item) => (
              <div className={styles.reviewItem} key={item.driver.id}>
                <div>
                  <strong>{item.driver.displayName || item.driver.driverCode || item.driver.id}</strong>
                  <span>{item.documents.completion.approvedRequiredDocuments}/{item.documents.completion.requiredDocuments} approved - {item.documents.guidance.nextAction}</span>
                </div>
                <div className={styles.actions}>
                  <Button type="button" size="sm" onClick={() => reviewFirstDocument(item, "approved")}>Approve</Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => reviewFirstDocument(item, "rejected")}>Reject</Button>
                </div>
              </div>
            ))}
            {!documentQueue.length ? <p>No submitted document reviews.</p> : null}
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Vehicle Review Queue</span>
              <h2>Vehicle compliance</h2>
            </div>
            <Badge tone="navy">vehicle</Badge>
          </div>
          <div className={styles.queue}>
            {vehicleQueue.map((item) => (
              <div className={styles.reviewItem} key={`${item.driver.id}-${item.vehicle.id}`}>
                <div>
                  <strong>{item.vehicle.registrationNumber || item.vehicle.id}</strong>
                  <span>{item.vehicle.make} {item.vehicle.model} - {item.driver.displayName || item.driver.driverCode}</span>
                </div>
                <div className={styles.actions}>
                  <Button type="button" size="sm" onClick={() => void reviewVehicle(item, "approved")}>Approve</Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => void reviewVehicle(item, "rejected")}>Reject</Button>
                </div>
              </div>
            ))}
            {!vehicleQueue.length ? <p>No submitted vehicle reviews.</p> : null}
          </div>
        </Card>
      </section>

      <Card padding="lg" className={styles.detailPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Reviewer Actions</span>
            <h2>{selectedProfile?.subjectLabel || "Select a trust profile"}</h2>
          </div>
          <Badge tone={selectedProfile ? toneForRisk(selectedProfile.riskLevel) : "neutral"}>{formatLabel(selectedProfile?.reviewStatus)}</Badge>
        </div>

        {selectedProfile ? (
          <div className={styles.detailGrid}>
            <div className={styles.scoreGrid}>
              {Object.entries(selectedProfile.scores).map(([key, value]) => (
                <div key={key}>
                  <span>{formatLabel(key)}</span>
                  <strong>{value}%</strong>
                </div>
              ))}
            </div>
            <div className={styles.formGrid}>
              <label>
                <span>Reviewer Id</span>
                <input value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} />
              </label>
              <label>
                <span>Resolution Status</span>
                <select value={resolutionStatus} onChange={(event) => setResolutionStatus(event.target.value)}>
                  <option value="clear">Clear</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="restricted">Restricted</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              <label>
                <span>Review Note</span>
                <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
              </label>
              <div className={styles.actions}>
                <Button
                  type="button"
                  disabled={!selectedProfile.guidance.canAssign}
                  isLoading={pendingAction === "assign"}
                  onClick={() => void runAction("assign", () => trustSafetyService.assignReviewer(selectedProfile.id, reviewerId, reviewNote), "Reviewer assigned")}
                >
                  Assign Reviewer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedProfile.guidance.canAddNote}
                  isLoading={pendingAction === "note"}
                  onClick={() => void runAction("note", () => trustSafetyService.addNote(selectedProfile.id, reviewNote), "Trust note added")}
                >
                  Add Note
                </Button>
                <Button
                  type="button"
                  variant="mint"
                  disabled={!selectedProfile.guidance.canResolve}
                  isLoading={pendingAction === "resolve"}
                  onClick={() => void runAction("resolve", () => trustSafetyService.resolveReview(selectedProfile.id, resolutionStatus, reviewNote), "Trust review resolved")}
                >
                  Resolve Review
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className={styles.emptyDetail}>Open a trust profile to assign a reviewer, add notes, inspect compliance cards, and resolve reviews.</p>
        )}
      </Card>
    </section>
  );
}

const toneForRisk = (riskLevel: string | null | undefined) => {
  if (riskLevel === "critical" || riskLevel === "high") {
    return "danger";
  }

  if (riskLevel === "medium") {
    return "warning";
  }

  return "success";
};

const formatLabel = (value: string | null | undefined) =>
  (value || "not_available").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const resolveErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Trust-safety request failed";
