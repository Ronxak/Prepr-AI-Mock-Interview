import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages ship native binaries / heavy deps and must run only on the
  // server, never bundled by Turbopack/webpack. fastembed pulls onnxruntime-node
  // (native), and the resume parsers rely on Node built-ins.
  serverExternalPackages: [
    "fastembed",
    "onnxruntime-node",
    "unpdf",
    "mammoth",
    "@deepgram/sdk",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
