import type { RideFlowDraft } from "@/features/booking/rideFlowStorage";

export const getRideIdFromDraft = (draft: RideFlowDraft | null) => {
  const booking = draft?.booking as { id?: string } | undefined;
  const lifecycle = draft?.lifecycle as { rideId?: string } | undefined;

  return booking?.id ?? lifecycle?.rideId ?? null;
};
