import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { findOpsRouteById } from "@/routes";
import { fraudDisputesService } from "./fraudDisputes.service";
import type {
  DisputeItem,
  DisputeDetail,
  DisputeSummary,
  FraudCase,
  FraudCaseItem,
  FraudSimulation,
  FraudSummary
} from "./fraudDisputes.types";
import styles from "./FraudDisputesScreen.module.css";

const route = findOpsRouteById("fraudDisputes");

const emptyFraudSummary: FraudSummary = {
  totalCases: 0,
  openCases: 0,
  underReviewCases: 0,
  confirmedCases: 0,
  dismissedCases: 0,
  resolvedCases: 0,
  highRiskCases: 0,
  criticalRiskCases: 0,
  averageRiskScore: 0
};

const emptyDisputeSummary: DisputeSummary = {
  totalDisputes: 0,
  submittedCount: 0,
  underReviewCount: 0,
  evidenceRequestedCount: 0,
  resolvedCount: 0,
  rejectedCount: 0,
  openCount: 0,
  urgentCount: 0,
  highPriorityCount: 0,
  unassignedCount: 0,
  requestedRefundAmount: 0
};

export function FraudDisputesScreen() {
  const [fraudSummary, setFraudSummary] = useState<FraudSummary>(emptyFraudSummary);
  const [disputeSummary, setDisputeSummary] = useState<DisputeSummary>(emptyDisputeSummary);
  const [fraudCases, setFraudCases] = useState<FraudCaseItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [selectedFraudCase, setSelectedFraudCase] = useState<FraudCase | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | DisputeDetail | null>(null);
  const [simulation, setSimulation] = useState<FraudSimulation | null>(null);
  const [reviewerId, setReviewerId] = useState("ops-reviewer");
  const [note, setNote] = useState("Ops reviewed evidence and risk signals");
  const [refundAmount, setRefundAmount] = useState("80");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFraudDisputes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fraudDisputesService.load();
      setFraudSummary(data.fraudCases?.summary ?? data.fraudDashboard?.summary ?? emptyFraudSummary);
      setDisputeSummary(data.disputes?.summary ?? data.disputeDashboard?.summary ?? emptyDisputeSummary);
      setFraudCases(data.fraudCases?.cases ?? data.fraudDashboard?.openCases ?? []);
      setDisputes(data.disputes?.disputes ?? data.disputeDashboard?.openQueue ?? []);
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
      setFraudSummary(emptyFraudSummary);
      setDisputeSummary(emptyDisputeSummary);
      setFraudCases([]);
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFraudDisputes();
  }, [loadFraudDisputes]);

  const runAction = async (actionName: string, action: () => Promise<unknown>, successMessage: string) => {
    setPendingAction(actionName);
    setError(null);
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
      await loadFraudDisputes();
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  };

  const openFraudCase = async (fraudCase: FraudCaseItem) => {
    await runAction(`fraud:${fraudCase.id}`, async () => {
      const detail = await fraudDisputesService.getFraudCase(fraudCase.id);
      setSelectedFraudCase(detail ?? null);
    }, `Opened ${fraudCase.caseCode || fraudCase.id}`);
  };

  const openDispute = async (dispute: DisputeItem) => {
    await runAction(`dispute:${dispute.id}`, async () => {
      const detail = await fraudDisputesService.getDispute(dispute.id);
      setSelectedDispute(detail ?? dispute);
    }, `Opened ${dispute.disputeCode || dispute.id}`);
  };

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Fraud And Disputes</span>
          <h1>Investigate fraud risk, dispute evidence, and resolution outcomes</h1>
          <p>Connected with {route.backendModules.join(", ")} for case queues, simulation, reviewer actions, evidence requests, and dispute decisions.</p>
        </div>
        <div className={styles.heroActions}>
          <Button type="button" onClick={() => void loadFraudDisputes()} isLoading={isLoading}>Refresh Cases</Button>
          <Badge tone={error ? "danger" : "trust"}>{error ? "Needs auth/data" : "Backend wired"}</Badge>
        </div>
      </section>

      <section className={styles.metrics}>
        <MetricCard label="Fraud Cases" value={String(fraudSummary.totalCases)} meta={`${fraudSummary.openCases} open`} tone="danger" />
        <MetricCard label="Avg Risk" value={`${fraudSummary.averageRiskScore}%`} meta="fraud score" tone="warning" />
        <MetricCard label="Disputes" value={String(disputeSummary.totalDisputes)} meta={`${disputeSummary.openCount} open`} tone="navy" />
        <MetricCard label="Refund Exposure" value={formatCurrency(disputeSummary.requestedRefundAmount)} meta="requested" tone="trust" />
      </section>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {message ? <div className={styles.successBanner}>{message}</div> : null}

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Fraud Case Queue</span>
              <h2>Risk investigations</h2>
            </div>
            <Badge tone="danger">{fraudCases.length} cases</Badge>
          </div>
          <div className={styles.queue}>
            {fraudCases.map((fraudCase) => (
              <button type="button" className={styles.queueItem} key={fraudCase.id} onClick={() => void openFraudCase(fraudCase)}>
                <span>{fraudCase.caseCode || formatLabel(fraudCase.caseType)}</span>
                <strong>{fraudCase.subjectLabel || fraudCase.subjectId}</strong>
                <small>{fraudCase.guidance.nextAction}</small>
                <Badge tone={toneForSeverity(fraudCase.severity)}>{fraudCase.riskScore}% risk</Badge>
              </button>
            ))}
            {!fraudCases.length ? <p>No fraud cases found.</p> : null}
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Dispute Queue</span>
              <h2>Evidence and refunds</h2>
            </div>
            <Badge tone="warning">{disputes.length} disputes</Badge>
          </div>
          <div className={styles.queue}>
            {disputes.map((dispute) => (
              <button type="button" className={styles.queueItem} key={dispute.id} onClick={() => void openDispute(dispute)}>
                <span>{dispute.disputeCode || formatLabel(dispute.type)}</span>
                <strong>{dispute.title || dispute.bookingCode || dispute.id}</strong>
                <small>{dispute.guidance.nextAction}</small>
                <Badge tone={dispute.priority === "urgent" ? "danger" : "warning"}>{formatLabel(dispute.status)}</Badge>
              </button>
            ))}
            {!disputes.length ? <p>No disputes found.</p> : null}
          </div>
        </Card>
      </section>

      <section className={styles.actionGrid}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Fraud Actions</span>
              <h2>{selectedFraudCase?.caseCode || "Select a fraud case"}</h2>
            </div>
            <Badge tone={selectedFraudCase ? toneForSeverity(selectedFraudCase.severity) : "neutral"}>{formatLabel(selectedFraudCase?.status)}</Badge>
          </div>
          <ActionFields reviewerId={reviewerId} note={note} onReviewerChange={setReviewerId} onNoteChange={setNote} />
          <div className={styles.actions}>
            <Button type="button" disabled={!selectedFraudCase?.guidance.canAssign} onClick={() => selectedFraudCase && void runAction("fraud-assign", () => fraudDisputesService.assignFraudCase(selectedFraudCase.id, reviewerId, note), "Fraud reviewer assigned")}>Assign</Button>
            <Button type="button" disabled={!selectedFraudCase?.guidance.canConfirm} onClick={() => selectedFraudCase && void runAction("fraud-confirm", () => fraudDisputesService.confirmFraudCase(selectedFraudCase.id, note), "Fraud case confirmed")}>Confirm</Button>
            <Button type="button" variant="secondary" disabled={!selectedFraudCase?.guidance.canDismiss} onClick={() => selectedFraudCase && void runAction("fraud-dismiss", () => fraudDisputesService.dismissFraudCase(selectedFraudCase.id, note), "Fraud case dismissed")}>Dismiss</Button>
            <Button type="button" variant="danger" disabled={!selectedFraudCase?.guidance.canResolve} onClick={() => selectedFraudCase && void runAction("fraud-resolve", () => fraudDisputesService.resolveFraudCase(selectedFraudCase.id, note), "Fraud case resolved")}>Resolve</Button>
          </div>
          <div className={styles.simulation}>
            <Button type="button" variant="mint" isLoading={pendingAction === "simulate"} onClick={() => void runAction("simulate", async () => setSimulation(await fraudDisputesService.simulateRisk() ?? null), "Fraud risk simulation completed")}>Run Risk Simulation</Button>
            <ProgressBar value={simulation?.riskScore ?? 0} label={simulation ? `${formatLabel(simulation.severity)} risk - ${simulation.confidenceScore}% confidence` : "Simulation output waiting"} showValue tone="trust" />
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Dispute Actions</span>
              <h2>{selectedDispute?.disputeCode || "Select a dispute"}</h2>
            </div>
            <Badge tone={selectedDispute?.priority === "urgent" ? "danger" : "warning"}>{formatLabel(selectedDispute?.status)}</Badge>
          </div>
          {selectedDispute ? (
            <DisputeDetailCard dispute={selectedDispute} />
          ) : (
            <div className={styles.emptyDetail}>
              Select a dispute from the queue to review evidence request, refund, and resolution status.
            </div>
          )}
          <ActionFields reviewerId={reviewerId} note={note} onReviewerChange={setReviewerId} onNoteChange={setNote} />
          <label className={styles.field}>
            <span>Refund Amount</span>
            <input value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} />
          </label>
          <div className={styles.actions}>
            <Button type="button" disabled={!selectedDispute?.guidance.canAssign} onClick={() => selectedDispute && void runAction("dispute-assign", () => fraudDisputesService.assignDispute(selectedDispute.id, reviewerId, note), "Dispute assigned")}>Assign</Button>
            <Button type="button" variant="secondary" disabled={!selectedDispute?.guidance.canRequestEvidence} onClick={() => selectedDispute && void runAction("dispute-evidence", () => fraudDisputesService.requestEvidence(selectedDispute.id, note), "Evidence requested")}>Request Evidence</Button>
            <Button type="button" variant="mint" disabled={!selectedDispute?.guidance.canResolve} onClick={() => selectedDispute && void runAction("dispute-resolve", () => fraudDisputesService.resolveDispute(selectedDispute.id, note, Number(refundAmount) || 0), "Dispute resolved")}>Resolve</Button>
            <Button type="button" variant="danger" disabled={!selectedDispute?.guidance.canReject} onClick={() => selectedDispute && void runAction("dispute-reject", () => fraudDisputesService.rejectDispute(selectedDispute.id, note), "Dispute rejected")}>Reject</Button>
          </div>
        </Card>
      </section>
    </section>
  );
}

