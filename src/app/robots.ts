import type { MetadataRoute } from "next";

// 限定公開サイトのため、検索エンジンには一切索引させない。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
