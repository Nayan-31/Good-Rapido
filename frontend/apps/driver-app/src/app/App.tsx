import { DriverAppShell } from "@/layouts";
import { useDriverRouter } from "@/routes";
import { DriverRouteOutlet } from "./DriverRouteOutlet";

export function App() {
  const { route, navigate } = useDriverRouter();

  return (
    <DriverAppShell activeRoute={route} onNavigate={navigate}>
      <DriverRouteOutlet route={route} />
    </DriverAppShell>
  );
}
