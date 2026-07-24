import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, MetricCard, ProgressBar } from "@good-rapido/ui";

import { findOpsRouteById } from "@/routes";
import { pricingOpsService } from "./pricing.service";
import type {
  PricingOptions,
  PricingRule,
  PricingRuleForm,
  PricingRuleListItem,
  PricingSimulation,
  PricingSimulationForm,
  PricingSummary,
  SurgeOptions,
  SurgeRule,
  SurgeRuleForm,
  SurgeRuleListItem,
  SurgeSimulation,
  SurgeSummary
} from "./pricing.types";
import styles from "./PricingScreen.module.css";

const route = findOpsRouteById("pricing");

const fallbackPricingOptions: PricingOptions = {
  vehicleTypes: ["bike", "auto", "cab_economy", "cab_premium"],
  statuses: ["draft", "active", "archived"],
  currency: "INR",
  defaultServiceZone: "default",
  baselineRules: []
};

const fallbackSurgeOptions: SurgeOptions = {
  statuses: ["draft", "scheduled", "active", "paused", "ended", "archived"],
  triggers: ["demand_spike", "driver_shortage", "weather", "event", "traffic", "manual"],
  decisionTypes: ["automatic", "manual"],
  levels: ["normal", "moderate", "high"],
  vehicleTypes: ["bike", "auto", "cab_economy", "cab_premium"],
  defaultServiceZone: "default",
  defaultMaxMultiplier: 1.8,
  defaultCooldownMinutes: 15
};

const emptyPricingSummary: PricingSummary = {
  totalRules: 0,
  draftRules: 0,
  activeRules: 0,
  archivedRules: 0,
  vehicleTypesCovered: [],
  serviceZonesCovered: []
};

const emptySurgeSummary: SurgeSummary = {
  totalRules: 0,
  draftRules: 0,
  scheduledRules: 0,
  activeRules: 0,
  pausedRules: 0,
  endedRules: 0,
  archivedRules: 0,
  highSurgeRules: 0,
  maxMultiplier: 1,
  serviceZonesCovered: []
};

const defaultPricingForm: PricingRuleForm = {
  label: "Kolkata economy cab standard",
  vehicleType: "cab_economy",
  serviceZone: "kolkata",
  baseFare: "60",
  perKm: "18",
  perMinute: "2.5",
  minimumFare: "85",
  platformFee: "18",
  taxRate: "0.05",
  averageSpeedKmph: "26"
};

const defaultSurgeForm: SurgeRuleForm = {
  label: "Kolkata evening demand surge",
  serviceZone: "kolkata",
  vehicleType: "cab_economy",
  trigger: "demand_spike",
  baseMultiplier: "1.35",
  maxMultiplier: "1.8",
  demandScore: "88",
  supplyScore: "25"
};

const defaultSimulationForm: PricingSimulationForm = {
  vehicleType: "cab_economy",
  serviceZone: "kolkata",
  distanceKm: "12.4",
  durationMinutes: "42",
  baseFare: "842",
  demandScore: "88",
  supplyScore: "25"
};

