export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  category: "Charter" | "Kauf" | "Reiseziele" | "Ratgeber" | "Boot-Typen";
  publishedAt: string;
  readingTimeMin: number;
  cover?: string;
  content: string;
}

export const BLOG_POSTS: BlogPost[] = [];
