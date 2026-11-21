export type PrototypeMeta = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  hidden: boolean;
  public: boolean;
  thumbnail: { light: string | null; dark: string | null };
  og: { image: string | null; video: string | null };
};
