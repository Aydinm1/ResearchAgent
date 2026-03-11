import { subscribeToSearchRunEvents } from "@/lib/search-run-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encodeEvent(input: { event: string; data: unknown }) {
  return `event: ${input.event}\ndata: ${JSON.stringify(input.data)}\n\n`;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const url = new URL(request.url);
  const filterSearchRunId = url.searchParams.get("searchRunId") || "";

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          encodeEvent({
            event: "connected",
            data: { ok: true }
          })
        )
      );

      const unsubscribe = subscribeToSearchRunEvents((event) => {
        if (filterSearchRunId && event.searchRunId !== filterSearchRunId) {
          return;
        }
        controller.enqueue(
          encoder.encode(
            encodeEvent({
              event: event.type,
              data: event
            })
          )
        );
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Ignore close after abort.
        }
      };

      request.signal.addEventListener("abort", cleanup);
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream"
    }
  });
}
