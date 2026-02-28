import { Mistral } from '@mistralai/mistralai';
async function test() {
  const fileStream = new ReadableStream<Uint8Array>();
  const response = new Response(fileStream as any);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
}
