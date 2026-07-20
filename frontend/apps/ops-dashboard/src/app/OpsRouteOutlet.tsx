import { AdminUsersScreen } from "@/features/admin-users";
import { AnalyticsScreen } from "@/features/analytics";
import { AuthScreen, type OpsLoginForm } from "@/features/auth";
import { CommunicationsScreen } from "@/features/communications";
import { FraudDisputesScreen } from "@/features/fraud-disputes";
import { OverviewScreen } from "@/features/overview";
import { PricingScreen } from "@/features/pricing";
import { RideOpsScreen } from "@/features/ride-ops";
import { TrustSafetyScreen } from "@/features/trust-safety";
import type { OpsRoute } from "@/routes";

export interface OpsRouteOutletProps {
  route: OpsRoute;
  auth: {
    isRestoring: boolean;
    onAuthenticated: () => void;
    onRestoreSession: () => Promise<string>;
    onSignIn: (form: OpsLoginForm) => Promise<string>;
  };
}

export function OpsRouteOutlet({ route, auth }: OpsRouteOutletProps) {
  if (route.id === "auth") {
    return (
      <AuthScreen
        isRestoring={auth.isRestoring}
        onAuthenticated={auth.onAuthenticated}
        onRestoreSession={auth.onRestoreSession}
        onSignIn={auth.onSignIn}
      />
    );
  }

  if (route.id === "overview") {
    return <OverviewScreen />;
  }

  if (route.id === "rideOps") {
    return <RideOpsScreen />;
  }

  if (route.id === "pricing") {
    return <PricingScreen />;
  }

  if (route.id === "trustSafety") {
    return <TrustSafetyScreen />;
  }

  if (route.id === "fraudDisputes") {
    return <FraudDisputesScreen />;
  }

  if (route.id === "communications") {
    return <CommunicationsScreen />;
  }

  if (route.id === "adminUsers") {
    return <AdminUsersScreen />;
  }

  if (route.id === "analytics") {
    return <AnalyticsScreen />;
  }

  return null;
}
