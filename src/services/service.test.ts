import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { auth: { getSession } },
}));

vi.stubEnv("VITE_API_BASE_URL", "https://api.test");

const { getNotesService, reorderNotesService, updateNoteService } =
  await import("./service");

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

describe("contentList tipado", () => {
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

  it("valida los pensamientos que devuelve GET /notes", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        {
          id: "n1",
          title: "Nota",
          contentList: [
            { id: "t1", type: "text", value: "hola" },
            { id: "i1", type: "image", value: ["u/n1/a.webp"], text: "pie" },
            { id: "bad", type: "image", value: [] },
          ],
          createdAt: null,
          updatedAt: null,
        },
      ]),
    );

    const [note] = await getNotesService();

    expect(note.contentList).toEqual([
      { id: "t1", type: "text", value: "hola" },
      { id: "i1", type: "image", value: ["u/n1/a.webp"], text: "pie" },
    ]);
  });

  it("envía los pensamientos tipados en PUT /notes/:id", async () => {
    const contentList = [
      { id: "i1", type: "image" as const, value: ["u/n1/a.webp"] },
    ];
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        id: "n1",
        userId: "u",
        title: "T",
        contentList,
        createdAt: null,
        updatedAt: null,
      }),
    );

    const result = await updateNoteService("n1", { contentList });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({ contentList });
    expect(result.contentList).toEqual(contentList);
  });
});
