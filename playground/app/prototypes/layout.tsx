import { BackLink } from "@/components/playground/back-link";

export default function PrototypesLayout({ children }: LayoutProps<"/prototypes">) {
  return (
    <>
      <BackLink />
      {children}
    </>
  );
}
