import { Alert, Badge, Button, Card, ProgressBar, TextField } from "@good-rapido/ui";

import {
  IDENTITY_STATUS_LABELS,
  IDENTITY_STATUS_TONES,
  RIDER_REQUIRED_DOCUMENT_TYPES
} from "./identity.constants";
import type { IdentityDocumentForm } from "./identity.types";
import { getCatalogLabel, resolveCompletionPercent } from "./identity.utils";
import { useIdentityFlow } from "./useIdentityFlow";
import styles from "./IdentityFlow.module.css";

export function IdentityFlow() {
  const {
    identity,
    options,
    documents,
    errors,
    isLoading,
    isSaving,
    isSubmitting,
    message,
    loadError,
    canEdit,
    canSubmit,
    hasOptionalDocumentSlots,
    updateDocument,
    addDocument,
    removeDocument,
    saveDocuments,
    submitIdentity,
    reload
  } = useIdentityFlow();
  const status = identity?.status ?? "draft";
  const completionPercent = resolveCompletionPercent(identity);

  return (
    <section className={styles.root}>
      <Card className={styles.statusCard} variant={status === "verified" ? "mint" : "default"}>
        <div className={styles.statusHeader}>
          <div>
            <p className={styles.eyebrow}>Verification Status</p>
            <h3 className={styles.title}>{identity?.guidance.nextAction ?? "Upload required identity documents"}</h3>
          </div>
          <Badge tone={IDENTITY_STATUS_TONES[status]}>{IDENTITY_STATUS_LABELS[status]}</Badge>
        </div>
        <ProgressBar value={completionPercent} label="Required documents" showValue />
        {identity?.rejectionReason ? (
          <Alert tone="danger" title="Review Required">
            {identity.rejectionReason}
          </Alert>
        ) : null}
      </Card>

      {loadError ? (
        <Alert
          tone="warning"
          title="Identity data unavailable"
          action={
            <Button size="sm" variant="secondary" onClick={() => void reload()}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      ) : null}

      {message ? (
        <Alert tone={message.toLowerCase().includes("failed") ? "danger" : "trust"} title="Identity Update">
          {message}
        </Alert>
      ) : null}

      <div className={styles.sectionHeader}>
        <h3>Documents</h3>
        <Badge tone="trust" size="sm">
          Rider
        </Badge>
      </div>

      {errors.documents ? (
        <Alert tone="danger" title="Missing Documents">
          {errors.documents}
        </Alert>
      ) : null}

      <div className={styles.documentList}>
        {documents.map((document, index) => (
          <IdentityDocumentFormCard
            key={`${document.type}-${index}`}
            document={document}
            documentIndex={index}
            options={options}
            canEdit={canEdit}
            errors={errors.byDocumentIndex[index]}
            canRemove={!RIDER_REQUIRED_DOCUMENT_TYPES.includes(document.type) && canEdit}
            onChange={(patch) => updateDocument(index, patch)}
            onRemove={() => removeDocument(index)}
          />
        ))}
      </div>

      <div className={styles.actions}>
        {hasOptionalDocumentSlots && canEdit ? (
          <Button type="button" variant="secondary" onClick={addDocument}>
            Add Optional Document
          </Button>
        ) : null}
        <Button type="button" variant="mint" isLoading={isSaving || isLoading} disabled={!canEdit} onClick={() => void saveDocuments()}>
          Save Documents
        </Button>
        <Button type="button" isLoading={isSubmitting} disabled={!canSubmit} onClick={() => void submitIdentity()}>
          Submit For Review
        </Button>
      </div>
    </section>
  );
}

interface IdentityDocumentFormCardProps {
  document: IdentityDocumentForm;
  documentIndex: number;
  options: ReturnType<typeof useIdentityFlow>["options"];
  canEdit: boolean;
  canRemove: boolean;
  errors?: Partial<Record<keyof IdentityDocumentForm, string>>;
  onChange: (patch: Partial<IdentityDocumentForm>) => void;
  onRemove: () => void;
}

function IdentityDocumentFormCard({
  document,
  documentIndex,
  options,
  canEdit,
  canRemove,
  errors,
  onChange,
  onRemove
}: IdentityDocumentFormCardProps) {
  return (
    <Card className={styles.documentCard}>
      <div className={styles.documentHeader}>
        <div>
          <p className={styles.eyebrow}>Document {documentIndex + 1}</p>
          <h4>{getCatalogLabel(document.type, options)}</h4>
        </div>
        {canRemove ? (
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        ) : (
          <Badge tone="trust" size="sm">
            Required
          </Badge>
        )}
      </div>

      <label className={styles.selectField}>
        <span>Type</span>
        <select
          value={document.type}
          disabled={!canEdit || RIDER_REQUIRED_DOCUMENT_TYPES.includes(document.type)}
          onChange={(event) => onChange({ type: event.target.value as IdentityDocumentForm["type"] })}
        >
          {options.documentTypeCatalog.map((item) => (
            <option key={item.type} value={item.type}>
              {item.label}
            </option>
          ))}
        </select>
        {errors?.type ? <em>{errors.type}</em> : null}
      </label>

      <div className={styles.grid}>
        <TextField
          label="Holder Name"
          value={document.holderName}
          disabled={!canEdit}
          onChange={(event) => onChange({ holderName: event.target.value })}
        />
        <TextField
          label="Document Number"
          value={document.documentNumber}
          disabled={!canEdit}
          onChange={(event) => onChange({ documentNumber: event.target.value })}
        />
      </div>

      <TextField
        label="File URL"
        value={document.fileUrl}
        error={errors?.fileUrl}
        disabled={!canEdit}
        onChange={(event) => onChange({ fileUrl: event.target.value })}
      />
      <TextField
        label="Back File URL"
        value={document.backFileUrl}
        error={errors?.backFileUrl}
        disabled={!canEdit}
        onChange={(event) => onChange({ backFileUrl: event.target.value })}
      />

      <div className={styles.grid}>
        <TextField
          label="Issued At"
          type="date"
          value={document.issuedAt}
          disabled={!canEdit}
          onChange={(event) => onChange({ issuedAt: event.target.value })}
        />
        <TextField
          label="Expires At"
          type="date"
          value={document.expiresAt}
          error={errors?.expiresAt}
          disabled={!canEdit}
          onChange={(event) => onChange({ expiresAt: event.target.value })}
        />
      </div>

      <TextField
        label="Notes"
        value={document.notes}
        disabled={!canEdit}
        onChange={(event) => onChange({ notes: event.target.value })}
      />
    </Card>
  );
}
