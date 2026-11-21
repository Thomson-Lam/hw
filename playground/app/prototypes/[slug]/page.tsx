import { notFound } from "next/navigation";

// Real prototypes are static folders (app/prototypes/<slug>/page.tsx), which take precedence
// over this dynamic segment. Anything that reaches here is unknown.
export default function UnknownPrototype() {
  notFound();
}