export function PricingScreen() {
  const [pricingOptions, setPricingOptions] = useState<PricingOptions>(fallbackPricingOptions);
  const [surgeOptions, setSurgeOptions] = useState<SurgeOptions>(fallbackSurgeOptions);
  const [pricingSummary, setPricingSummary] = useState<PricingSummary>(emptyPricingSummary);
  const [surgeSummary, setSurgeSummary] = useState<SurgeSummary>(emptySurgeSummary);
  const [pricingRules, setPricingRules] = useState<PricingRuleListItem[]>([]);
  const [surgeRules, setSurgeRules] = useState<SurgeRuleListItem[]>([]);
  const [selectedPricingRule, setSelectedPricingRule] = useState<PricingRule | null>(null);
  const [selectedSurgeRule, setSelectedSurgeRule] = useState<SurgeRule | null>(null);
  const [pricingForm, setPricingForm] = useState<PricingRuleForm>(defaultPricingForm);
  const [surgeForm, setSurgeForm] = useState<SurgeRuleForm>(defaultSurgeForm);
  const [simulationForm, setSimulationForm] = useState<PricingSimulationForm>(defaultSimulationForm);
  const [pricingSimulation, setPricingSimulation] = useState<PricingSimulation | null>(null);
  const [surgeSimulation, setSurgeSimulation] = useState<SurgeSimulation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPricingSurge = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [pricing, surge] = await Promise.all([
        pricingOpsService.loadPricing(),
        pricingOpsService.loadSurge()
      ]);

      setPricingOptions(pricing.options ?? fallbackPricingOptions);
      setSurgeOptions(surge.options ?? fallbackSurgeOptions);
      setPricingSummary(pricing.rules?.summary ?? pricing.dashboard?.summary ?? emptyPricingSummary);
      setSurgeSummary(surge.rules?.summary ?? surge.dashboard?.summary ?? emptySurgeSummary);
      setPricingRules(pricing.rules?.rules ?? pricing.dashboard?.recentRules ?? []);
      setSurgeRules(surge.rules?.rules ?? surge.dashboard?.recentRules ?? []);
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
      setPricingRules([]);
      setSurgeRules([]);
      setPricingSummary(emptyPricingSummary);
      setSurgeSummary(emptySurgeSummary);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPricingSurge();
  }, [loadPricingSurge]);

  useEffect(() => {
    if (pricingOptions.vehicleTypes.includes(pricingForm.vehicleType)) {
      return;
    }

    setPricingForm((current) => ({ ...current, vehicleType: pricingOptions.vehicleTypes[0] ?? "cab_economy" }));
  }, [pricingForm.vehicleType, pricingOptions.vehicleTypes]);

  useEffect(() => {
    if (surgeOptions.vehicleTypes.includes(surgeForm.vehicleType)) {
      return;
    }

    setSurgeForm((current) => ({ ...current, vehicleType: surgeOptions.vehicleTypes[0] ?? "cab_economy" }));
  }, [surgeForm.vehicleType, surgeOptions.vehicleTypes]);

  const totalActiveControls = useMemo(
    () => pricingSummary.activeRules + surgeSummary.activeRules + surgeSummary.scheduledRules,
    [pricingSummary.activeRules, surgeSummary.activeRules, surgeSummary.scheduledRules]
  );

  const runAction = async (actionName: string, action: () => Promise<unknown>, successMessage: string) => {
    setPendingAction(actionName);
    setError(null);
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
      await loadPricingSurge();
    } catch (caughtError) {
      setError(resolveErrorMessage(caughtError));
    } finally {
      setPendingAction(null);
    }
  };

  const openPricingRule = async (rule: PricingRuleListItem) => {
    await runAction(`pricing-detail:${rule.id}`, async () => {
      const detail = await pricingOpsService.getPricingRule(rule.id);
      setSelectedPricingRule(detail ?? null);
      if (detail) {
        setPricingForm(toPricingForm(detail));
      }
    }, `Opened pricing rule ${rule.ruleCode || rule.label}`);
  };

  const openSurgeRule = async (rule: SurgeRuleListItem) => {
    await runAction(`surge-detail:${rule.id}`, async () => {
      const detail = await pricingOpsService.getSurgeRule(rule.id);
      setSelectedSurgeRule(detail ?? null);
      if (detail) {
        setSurgeForm(toSurgeForm(detail));
      }
    }, `Opened surge rule ${rule.surgeCode || rule.label}`);
  };

  const createPricingRule = () => runAction("create-pricing", () => pricingOpsService.createPricingRule(buildPricingPayload(pricingForm)), "Draft pricing rule created");

  const updatePricingRule = () => {
    if (!selectedPricingRule) {
      return;
    }

    void runAction(
      "update-pricing",
      () => pricingOpsService.updatePricingRule(selectedPricingRule.id, {
        label: pricingForm.label,
        serviceZone: pricingForm.serviceZone,
        pricing: buildPricingPayload(pricingForm).pricing,
        notes: "Updated from ops dashboard pricing editor"
      }),
      "Draft pricing rule updated"
    );
  };

  const createSurgeRule = () => runAction("create-surge", () => pricingOpsService.createSurgeRule(buildSurgePayload(surgeForm)), "Surge rule created");

  const updateSurgeRule = () => {
    if (!selectedSurgeRule) {
      return;
    }

    void runAction(
      "update-surge",
      () => pricingOpsService.updateSurgeRule(selectedSurgeRule.id, {
        label: surgeForm.label,
        serviceZone: surgeForm.serviceZone,
        vehicleTypes: [surgeForm.vehicleType],
        trigger: surgeForm.trigger,
        baseMultiplier: toNumber(surgeForm.baseMultiplier),
        maxMultiplier: toNumber(surgeForm.maxMultiplier),
        signals: {
          demandScore: toNumber(surgeForm.demandScore),
          supplyScore: toNumber(surgeForm.supplyScore)
        },
        notes: "Updated from ops dashboard surge editor"
      }),
      "Editable surge rule updated"
    );
  };

  const simulateFareImpact = () => runAction("simulate", async () => {
    const pricingResult = await pricingOpsService.simulatePricing({
      vehicleType: simulationForm.vehicleType,
      serviceZone: simulationForm.serviceZone,
      distanceKm: toNumber(simulationForm.distanceKm),
      durationMinutes: toNumber(simulationForm.durationMinutes)
    });
    const surgeResult = await pricingOpsService.simulateSurge({
      vehicleType: simulationForm.vehicleType,
      serviceZone: simulationForm.serviceZone,
      baseFare: toNumber(simulationForm.baseFare),
      demandScore: toNumber(simulationForm.demandScore),
      supplyScore: toNumber(simulationForm.supplyScore)
    });

    setPricingSimulation(pricingResult ?? null);
    setSurgeSimulation(surgeResult ?? null);
  }, "Fare impact simulation completed");

  return (
    <section className={styles.screen}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Pricing Operations</span>
          <h1>Manage fare rules, surge windows, and transparent rider impact</h1>
          <p>
            Connected with {route.backendModules.join(", ")} for pricing CRUD, surge lifecycle actions,
            simulations, and explainable fare impact previews.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Button type="button" onClick={() => void loadPricingSurge()} isLoading={isLoading}>Refresh Pricing</Button>
          <Badge tone={error ? "danger" : "trust"}>{error ? "Needs auth/data" : "Backend wired"}</Badge>
        </div>
      </section>

      <section className={styles.metrics} aria-label="Pricing and surge summary">
        <MetricCard label="Pricing Rules" value={String(pricingSummary.totalRules)} meta={`${pricingSummary.activeRules} active`} tone="navy" />
        <MetricCard label="Surge Rules" value={String(surgeSummary.totalRules)} meta={`${surgeSummary.activeRules} active`} tone="warning" />
        <MetricCard label="Active Controls" value={String(totalActiveControls)} meta="live + scheduled" tone="trust" />
        <MetricCard label="Max Multiplier" value={`${surgeSummary.maxMultiplier.toFixed(2)}x`} meta={`${surgeSummary.highSurgeRules} high surge`} tone="danger" />
      </section>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      {message ? <div className={styles.successBanner}>{message}</div> : null}

      <section className={styles.workspace}>
        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Pricing Rules CRUD</span>
              <h2>Base fare controls</h2>
            </div>
            <Badge tone="navy">private/pricing</Badge>
          </div>

          <RuleForm
            form={pricingForm}
            vehicleTypes={pricingOptions.vehicleTypes}
            onChange={(patch) => setPricingForm((current) => ({ ...current, ...patch }))}
            onCreate={() => void createPricingRule()}
            onUpdate={updatePricingRule}
            canUpdate={Boolean(selectedPricingRule?.guidance.canEdit)}
            isCreating={pendingAction === "create-pricing"}
            isUpdating={pendingAction === "update-pricing"}
          />

          <div className={styles.ruleList}>
            {pricingRules.map((rule) => (
              <button type="button" key={rule.id} className={styles.ruleCard} onClick={() => void openPricingRule(rule)}>
                <span>{rule.ruleCode || formatLabel(rule.vehicleType)}</span>
                <strong>{rule.label || "Untitled pricing rule"}</strong>
                <small>{formatCurrency(rule.baseFare)} base - {formatCurrency(rule.perKm)}/km - {rule.serviceZone}</small>
                <Badge tone={toneForStatus(rule.status)}>{formatLabel(rule.status)}</Badge>
              </button>
            ))}
            {!pricingRules.length ? <div className={styles.emptyState}>No pricing rules yet. Create a draft rule to begin.</div> : null}
          </div>

          {selectedPricingRule ? (
            <div className={styles.actionRow}>
              <Button
                type="button"
                size="sm"
                disabled={!selectedPricingRule.guidance.canActivate}
                isLoading={pendingAction === "activate-pricing"}
                onClick={() => void runAction("activate-pricing", () => pricingOpsService.activatePricingRule(selectedPricingRule.id), "Pricing rule activated")}
              >
                Activate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!selectedPricingRule.guidance.canArchive}
                isLoading={pendingAction === "archive-pricing"}
                onClick={() => void runAction("archive-pricing", () => pricingOpsService.archivePricingRule(selectedPricingRule.id), "Pricing rule archived")}
              >
                Archive
              </Button>
            </div>
          ) : null}
        </Card>

        <Card padding="lg" className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.eyebrow}>Surge Rules CRUD</span>
              <h2>Demand window controls</h2>
            </div>
            <Badge tone="warning">private/surge</Badge>
          </div>

          <SurgeForm
            form={surgeForm}
            vehicleTypes={surgeOptions.vehicleTypes}
            triggers={surgeOptions.triggers}
            onChange={(patch) => setSurgeForm((current) => ({ ...current, ...patch }))}
            onCreate={() => void createSurgeRule()}
            onUpdate={updateSurgeRule}
            canUpdate={Boolean(selectedSurgeRule?.guidance.canEdit)}
            isCreating={pendingAction === "create-surge"}
            isUpdating={pendingAction === "update-surge"}
          />

          <div className={styles.ruleList}>
            {surgeRules.map((rule) => (
              <button type="button" key={rule.id} className={styles.ruleCard} onClick={() => void openSurgeRule(rule)}>
                <span>{rule.surgeCode || formatLabel(rule.trigger)}</span>
                <strong>{rule.label || "Untitled surge rule"}</strong>
                <small>{rule.currentMultiplier.toFixed(2)}x current - {rule.vehicleTypes.map(formatLabel).join(", ")}</small>
                <Badge tone={toneForStatus(rule.status)}>{formatLabel(rule.status)}</Badge>
              </button>
            ))}
            {!surgeRules.length ? <div className={styles.emptyState}>No surge rules yet. Create a scheduled or draft surge rule.</div> : null}
          </div>

          {selectedSurgeRule ? (
            <div className={styles.actionRow}>
              <Button
                type="button"
                size="sm"
                disabled={!selectedSurgeRule.guidance.canActivate}
                isLoading={pendingAction === "activate-surge"}
                onClick={() => void runAction("activate-surge", () => pricingOpsService.activateSurgeRule(selectedSurgeRule.id), "Surge rule activated")}
              >
                Activate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!selectedSurgeRule.guidance.canPause}
                isLoading={pendingAction === "pause-surge"}
                onClick={() => void runAction("pause-surge", () => pricingOpsService.pauseSurgeRule(selectedSurgeRule.id), "Surge rule paused")}
              >
                Pause
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!selectedSurgeRule.guidance.canEnd}
                isLoading={pendingAction === "end-surge"}
                onClick={() => void runAction("end-surge", () => pricingOpsService.endSurgeRule(selectedSurgeRule.id), "Surge rule ended")}
              >
                End
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={!selectedSurgeRule.guidance.canArchive}
                isLoading={pendingAction === "archive-surge"}
                onClick={() => void runAction("archive-surge", () => pricingOpsService.archiveSurgeRule(selectedSurgeRule.id), "Surge rule archived")}
              >
                Archive
              </Button>
            </div>
          ) : null}
        </Card>
      </section>

      <Card padding="lg" className={styles.simulationPanel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Pricing Simulation</span>
            <h2>Transparent fare impact preview</h2>
          </div>
          <Badge tone="trust">core/pricing-engine</Badge>
        </div>

        <div className={styles.simulationGrid}>
          <SimulationForm
            form={simulationForm}
            vehicleTypes={pricingOptions.vehicleTypes}
            onChange={(patch) => setSimulationForm((current) => ({ ...current, ...patch }))}
            onSimulate={() => void simulateFareImpact()}
            isLoading={pendingAction === "simulate"}
          />

          <div className={styles.preview}>
            <div className={styles.previewHeader}>
              <span>Estimated Total</span>
              <strong>{formatCurrency(pricingSimulation?.simulation.estimatedTotal ?? 0)}</strong>
            </div>
            <div className={styles.previewCards}>
              <div>
                <span>Surge Multiplier</span>
                <strong>{(surgeSimulation?.simulation.multiplier ?? pricingSimulation?.simulation.surge.multiplier ?? 1).toFixed(2)}x</strong>
              </div>
              <div>
                <span>Surge Added</span>
                <strong>{formatCurrency(surgeSimulation?.simulation.fareImpact.addedFare ?? 0)}</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>{pricingSimulation ? "Ready" : "Waiting"}</strong>
              </div>
            </div>
            <ProgressBar
              value={surgeSimulation?.simulation.applied ? 82 : 38}
              label={surgeSimulation?.simulation.guidance.nextAction ?? "Run a simulation to preview rider impact"}
              showValue
              tone="trust"
            />
            <div className={styles.breakdown}>
              {Object.entries(pricingSimulation?.simulation.breakdown ?? {}).slice(0, 8).map(([key, value]) => (
                <div key={key}>
                  <span>{formatLabel(key)}</span>
                  <strong>{typeof value === "number" ? formatCurrency(value) : String(value)}</strong>
                </div>
              ))}
              {!pricingSimulation ? <p>Simulation output will show fare breakdown, surge impact, and explainability guidance here.</p> : null}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

interface RuleFormProps {
  form: PricingRuleForm;
  vehicleTypes: string[];
  onChange: (patch: Partial<PricingRuleForm>) => void;
  onCreate: () => void;
  onUpdate: () => void;
  canUpdate: boolean;
  isCreating: boolean;
  isUpdating: boolean;
}

function RuleForm({ form, vehicleTypes, onChange, onCreate, onUpdate, canUpdate, isCreating, isUpdating }: RuleFormProps) {
  return (
    <div className={styles.formGrid}>
      <TextField label="Label" value={form.label} onChange={(value) => onChange({ label: value })} />
      <SelectField label="Vehicle" value={form.vehicleType} options={vehicleTypes} onChange={(value) => onChange({ vehicleType: value })} />
      <TextField label="Zone" value={form.serviceZone} onChange={(value) => onChange({ serviceZone: value })} />
      <TextField label="Base" value={form.baseFare} onChange={(value) => onChange({ baseFare: value })} />
      <TextField label="Per Km" value={form.perKm} onChange={(value) => onChange({ perKm: value })} />
      <TextField label="Per Min" value={form.perMinute} onChange={(value) => onChange({ perMinute: value })} />
      <TextField label="Minimum" value={form.minimumFare} onChange={(value) => onChange({ minimumFare: value })} />
      <TextField label="Platform Fee" value={form.platformFee} onChange={(value) => onChange({ platformFee: value })} />
      <div className={styles.formActions}>
        <Button type="button" size="sm" onClick={onCreate} isLoading={isCreating}>Create Draft</Button>
        <Button type="button" size="sm" variant="secondary" disabled={!canUpdate} onClick={onUpdate} isLoading={isUpdating}>Update Draft</Button>
      </div>
    </div>
  );
}

interface SurgeFormProps {
  form: SurgeRuleForm;
  vehicleTypes: string[];
  triggers: string[];
  onChange: (patch: Partial<SurgeRuleForm>) => void;
  onCreate: () => void;
  onUpdate: () => void;
  canUpdate: boolean;
  isCreating: boolean;
  isUpdating: boolean;
}

function SurgeForm({ form, vehicleTypes, triggers, onChange, onCreate, onUpdate, canUpdate, isCreating, isUpdating }: SurgeFormProps) {
  return (
    <div className={styles.formGrid}>
      <TextField label="Label" value={form.label} onChange={(value) => onChange({ label: value })} />
      <TextField label="Zone" value={form.serviceZone} onChange={(value) => onChange({ serviceZone: value })} />
      <SelectField label="Vehicle" value={form.vehicleType} options={vehicleTypes} onChange={(value) => onChange({ vehicleType: value })} />
      <SelectField label="Trigger" value={form.trigger} options={triggers} onChange={(value) => onChange({ trigger: value })} />
      <TextField label="Base x" value={form.baseMultiplier} onChange={(value) => onChange({ baseMultiplier: value })} />
      <TextField label="Max x" value={form.maxMultiplier} onChange={(value) => onChange({ maxMultiplier: value })} />
      <TextField label="Demand" value={form.demandScore} onChange={(value) => onChange({ demandScore: value })} />
      <TextField label="Supply" value={form.supplyScore} onChange={(value) => onChange({ supplyScore: value })} />
      <div className={styles.formActions}>
        <Button type="button" size="sm" onClick={onCreate} isLoading={isCreating}>Create Surge</Button>
        <Button type="button" size="sm" variant="secondary" disabled={!canUpdate} onClick={onUpdate} isLoading={isUpdating}>Update Surge</Button>
      </div>
    </div>
  );
}

interface SimulationFormProps {
  form: PricingSimulationForm;
  vehicleTypes: string[];
  onChange: (patch: Partial<PricingSimulationForm>) => void;
  onSimulate: () => void;
  isLoading: boolean;
}

function SimulationForm({ form, vehicleTypes, onChange, onSimulate, isLoading }: SimulationFormProps) {
  return (
    <div className={styles.formGrid}>
      <SelectField label="Vehicle" value={form.vehicleType} options={vehicleTypes} onChange={(value) => onChange({ vehicleType: value })} />
      <TextField label="Zone" value={form.serviceZone} onChange={(value) => onChange({ serviceZone: value })} />
      <TextField label="Distance Km" value={form.distanceKm} onChange={(value) => onChange({ distanceKm: value })} />
      <TextField label="Duration Min" value={form.durationMinutes} onChange={(value) => onChange({ durationMinutes: value })} />
      <TextField label="Base Fare" value={form.baseFare} onChange={(value) => onChange({ baseFare: value })} />
      <TextField label="Demand" value={form.demandScore} onChange={(value) => onChange({ demandScore: value })} />
      <TextField label="Supply" value={form.supplyScore} onChange={(value) => onChange({ supplyScore: value })} />
      <div className={styles.formActions}>
        <Button type="button" onClick={onSimulate} isLoading={isLoading}>Simulate Impact</Button>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
      </select>
    </label>
  );
}

const buildPricingPayload = (form: PricingRuleForm) => ({
  label: form.label,
  description: `${form.label} controlled from ops dashboard`,
  vehicleType: form.vehicleType,
  serviceZone: form.serviceZone,
  pricing: {
    currency: "INR",
    baseFare: toNumber(form.baseFare),
    perKm: toNumber(form.perKm),
    perMinute: toNumber(form.perMinute),
    minimumFare: toNumber(form.minimumFare),
    platformFee: toNumber(form.platformFee),
    taxRate: toNumber(form.taxRate),
    averageSpeedKmph: toNumber(form.averageSpeedKmph)
  },
  surgeRules: {
    eveningPeakMultiplier: 1.32,
    maxSurgeMultiplier: 1.8
  },
  effectiveFrom: new Date().toISOString(),
  notes: "Created from ops dashboard pricing editor"
});

const buildSurgePayload = (form: SurgeRuleForm) => {
  const startsAt = new Date(Date.now() + 30 * 60 * 1000);
  const endsAt = new Date(Date.now() + 150 * 60 * 1000);

  return {
    label: form.label,
    description: `${form.label} controlled from ops dashboard`,
    serviceZone: form.serviceZone,
    vehicleTypes: [form.vehicleType],
    trigger: form.trigger,
    decisionType: "manual",
    baseMultiplier: toNumber(form.baseMultiplier),
    maxMultiplier: toNumber(form.maxMultiplier),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    cooldownMinutes: 15,
    reason: "Demand is higher than available drivers",
    customerMessage: "Fares are higher because demand is currently elevated",
    signals: {
      demandScore: toNumber(form.demandScore),
      supplyScore: toNumber(form.supplyScore),
      activeDrivers: 42,
      pendingRequests: 120
    },
    notes: "Created from ops dashboard surge editor"
  };
};

const toPricingForm = (rule: PricingRule): PricingRuleForm => ({
  label: rule.label || "",
  vehicleType: rule.vehicleType || "cab_economy",
  serviceZone: rule.serviceZone,
  baseFare: String(rule.pricing.baseFare),
  perKm: String(rule.pricing.perKm),
  perMinute: String(rule.pricing.perMinute),
  minimumFare: String(rule.pricing.minimumFare),
  platformFee: String(rule.pricing.platformFee),
  taxRate: String(rule.pricing.taxRate),
  averageSpeedKmph: String(rule.pricing.averageSpeedKmph)
});

const toSurgeForm = (rule: SurgeRule): SurgeRuleForm => ({
  label: rule.label || "",
  serviceZone: rule.serviceZone,
  vehicleType: rule.vehicleTypes[0] || "cab_economy",
  trigger: rule.trigger || "demand_spike",
  baseMultiplier: String(rule.baseMultiplier),
  maxMultiplier: String(rule.maxMultiplier),
  demandScore: String(rule.signals.demandScore),
  supplyScore: String(rule.signals.supplyScore)
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const formatLabel = (value: string | null | undefined) =>
  (value || "not_available").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const toneForStatus = (status: string) => {
  if (status === "active") {
    return "success";
  }

  if (status === "scheduled" || status === "draft") {
    return "warning";
  }

  if (status === "paused" || status === "ended") {
    return "info";
  }

  if (status === "archived") {
    return "neutral";
  }

  return "trust";
};

const toNumber = (value: string) => Number(value) || 0;

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Pricing and surge request failed";
};
