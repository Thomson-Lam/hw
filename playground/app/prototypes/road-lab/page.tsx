import type { Metadata } from "next";
import { RoadLab } from "./road-lab";

export const metadata: Metadata = { title: "Road Lab" };

export default function Page() {
  return <RoadLab />;
}