function DisputeDetailCard({ dispute }: { dispute: DisputeItem | DisputeDetail }) {
  const detail = "description" in dispute ? dispute : null;
  const resolution = detail?.resolution;
  const resolutionType = typeof resolution?.resolutionType === "string" ? resolution.resolutionType : "not decided";
  const resolutionNote = typeof resolution?.note === "string" ? resolution.note : null;

  return (
    <div className={styles.detailCard}>
      <div>
        <span className={styles.eyebrow}>Issue</span>
        <strong>{dispute.title || formatLabel(dispute.reason)}</strong>
        <p>{detail?.description || "No detailed rider description available yet."}</p>
      </div>
      <div className={styles.detailGrid}>
        <span>
          <small>Evidence</small>
          <strong>{detail?.evidence?.length ?? dispute.evidenceCount} items</strong>
        </span>
        <span>
          <small>Requested Refund</small>
          <strong>{formatCurrency(dispute.requestedRefundAmount ?? 0)}</strong>
        </span>
        <span>
          <small>Next Action</small>
          <strong>{dispute.guidance.nextAction}</strong>
        </span>
        <span>
          <small>Resolution</small>
          <strong>{formatLabel(resolutionType)}</strong>
        </span>
      </div>
      {resolutionNote ? <p className={styles.resolutionNote}>{resolutionNote}</p> : null}
    </div>
  );
}

function ActionFields({
  reviewerId,
  note,
  onReviewerChange,
  onNoteChange
}: {
  reviewerId: string;
  note: string;
  onReviewerChange: (value: string) => void;
  onNoteChange: (value: string) => void;
}) {
  return (
    <div className={styles.formGrid}>
      <label className={styles.field}>
        <span>Reviewer / Owner</span>
        <input value={reviewerId} onChange={(event) => onReviewerChange(event.target.value)} />
      </label>
      <label className={styles.field}>
        <span>Note</span>
        <input value={note} onChange={(event) => onNoteChange(event.target.value)} />
      </label>
    </div>
  );
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const formatLabel = (value: string | null | undefined) =>
  (value || "not_available").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const toneForSeverity = (severity: string | null | undefined) => {
  if (severity === "critical" || severity === "high") {
    return "danger";
  }

  if (severity === "medium") {
    return "warning";
  }

  return "success";
};

const resolveErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Fraud-disputes request failed";
