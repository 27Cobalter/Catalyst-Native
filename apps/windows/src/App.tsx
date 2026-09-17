import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "./AppShell";

import "./global.css";

function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

export default App;
