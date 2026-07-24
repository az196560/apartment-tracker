import type { NextConfig } from "next";

const isPagesBuild = process.env.PAGES_BUILD === "true";
const pagesBasePath = "/apartment-tracker";

const nextConfig: NextConfig = {
  output: isPagesBuild ? "export" : undefined,
  basePath: isPagesBuild ? pagesBasePath : "",
  assetPrefix: isPagesBuild ? pagesBasePath : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
