import type { FormEvent } from "react";

import { Alert, Badge, Button, ProgressBar, TextField } from "@good-rapido/ui";
import { useDriverOnboarding } from "./useDriverOnboarding";
import styles from "./OnboardingScreen.module.css";

const documentOptions = [
  ["driving_license", "Driving license"],
  ["identity_proof", "Identity proof"],
  ["address_proof", "Address proof"],
  ["profile_photo", "Profile photo"],
  ["bank_proof", "Bank proof"],
  ["police_verification", "Police verification"]
] as const;

const vehicleTypes = [
  ["bike", "Bike"],
  ["auto", "Auto"],
  ["cab_economy", "Economy cab"],
  ["cab_premium", "Premium cab"]
] as const;

export function OnboardingScreen() {
  const onboarding = useDriverOnboarding();
  const workspace = onboarding.workspace;
  const primaryVehicle = workspace?.vehicles?.vehicles.find((vehicle) => vehicle.isPrimary)
    ?? workspace?.vehicles?.vehicles[0]
    ?? null;
  const completion = workspace?.onboarding?.completion.percent ?? 0;
  const documentCompletion = workspace?.documents?.completion.readyRequiredDocuments ?? 0;
  const documentTotal = workspace?.documents?.completion.requiredDocuments ?? 4;

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onboarding.saveProfile();
  };

  const handleDocumentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onboarding.uploadDocument();
  };

  const handleVehicleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onboarding.saveVehicle();
  };

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <Badge tone="info">Step 02</Badge>
          <h1>Driver onboarding</h1>
          <p>Complete profile, documents, vehicle details, and approval checklist before receiving ride requests.</p>
        </div>
        <div className={styles.approvalCard}>
          <span>Approval status</span>
          <strong>{formatStatus(workspace?.approvalStatus ?? "pending")}</strong>
          <small>{workspace?.nextAction ?? "Load onboarding to see next action"}</small>
        </div>
      </section>

      {onboarding.error ? (
        <Alert tone="danger" title="Onboarding update failed">
          {onboarding.error}
        </Alert>
      ) : null}
      {onboarding.message ? (
        <Alert tone="trust" title="Onboarding update">
          {onboarding.message}
        </Alert>
      ) : null}

      <section className={styles.statusGrid}>
        <article className={styles.statusCard}>
          <span>Overall readiness</span>
          <strong>{completion}%</strong>
          <ProgressBar value={completion} tone={completion >= 80 ? "success" : "warning"} />
        </article>
        <article className={styles.statusCard}>
          <span>Required documents</span>
          <strong>{documentCompletion}/{documentTotal}</strong>
          <small>{workspace?.documents?.guidance.nextAction ?? "Upload required documents"}</small>
        </article>
        <article className={styles.statusCard}>
          <span>Vehicle review</span>
          <strong>{formatStatus(primaryVehicle?.status ?? "draft")}</strong>
          <small>{workspace?.vehicles?.guidance.nextAction ?? "Add vehicle details"}</small>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <form className={styles.panel} onSubmit={handleProfileSubmit}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Profile setup</span>
              <h2>Public and service profile</h2>
            </div>
            <Badge tone="trust">{formatStatus(workspace?.profile?.driver?.onboarding.status ?? "not_started")}</Badge>
          </div>
          <div className={styles.formGrid}>
            <TextField
              label="Display name"
              value={onboarding.profileForm.displayName}
              onChange={(event) =>
                onboarding.setProfileForm((current) => ({ ...current, displayName: event.target.value }))
              }
            />
            <TextField
              label="Service zone"
              value={onboarding.profileForm.serviceZone}
              onChange={(event) =>
                onboarding.setProfileForm((current) => ({ ...current, serviceZone: event.target.value }))
              }
            />
            <label className={styles.field}>
              <span>Vehicle type</span>
              <select
                value={onboarding.profileForm.vehicleType}
                onChange={(event) =>
                  onboarding.setProfileForm((current) => ({
                    ...current,
                    vehicleType: event.target.value as typeof onboarding.profileForm.vehicleType
                  }))
                }
              >
                {vehicleTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <TextField
              label="Experience years"
              type="number"
              min="0"
              value={onboarding.profileForm.experienceYears}
              onChange={(event) =>
                onboarding.setProfileForm((current) => ({ ...current, experienceYears: event.target.value }))
              }
            />
            <TextField
              label="Preferred radius km"
              type="number"
              min="1"
              value={onboarding.profileForm.preferredRadiusKm}
              onChange={(event) =>
                onboarding.setProfileForm((current) => ({ ...current, preferredRadiusKm: event.target.value }))
              }
            />
            <TextField
              label="Languages"
              value={onboarding.profileForm.languages}
              onChange={(event) =>
                onboarding.setProfileForm((current) => ({ ...current, languages: event.target.value }))
              }
            />
          </div>
          <label className={styles.field}>
            <span>Driver bio</span>
            <textarea
              value={onboarding.profileForm.bio}
              onChange={(event) => onboarding.setProfileForm((current) => ({ ...current, bio: event.target.value }))}
            />
          </label>
          <Button type="submit" isLoading={onboarding.isSaving}>
            Save profile setup
          </Button>
        </form>

        <form className={styles.panel} onSubmit={handleDocumentSubmit}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Documents</span>
              <h2>Upload verification file URL</h2>
            </div>
            <Badge tone="warning">{formatStatus(workspace?.documents?.status ?? "not_started")}</Badge>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Document type</span>
              <select
                value={onboarding.documentForm.documentType}
                onChange={(event) =>
                  onboarding.setDocumentForm((current) => ({
                    ...current,
                    documentType: event.target.value as typeof onboarding.documentForm.documentType
                  }))
                }
              >
                {documentOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <TextField
              label="Document number"
              value={onboarding.documentForm.documentNumber}
              onChange={(event) =>
                onboarding.setDocumentForm((current) => ({ ...current, documentNumber: event.target.value }))
              }
            />
            <TextField
              label="Holder name"
              value={onboarding.documentForm.holderName}
              onChange={(event) =>
                onboarding.setDocumentForm((current) => ({ ...current, holderName: event.target.value }))
              }
            />
            <TextField
              label="File URL"
              type="url"
              value={onboarding.documentForm.fileUrl}
              onChange={(event) =>
                onboarding.setDocumentForm((current) => ({ ...current, fileUrl: event.target.value }))
              }
            />
            <TextField
              label="Issued at"
              type="date"
              value={onboarding.documentForm.issuedAt}
              onChange={(event) =>
                onboarding.setDocumentForm((current) => ({ ...current, issuedAt: event.target.value }))
              }
            />
            <TextField
              label="Expires at"
              type="date"
              value={onboarding.documentForm.expiresAt}
              onChange={(event) =>
                onboarding.setDocumentForm((current) => ({ ...current, expiresAt: event.target.value }))
              }
            />
          </div>
          <div className={styles.actionRow}>
            <Button type="submit" isLoading={onboarding.isSaving}>
              Upload document
            </Button>
            <Button type="button" variant="secondary" isLoading={onboarding.isSaving} onClick={() => void onboarding.submitDocuments()}>
              Submit documents
            </Button>
          </div>
        </form>

        <form className={styles.panel} onSubmit={handleVehicleSubmit}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Vehicle details</span>
              <h2>Add vehicle for review</h2>
            </div>
            <Badge tone="neutral">{workspace?.vehicles?.summary.totalVehicles ?? 0} saved</Badge>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Vehicle type</span>
              <select
                value={onboarding.vehicleForm.type}
                onChange={(event) =>
                  onboarding.setVehicleForm((current) => ({
                    ...current,
                    type: event.target.value as typeof onboarding.vehicleForm.type
                  }))
                }
              >
                {vehicleTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <TextField label="Make" value={onboarding.vehicleForm.make} onChange={(event) =>
              onboarding.setVehicleForm((current) => ({ ...current, make: event.target.value }))
            } />
            <TextField label="Model" value={onboarding.vehicleForm.model} onChange={(event) =>
              onboarding.setVehicleForm((current) => ({ ...current, model: event.target.value }))
            } />
            <TextField label="Color" value={onboarding.vehicleForm.color} onChange={(event) =>
              onboarding.setVehicleForm((current) => ({ ...current, color: event.target.value }))
            } />
            <TextField label="Registration number" value={onboarding.vehicleForm.registrationNumber} onChange={(event) =>
              onboarding.setVehicleForm((current) => ({ ...current, registrationNumber: event.target.value }))
            } />
            <TextField label="Manufacturing year" type="number" value={onboarding.vehicleForm.manufacturingYear} onChange={(event) =>
              onboarding.setVehicleForm((current) => ({ ...current, manufacturingYear: event.target.value }))
            } />
            <TextField label="Insurance number" value={onboarding.vehicleForm.insuranceNumber} onChange={(event) =>
              onboarding.setVehicleForm((current) => ({ ...current, insuranceNumber: event.target.value }))
            } />
            <TextField label="Insurance expires at" type="date" value={onboarding.vehicleForm.insuranceExpiresAt} onChange={(event) =>
              onboarding.setVehicleForm((current) => ({ ...current, insuranceExpiresAt: event.target.value }))
            } />
          </div>
          <div className={styles.actionRow}>
            <Button type="submit" isLoading={onboarding.isSaving}>
              Save vehicle
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!primaryVehicle?.id}
              isLoading={onboarding.isSaving}
              onClick={() => primaryVehicle?.id ? void onboarding.submitVehicle(primaryVehicle.id) : undefined}
            >
              Submit vehicle
            </Button>
          </div>
        </form>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Approval status</span>
              <h2>Review checklist</h2>
            </div>
            <Badge tone={workspace?.approvalStatus === "approved" ? "success" : "info"}>
              {formatStatus(workspace?.approvalStatus ?? "pending")}
            </Badge>
          </div>
          <div className={styles.stepList}>
            {(workspace?.onboarding?.steps ?? []).map((step) => (
              <div className={styles.stepRow} key={step.key}>
                <span>{step.label}</span>
                <Badge tone={step.status === "completed" ? "success" : step.status === "rejected" ? "danger" : "neutral"}>
                  {formatStatus(step.status)}
                </Badge>
              </div>
            ))}
          </div>
          <Button type="button" variant="mint" isLoading={onboarding.isSaving} onClick={() => void onboarding.submitOnboarding()}>
            Submit onboarding
          </Button>
          {onboarding.isLoading ? <p className={styles.loadingText}>Loading onboarding status...</p> : null}
        </article>
      </section>
    </section>
  );
}

const formatStatus = (value: string) => value.replace(/_/g, " ");
