const stream = new ReadableStream<Uint8Array>({
  start(controller) {
    controller.enqueue(new Uint8Array([1, 2, 3]));
    controller.close();
  }
});

async function run() {
  const response = new Response(stream);
  const ab = await response.arrayBuffer();
  console.log(Buffer.from(ab).toString('base64'));
}
run();
