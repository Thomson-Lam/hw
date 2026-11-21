import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prototypeComponents } from "@/lib/generated/components";
import { getPrototypes, getPublicPrototype } from "@/lib/prototypes";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPrototypes()
    .filter((p) => p.public)
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getPublicPrototype(slug);
  if (!p) return {};
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const base = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `https://${host}` : "http://localhost:3000"));
  const abs = (path: string | null) => (path ? new URL(path, base).toString() : null);
  const image = abs(p.og.image ?? p.thumbnail.dark);
  const video = abs(p.og.video);
  return {
    metadataBase: base,
    title: p.title,
    description: p.description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "video.other",
      title: p.title,
      description: p.description,
      url: `/p/${p.slug}`,
      images: image ? [{ url: image, width: 1200, height: 630, alt: p.title }] : undefined,
      videos: video ? [{ url: video, secureUrl: video, type: "video/mp4", width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      description: p.description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicPrototype({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const load = getPublicPrototype(slug) && prototypeComponents[slug];
  if (!load) notFound();
  const { default: Prototype } = await load();
  return <Prototype />;
}
