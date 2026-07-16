import type { BookingHomeForm, FareEstimate } from "./booking.types";

const STORAGE_KEY = "goodRapido.riderRideDraft";

export interface RideFlowDraft {
  form: BookingHomeForm;
  fareEstimate?: FareEstimate | null;
  pricingQuote?: unknown;
  selectedDriver?: unknown;
  booking?: unknown;
  lifecycle?: unknown;
  notificationPlan?: unknown;
  updatedAt: string;
}

export const rideFlowStorage = {
  read(): RideFlowDraft | null {
    const storedValue = sessionStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    try {
      return JSON.parse(storedValue) as RideFlowDraft;
    } catch (_error) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },
  save(draft: RideFlowDraft) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  },
  update(patch: Partial<RideFlowDraft>) {
    const currentDraft = rideFlowStorage.read();

    if (!currentDraft?.form && !patch.form) {
      return null;
    }

    const nextDraft = {
      ...currentDraft,
      ...patch,
      form: patch.form ?? currentDraft?.form,
      updatedAt: new Date().toISOString()
    } as RideFlowDraft;

    rideFlowStorage.save(nextDraft);
    return nextDraft;
  },
  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  }
};
