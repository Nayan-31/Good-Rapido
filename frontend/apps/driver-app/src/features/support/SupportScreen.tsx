import { Alert, Badge, Button, TextField } from "@good-rapido/ui";

import { useDriverSupport } from "./useDriverSupport";
import type { DriverSupportTicket } from "./support.types";
import styles from "./SupportScreen.module.css";

const categoryOptions = [
  ["fare_payment", "Fare or payment"],
  ["active_ride", "Active ride help"],
  ["safety", "Safety"],
  ["account_profile", "Account or profile"],
  ["technical_issue", "Technical issue"],
  ["other", "Other help"]
] as const;

const priorityOptions = [
  ["medium", "Medium"],
  ["high", "High"],
  ["urgent", "Urgent"],
  ["low", "Low"]
] as const;

export function SupportScreen() {
  const support = useDriverSupport();
  const view = support.view;

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <Badge tone="danger">Step 10</Badge>
          <h1>Driver support</h1>
          <p>Create support tickets, track ticket history, and review dispute/support health for fare, route, payout, safety, and account issues.</p>
        </div>
        <Button type="button" variant="secondary" isLoading={support.isLoading} onClick={() => void support.reload()}>
          Refresh support
        </Button>
      </section>

      {support.error ? (
        <Alert tone="danger" title="Support failed">
          {support.error}
        </Alert>
      ) : null}
      {support.message ? (
        <Alert tone="trust" title="Support update">
          {support.message}
        </Alert>
      ) : null}
      {view.backendNote ? (
        <Alert tone="info" title="Backend integration note">
          {view.backendNote}
        </Alert>
      ) : null}

      <section className={styles.summaryGrid}>
        <SummaryCard label="Open tickets" value={view.summary.open} />
        <SummaryCard label="Resolved" value={view.summary.resolved} />
        <SummaryCard label="Urgent" value={view.summary.urgent} />
        <SummaryCard label="Disputes" value={view.summary.disputes} />
      </section>

      <section className={styles.layout}>
        <article className={styles.panel}>
          <div>
            <span className={styles.eyebrow}>Ticket create</span>
            <h2>Report a driver issue</h2>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Category</span>
              <select
                value={support.form.category}
                onChange={(event) => support.setForm((current) => ({ ...current, category: event.target.value }))}
              >
                {categoryOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Priority</span>
              <select
                value={support.form.priority}
                onChange={(event) => support.setForm((current) => ({ ...current, priority: event.target.value }))}
              >
                {priorityOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <TextField
            label="Subject"
            value={support.form.subject}
            onChange={(event) => support.setForm((current) => ({ ...current, subject: event.target.value }))}
          />
          <label className={styles.field}>
            <span>Description</span>
            <textarea
              value={support.form.description}
              onChange={(event) => support.setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <Button type="button" variant="mint" isLoading={support.isSaving} onClick={() => void support.createTicket()}>
            Create ticket
          </Button>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Ticket history</span>
              <h2>Recent support cases</h2>
            </div>
            <Badge tone={view.summary.open ? "warning" : "success"}>{view.summary.open} open</Badge>
          </div>
          <div className={styles.ticketList}>
            {view.tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TicketCard({ ticket }: { ticket: DriverSupportTicket }) {
  return (
    <article className={styles.ticketCard}>
      <div className={styles.ticketHeader}>
        <div>
          <span>{ticket.ticketCode}</span>
          <strong>{ticket.subject}</strong>
          <small>{formatStatus(ticket.category)}</small>
        </div>
        <Badge tone={ticket.priority === "urgent" ? "danger" : ticket.priority === "high" ? "warning" : "neutral"}>
          {ticket.priority}
        </Badge>
      </div>
      <div className={styles.ticketFooter}>
        <Badge tone={ticket.status === "resolved" ? "success" : "warning"}>{formatStatus(ticket.status)}</Badge>
        <small>{ticket.messageCount} messages - {ticket.latestActivityAt}</small>
      </div>
    </article>
  );
}

const formatStatus = (value: string) => value.replace(/_/g, " ");
