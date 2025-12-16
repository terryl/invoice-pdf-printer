import { kv } from "@vercel/kv";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const headers = { "Content-Type": "application/json" };
  try {
    let memoryCount = 0;
    const getCount = async (): Promise<number> => {
      try {
        const total = await kv.get<number>("invoice_total_count");
        return total ?? memoryCount;
      } catch {
        return memoryCount;
      }
    };
    const addCount = async (delta: number): Promise<number> => {
      try {
        const current = (await kv.get<number>("invoice_total_count")) ?? 0;
        const next = current + delta;
        await kv.set("invoice_total_count", next);
        memoryCount = next;
        return next;
      } catch {
        memoryCount += delta;
        return memoryCount;
      }
    };
    if (req.method === "GET") {
      const total = await getCount();
      return new Response(
        JSON.stringify({ success: true, data: { totalCount: total } }),
        { status: 200, headers }
      );
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const count =
        body && typeof body.count === "number" ? (body.count as number) : null;
      if (count === null || count < 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid count" }),
          { status: 400, headers }
        );
      }
      const next = await addCount(count);
      return new Response(
        JSON.stringify({ success: true, data: { totalCount: next } }),
        { status: 200, headers }
      );
    }
    return new Response(
      JSON.stringify({ success: false, error: "Method Not Allowed" }),
      { status: 405, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: "Internal Server Error" }),
      { status: 500, headers }
    );
  }
}
