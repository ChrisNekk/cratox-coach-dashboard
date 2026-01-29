import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile recharts and its d3 dependencies to fix module resolution
  transpilePackages: [
    "recharts",
    "victory-vendor",
    "d3-color",
    "d3-interpolate",
    "d3-scale",
    "d3-shape",
    "d3-path",
    "d3-time",
    "d3-time-format",
    "d3-array",
  ],
};

export default nextConfig;
