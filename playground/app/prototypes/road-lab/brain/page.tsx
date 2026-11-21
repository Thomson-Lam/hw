import type { Metadata } from "next";
import { BrainView } from "./brain-view";

export const metadata: Metadata = { title: "Road Lab · Brain" };

export default function Page() {
  return <BrainView />;
}
