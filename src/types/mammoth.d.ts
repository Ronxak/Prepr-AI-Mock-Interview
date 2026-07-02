/** Minimal ambient types for mammoth (ships no bundled declarations). */
declare module "mammoth" {
  interface ExtractResult {
    value: string;
    messages: unknown[];
  }
  interface BufferInput {
    buffer: Buffer;
  }
  export function extractRawText(input: BufferInput): Promise<ExtractResult>;
  const mammoth: { extractRawText: typeof extractRawText };
  export default mammoth;
}
