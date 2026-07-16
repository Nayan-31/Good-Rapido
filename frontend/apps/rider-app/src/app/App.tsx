import { RiderAppShell } from "@/layouts";
import { useRiderRouter } from "@/routes";

export function App() {
  const { route, navigate } = useRiderRouter();

  return <RiderAppShell activeRoute={route} onNavigate={navigate} />;
}
