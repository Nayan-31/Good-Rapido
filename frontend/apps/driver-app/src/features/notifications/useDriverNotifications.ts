import { useCallback, useEffect, useMemo, useState } from "react";

import { driverNotificationsService, emptyNotificationsView } from "./notifications.service";
import type { DriverNotificationsView } from "./notifications.types";

export function useDriverNotifications() {
  const [view, setView] = useState<DriverNotificationsView>(emptyNotificationsView);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setView(await driverNotificationsService.loadNotifications());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedNotification = useMemo(() => (
    view.notifications.find((notification) => notification.id === view.selectedNotificationId) ?? view.notifications[0] ?? null
  ), [view.notifications, view.selectedNotificationId]);

  const selectNotification = (notificationId: string) => {
    setView((current) => ({
      ...current,
      selectedNotificationId: notificationId
    }));
  };

  const markSelectedRead = useCallback(async () => {
    if (!selectedNotification) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    const backendNote = await driverNotificationsService.markRead(selectedNotification.id);

    setView((current) => {
      const notifications = current.notifications.map((notification) => (
        notification.id === selectedNotification.id
          ? { ...notification, status: "read" as const }
          : notification
      ));

      return {
        ...current,
        notifications,
        summary: {
          total: notifications.length,
          unread: notifications.filter((notification) => notification.status === "unread").length,
          urgent: notifications.filter((notification) => notification.priority === "urgent").length,
          rideAlerts: notifications.filter((notification) => notification.category.includes("ride")).length
        },
        backendNote: backendNote ?? current.backendNote
      };
    });
    setMessage("Notification marked read.");
    setIsSaving(false);
  }, [selectedNotification]);

  return {
    view,
    selectedNotification,
    message,
    error,
    isLoading,
    isSaving,
    reload: load,
    selectNotification,
    markSelectedRead
  };
}
