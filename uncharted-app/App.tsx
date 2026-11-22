import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Road } from "./src/Road";
import { Seed } from "./src/api";
import { Title } from "./src/Title";

if (__DEV__ && Platform.OS === "web") import("react-grab");

export default function App() {
  const [fonts] = useFonts({
    "CossetteTexte-Bold": require("./assets/fonts/CossetteTexte-Bold.ttf"),
    "CossetteTexte-Regular": require("./assets/fonts/CossetteTexte-Regular.ttf"),
    Figtree: require("./assets/fonts/Figtree-Variable.ttf"),
  });
  const [trip, setTrip] = useState<{ seed: Seed; n: number; resume?: string } | null>(null);
  if (!fonts) return <View style={{ flex: 1, backgroundColor: "rgb(97,158,184)" }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: "#1f3a2a" }}>
        {trip ? <Road key={trip.n} seed={trip.seed} resume={trip.resume} restart={() => setTrip(null)} /> : <Title go={(seed) => setTrip({ seed, n: Date.now() })} open={(id) => setTrip({ seed: null, n: Date.now(), resume: id })} />}
      </View>
    </SafeAreaProvider>
  );
}
