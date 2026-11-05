import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { auth: { getSession } },
}));

vi.stubEnv("VITE_API_BASE_URL", "https://api.test");

const { reorderNotesService } = await import("./service");

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

describe("reorderNotesService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "token-123" } },
      error: null,
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("hace PUT a /notes/order con los ids y el token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ids: ["b", "a"] }));

    const result = await reorderNotesService(["b", "a"]);

    expect(result).toEqual({ ids: ["b", "a"] });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/notes/order");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body as string)).toEqual({ ids: ["b", "a"] });
    expect(new Headers(options.headers).get("Authorization")).toBe(
      "Bearer token-123",
    );
  });

  it("propaga el mensaje de error del backend", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { message: "Alguna nota no existe", statusCode: 400 }),
    );

    await expect(reorderNotesService(["x"])).rejects.toThrow(
      "Alguna nota no existe",
    );
  });
});
