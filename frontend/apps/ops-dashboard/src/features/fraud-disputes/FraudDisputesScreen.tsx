import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { ConfirmAction, EmptyState, LoadingRows, StatusBanner } from "@/components";
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
  const [fraudFilters, setFraudFilters] = useState({ status: "all", severity: "all", query: "" });
  const [disputeFilters, setDisputeFilters] = useState({ status: "all", priority: "all", query: "" });
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

  const filteredFraudCases = useMemo(() => {
    const query = fraudFilters.query.trim().toLowerCase();

    return fraudCases.filter((fraudCase) => {
      const matchesStatus = fraudFilters.status === "all" || fraudCase.status === fraudFilters.status;
      const matchesSeverity = fraudFilters.severity === "all" || fraudCase.severity === fraudFilters.severity;
      const searchable = [
        fraudCase.caseCode,
        fraudCase.caseType,
        fraudCase.subjectType,
        fraudCase.subjectId,
        fraudCase.subjectLabel,
        fraudCase.guidance.nextAction
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !query || searchable.includes(query);

      return matchesStatus && matchesSeverity && matchesQuery;
    });
  }, [fraudCases, fraudFilters.query, fraudFilters.severity, fraudFilters.status]);

  const filteredDisputes = useMemo(() => {
    const query = disputeFilters.query.trim().toLowerCase();

    return disputes.filter((dispute) => {
      const matchesStatus = disputeFilters.status === "all" || dispute.status === disputeFilters.status;
      const matchesPriority = disputeFilters.priority === "all" || dispute.priority === disputeFilters.priority;
      const searchable = [
        dispute.disputeCode,
        dispute.bookingCode,
        dispute.type,
        dispute.reason,
        dispute.title,
        dispute.guidance.nextAction
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !query || searchable.includes(query);

      return matchesStatus && matchesPriority && matchesQuery;
    });
  }, [disputeFilters.priority, disputeFilters.query, disputeFilters.status, disputes]);

  const hasFraudFilters = fraudFilters.status !== "all" || fraudFilters.severity !== "all" || Boolean(fraudFilters.query.trim());
  const hasDisputeFilters = disputeFilters.status !== "all" || disputeFilters.priority !== "all" || Boolean(disputeFilters.query.trim());

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

      {error ? <StatusBanner tone="danger" title="Fraud and dispute request failed">{error}</StatusBanner> : null}
      {message ? <StatusBanner tone="success" title="Ops action completed">{message}</StatusBanner> : null}

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Fraud Case Queue</span>
              <h2>Risk investigations</h2>
            </div>
            <Badge tone="danger">{filteredFraudCases.length} cases</Badge>
          </div>
          <div className={styles.compactFilters} aria-label="Fraud case filters">
            <SelectField
              label="Status"
              value={fraudFilters.status}
              options={["all", "open", "under_review", "confirmed", "dismissed", "resolved"]}
              onChange={(status) => setFraudFilters((current) => ({ ...current, status }))}
            />
            <SelectField
              label="Severity"
              value={fraudFilters.severity}
              options={["all", "low", "medium", "high", "critical"]}
              onChange={(severity) => setFraudFilters((current) => ({ ...current, severity }))}
            />
            <label className={styles.field}>
              <span>Search</span>
              <input value={fraudFilters.query} placeholder="Case, rider, signal" onChange={(event) => setFraudFilters((current) => ({ ...current, query: event.target.value }))} />
            </label>
            <Button type="button" size="sm" variant="secondary" disabled={!hasFraudFilters} onClick={() => setFraudFilters({ status: "all", severity: "all", query: "" })}>
              Clear
            </Button>
          </div>
          <div className={styles.queue}>
            {isLoading ? <LoadingRows rows={3} columns={3} /> : null}
            {!isLoading ? filteredFraudCases.map((fraudCase) => (
              <button type="button" className={styles.queueItem} key={fraudCase.id} onClick={() => void openFraudCase(fraudCase)}>
                <span>{fraudCase.caseCode || formatLabel(fraudCase.caseType)}</span>
                <strong>{fraudCase.subjectLabel || fraudCase.subjectId}</strong>
                <small>{fraudCase.guidance.nextAction}</small>
                <Badge tone={toneForSeverity(fraudCase.severity)}>{fraudCase.riskScore}% risk</Badge>
              </button>
            )) : null}
            {!isLoading && !filteredFraudCases.length ? (
              <EmptyState
                title={fraudCases.length ? "No fraud cases match these filters" : "No fraud cases found"}
                description={fraudCases.length ? "Clear filters or search with another case, rider, or signal." : "Fraud queue is clean for the selected backend data window."}
                actionLabel={fraudCases.length ? "Clear Filters" : undefined}
                onAction={fraudCases.length ? () => setFraudFilters({ status: "all", severity: "all", query: "" }) : undefined}
              />
            ) : null}
          </div>
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Dispute Queue</span>
              <h2>Evidence and refunds</h2>
            </div>
            <Badge tone="warning">{filteredDisputes.length} disputes</Badge>
          </div>
          <div className={styles.compactFilters} aria-label="Dispute filters">
            <SelectField
              label="Status"
              value={disputeFilters.status}
              options={["all", "submitted", "under_review", "evidence_requested", "resolved", "rejected"]}
              onChange={(status) => setDisputeFilters((current) => ({ ...current, status }))}
            />
            <SelectField
              label="Priority"
              value={disputeFilters.priority}
              options={["all", "low", "medium", "high", "urgent"]}
              onChange={(priority) => setDisputeFilters((current) => ({ ...current, priority }))}
            />
            <label className={styles.field}>
              <span>Search</span>
              <input value={disputeFilters.query} placeholder="Dispute, booking, reason" onChange={(event) => setDisputeFilters((current) => ({ ...current, query: event.target.value }))} />
            </label>
            <Button type="button" size="sm" variant="secondary" disabled={!hasDisputeFilters} onClick={() => setDisputeFilters({ status: "all", priority: "all", query: "" })}>
              Clear
            </Button>
          </div>
          <div className={styles.queue}>
            {isLoading ? <LoadingRows rows={3} columns={3} /> : null}
            {!isLoading ? filteredDisputes.map((dispute) => (
              <button type="button" className={styles.queueItem} key={dispute.id} onClick={() => void openDispute(dispute)}>
                <span>{dispute.disputeCode || formatLabel(dispute.type)}</span>
                <strong>{dispute.title || dispute.bookingCode || dispute.id}</strong>
                <small>{dispute.guidance.nextAction}</small>
                <Badge tone={dispute.priority === "urgent" ? "danger" : "warning"}>{formatLabel(dispute.status)}</Badge>
              </button>
            )) : null}
            {!isLoading && !filteredDisputes.length ? (
              <EmptyState
                title={disputes.length ? "No disputes match these filters" : "No disputes found"}
                description={disputes.length ? "Clear filters or search with another dispute, booking, or reason." : "Dispute queue has no active backend records right now."}
                actionLabel={disputes.length ? "Clear Filters" : undefined}
                onAction={disputes.length ? () => setDisputeFilters({ status: "all", priority: "all", query: "" }) : undefined}
              />
            ) : null}
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
            <Button type="button" disabled={!selectedFraudCase?.guidance.canAssign} isLoading={pendingAction === "fraud-assign"} onClick={() => selectedFraudCase && void runAction("fraud-assign", () => fraudDisputesService.assignFraudCase(selectedFraudCase.id, reviewerId, note), "Fraud reviewer assigned")}>Assign</Button>
            <ConfirmAction label="Confirm" confirmLabel="Confirm Case" disabled={!selectedFraudCase?.guidance.canConfirm} isLoading={pendingAction === "fraud-confirm"} onConfirm={() => selectedFraudCase && void runAction("fraud-confirm", () => fraudDisputesService.confirmFraudCase(selectedFraudCase.id, note), "Fraud case confirmed")} />
            <ConfirmAction label="Dismiss" confirmLabel="Confirm Dismiss" variant="secondary" disabled={!selectedFraudCase?.guidance.canDismiss} isLoading={pendingAction === "fraud-dismiss"} onConfirm={() => selectedFraudCase && void runAction("fraud-dismiss", () => fraudDisputesService.dismissFraudCase(selectedFraudCase.id, note), "Fraud case dismissed")} />
            <ConfirmAction label="Resolve" confirmLabel="Confirm Resolve" variant="danger" disabled={!selectedFraudCase?.guidance.canResolve} isLoading={pendingAction === "fraud-resolve"} onConfirm={() => selectedFraudCase && void runAction("fraud-resolve", () => fraudDisputesService.resolveFraudCase(selectedFraudCase.id, note), "Fraud case resolved")} />
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
            <Button type="button" disabled={!selectedDispute?.guidance.canAssign} isLoading={pendingAction === "dispute-assign"} onClick={() => selectedDispute && void runAction("dispute-assign", () => fraudDisputesService.assignDispute(selectedDispute.id, reviewerId, note), "Dispute assigned")}>Assign</Button>
            <ConfirmAction label="Request Evidence" confirmLabel="Confirm Request" variant="secondary" disabled={!selectedDispute?.guidance.canRequestEvidence} isLoading={pendingAction === "dispute-evidence"} onConfirm={() => selectedDispute && void runAction("dispute-evidence", () => fraudDisputesService.requestEvidence(selectedDispute.id, note), "Evidence requested")} />
            <ConfirmAction label="Resolve" confirmLabel="Confirm Resolve" variant="mint" disabled={!selectedDispute?.guidance.canResolve} isLoading={pendingAction === "dispute-resolve"} onConfirm={() => selectedDispute && void runAction("dispute-resolve", () => fraudDisputesService.resolveDispute(selectedDispute.id, note, Number(refundAmount) || 0), "Dispute resolved")} />
            <ConfirmAction label="Reject" confirmLabel="Confirm Reject" variant="danger" disabled={!selectedDispute?.guidance.canReject} isLoading={pendingAction === "dispute-reject"} onConfirm={() => selectedDispute && void runAction("dispute-reject", () => fraudDisputesService.rejectDispute(selectedDispute.id, note), "Dispute rejected")} />
          </div>
        </Card>
      </section>
    </section>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{formatLabel(option)}</option>
        ))}
      </select>
    </label>
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
