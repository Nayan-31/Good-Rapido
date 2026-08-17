import { useCallback, useEffect, useState } from "react";

import { defaultSupportForm, driverSupportService, emptySupportView } from "./support.service";
import type { DriverSupportForm, DriverSupportView } from "./support.types";

export function useDriverSupport() {
  const [view, setView] = useState<DriverSupportView>(emptySupportView);
  const [form, setForm] = useState<DriverSupportForm>(defaultSupportForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setView(await driverSupportService.loadSupport());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load support center");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createTicket = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const result = await driverSupportService.createTicket(form);
      setView((current) => ({
        ...current,
        tickets: [result.ticket, ...current.tickets],
        summary: {
          ...current.summary,
          open: current.summary.open + 1,
          urgent: result.ticket.priority === "urgent" ? current.summary.urgent + 1 : current.summary.urgent
        },
        backendNote: result.backendNote ?? current.backendNote
      }));
      setMessage("Support ticket created.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create support ticket");
    } finally {
      setIsSaving(false);
    }
  }, [form]);

  return {
    view,
    form,
    setForm,
    message,
    error,
    isLoading,
    isSaving,
    reload: load,
    createTicket
  };
}
