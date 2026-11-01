import { beforeEach, describe, expect, it, vi } from "vitest";
import { getToken } from "./session";
import { messageFromEnvelope } from "./api-types";

vi.mock("./session", () => ({ getToken: vi.fn() }));

const ORIGIN = "https://api.test";

/** `SERVER_ORIGIN` is read once at import, so each test imports a fresh copy
 *  of the module under the env it needs. */
async function loadHttp(origin = ORIGIN) {
  vi.stubEnv("VITE_API_BASE_URL", origin);
  vi.resetModules();
  return import("./http");
}

function respond(status: number, body?: unknown) {
  const text = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  return vi.fn().mockResolvedValue(new Response(text, { status }));
}

const envelope = (data: unknown) => ({ success: true, data, errors: [], message: null });

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue("jwt-123");
});

describe("apiRequest", () => {
  it("prefixes /api, strips trailing slashes from the origin and sends the bearer token", async () => {
    const fetchMock = respond(200, envelope([]));
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await loadHttp("https://api.test//");

    await api.get("/admin/content/projects");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/api/admin/content/projects");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer jwt-123");
    expect(init.method).toBe("GET");
  });

  it("unwraps the success envelope", async () => {
    vi.stubGlobal("fetch", respond(200, envelope({ id: "a" })));
    const { api } = await loadHttp();
    await expect(api.get("/x")).resolves.toEqual({ id: "a" });
  });

  it("returns a bare JSON body as-is when there is no envelope", async () => {
    vi.stubGlobal("fetch", respond(200, [1, 2]));
    const { api } = await loadHttp();
    await expect(api.get("/x")).resolves.toEqual([1, 2]);
  });

  it("serialises a JSON body with a Content-Type header", async () => {
    const fetchMock = respond(200, envelope(null));
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await loadHttp();

    await api.patch("/admin/content/projects/a", { published: true });

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe('{"published":true}');
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("passes FormData through untouched so the browser sets the boundary", async () => {
    const fetchMock = respond(200, envelope(null));
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await loadHttp();
    const data = new FormData();
    data.append("file", "x");

    await api.post("/admin/media", data);

    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe(data);
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("skips the token for public calls", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    const fetchMock = respond(200, envelope({ token: "t" }));
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await loadHttp();

    await apiRequest("/admin/auth/login", { method: "POST", auth: false, body: {} });

    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("refuses an authenticated call with no token, without hitting the network", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { api, setUnauthorizedHandler } = await loadHttp();
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(api.get("/admin/me")).rejects.toMatchObject({ status: 401, code: "Auth.SignedOut" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("calls the unauthorized handler on a 401 response", async () => {
    vi.stubGlobal(
      "fetch",
      respond(401, { success: false, data: null, errors: [{ code: "Auth.Expired", message: "Session expired" }], message: null }),
    );
    const { api, setUnauthorizedHandler } = await loadHttp();
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(api.get("/admin/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      code: "Auth.Expired",
      message: "Session expired",
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("treats success:false as an error even on a 200", async () => {
    vi.stubGlobal(
      "fetch",
      respond(200, { success: false, data: null, errors: [{ code: "Content.Invalid", message: "Slug taken" }], message: null }),
    );
    const { api } = await loadHttp();
    await expect(api.post("/admin/content/projects", {})).rejects.toMatchObject({ status: 200, message: "Slug taken" });
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", respond(502, "<html>Bad gateway</html>"));
    const { api } = await loadHttp();
    await expect(api.get("/x")).rejects.toMatchObject({ status: 502, message: "Request failed (502)" });
  });

  it("turns a network failure into a readable ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { api } = await loadHttp();
    await expect(api.get("/x")).rejects.toMatchObject({ status: 0, code: "Network.Unreachable" });
  });

  it("names the missing VITE_API_BASE_URL when a build calls its own static host", async () => {
    const fetchMock = respond(405, "");
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await loadHttp("");

    await expect(api.post("/admin/auth/login", {})).rejects.toMatchObject({
      status: 405,
      code: "Config.MissingApiBaseUrl",
    });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/auth/login");
  });
});

describe("messageFromEnvelope", () => {
  it("joins every error message", () => {
    expect(
      messageFromEnvelope({
        success: false,
        data: null,
        errors: [
          { code: "a", message: "Title is required" },
          { code: "b", message: "" },
          { code: "c", message: "Slug is taken" },
        ],
        message: null,
      }),
    ).toBe("Title is required. Slug is taken");
  });

  it("falls back to the top-level message, then a generic one", () => {
    expect(messageFromEnvelope({ success: false, data: null, errors: [], message: "Nope" })).toBe("Nope");
    expect(messageFromEnvelope({ success: false, data: null, errors: [], message: null })).toBe("Request failed");
    expect(messageFromEnvelope(null)).toBe("Request failed");
  });
});
