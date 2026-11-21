import type { Metadata } from "next";
import { RoadScroll } from "./road-scroll";

export const metadata: Metadata = { title: "Road Scroll" };

export default function Page() {
  return <RoadScroll />;
}
