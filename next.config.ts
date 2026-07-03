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
  // onnxruntime-node's libonnxruntime.so.1 is loaded dynamically at runtime
  // (not via a static require Next.js's file tracer can see), so on Vercel
  // it gets silently dropped from the serverless bundle without this.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/onnxruntime-node/bin/napi-v3/linux/**/*"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
