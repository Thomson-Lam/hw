import type { Metadata } from "next";
import { RoadFeel } from "./road-feel";

export const metadata: Metadata = { title: "Road Feel" };

export default function Page() {
  return <RoadFeel />;
}
