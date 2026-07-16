import { RiderAppShell } from "@/layouts";
import { useRiderRouter } from "@/routes";
import { RiderRouteOutlet } from "./RiderRouteOutlet";

export function App() {
  const { route, navigate } = useRiderRouter();

  return (
    <RiderAppShell activeRoute={route} onNavigate={navigate}>
      <RiderRouteOutlet route={route} />
    </RiderAppShell>
  );
}
