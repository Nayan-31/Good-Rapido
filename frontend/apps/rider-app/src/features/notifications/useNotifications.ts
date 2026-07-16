import { useCallback, useEffect, useState } from "react";

import { ApiClientError } from "@good-rapido/api-client";
import { rideFlowStorage } from "@/features/booking/rideFlowStorage";
import { notificationService } from "./notification.service";
import type { NotificationDeliveryPlan, NotificationPreferences, NotificationSummary, RiderNotification } from "./notification.types";

type ChannelKey = keyof NotificationPreferences["channels"];
type CategoryKey = keyof NotificationPreferences["categories"];

export function useNotifications() {
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [notifications, setNotifications] = useState<RiderNotification[]>([]);
  const [deliveryPlan, setDeliveryPlan] = useState<NotificationDeliveryPlan | null>(
    () => (rideFlowStorage.read()?.notificationPlan as NotificationDeliveryPlan | undefined) ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    const [summaryResult, preferencesResult, listResult] = await Promise.allSettled([
      notificationService.getSummary(),
      notificationService.getPreferences(),
      notificationService.list()
    ]);

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value.data?.summary ?? null);
    }

    if (preferencesResult.status === "fulfilled") {
      setPreferences(preferencesResult.value.data?.preferences ?? null);
    }

    if (listResult.status === "fulfilled") {
      setNotifications(listResult.value.data?.notifications ?? listResult.value.data?.history ?? []);
    }

    if (summaryResult.status === "rejected" && preferencesResult.status === "rejected" && listResult.status === "rejected") {
      setMessage(resolveErrorMessage(summaryResult.reason));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const planSafetyDelivery = useCallback(async () => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await notificationService.planSafetyDelivery(preferences);
      const nextPlan = response.data?.plan ?? null;

      setDeliveryPlan(nextPlan);
      setMessage(response.message);

      if (nextPlan) {
        rideFlowStorage.update({
          notificationPlan: nextPlan
        });
      }
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }, [preferences]);

  const toggleChannel = useCallback(async (channel: ChannelKey, enabled: boolean) => {
    if (!preferences) {
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const nextChannels = {
        ...preferences.channels,
        [channel]: enabled
      };
      const response = await notificationService.updatePreferences({
        channels: nextChannels
      });

      setPreferences(response.data?.preferences ?? {
        ...preferences,
        channels: nextChannels
      });
      setMessage(response.message);
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }, [preferences]);

  const toggleCategory = useCallback(async (category: CategoryKey, enabled: boolean) => {
    if (!preferences) {
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const nextCategories = {
        ...preferences.categories,
        [category]: enabled
      };
      const response = await notificationService.updatePreferences({
        categories: nextCategories
      });

      setPreferences(response.data?.preferences ?? {
        ...preferences,
        categories: nextCategories
      });
      setMessage(response.message);
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }, [preferences]);

  const markRead = useCallback(async (notificationId: string) => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await notificationService.markRead(notificationId);
      setMessage(response.message);
      await loadNotifications();
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }, [loadNotifications]);

  const markAllRead = useCallback(async () => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await notificationService.markAllRead();
      setMessage(response.message);
      await loadNotifications();
    } catch (error) {
      setMessage(resolveErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }, [loadNotifications]);

  return {
    summary,
    preferences,
    notifications,
    deliveryPlan,
    isLoading,
    isUpdating,
    message,
    loadNotifications,
    planSafetyDelivery,
    toggleChannel,
    toggleCategory,
    markRead,
    markAllRead
  };
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Notification request failed";
};
