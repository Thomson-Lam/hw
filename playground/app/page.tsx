import { Gallery } from "@/components/playground/gallery";
import { ThemeToggle } from "@/components/playground/theme-toggle";
import { getPrototypes } from "@/lib/prototypes";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Playground</h1>
        <ThemeToggle />
      </header>
      <Gallery prototypes={getPrototypes()} />
    </main>
  );
}
