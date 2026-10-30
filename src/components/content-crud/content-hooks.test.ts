// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentItem } from "@/services/domain-types";
import { api } from "@/services/http";
import { EMPTY_FORM, toForm } from "./form-model";
import { useContentEditor } from "./useContentEditor";
import { useContentItems } from "./useContentItems";

vi.mock("@/services/http", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mocked = vi.mocked(api);

const item = (id: string, order: number, published = false): ContentItem => ({
  id,
  slug: id,
  order,
  published,
  title: { en: `Item ${id}`, ar: "" },
  meta: { alt: "seeded" },
  createdAt: "",
  updatedAt: "",
});

const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as React.FormEvent;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useContentItems", () => {
  it("loads the collection sorted by order", async () => {
    mocked.get.mockResolvedValue([item("b", 2), item("a", 1)]);
    const { result } = renderHook(() => useContentItems("projects"));

    expect(result.current.items).toBeNull();
    await waitFor(() => expect(result.current.items?.map((i) => i.id)).toEqual(["a", "b"]));
    expect(mocked.get).toHaveBeenCalledWith("/admin/content/projects");
  });

  it("surfaces a load failure as the error message", async () => {
    mocked.get.mockRejectedValue(new Error("Server down"));
    const { result } = renderHook(() => useContentItems("faqs"));

    await waitFor(() => expect(result.current.error).toBe("Server down"));
    expect(result.current.items).toBeNull();
  });

  it("toggles published with a PATCH and reloads", async () => {
    mocked.get.mockResolvedValue([item("a", 1, false)]);
    mocked.patch.mockResolvedValue({});
    const { result } = renderHook(() => useContentItems("services"));
    await waitFor(() => expect(result.current.items).not.toBeNull());

    await act(() => result.current.togglePublished(result.current.items![0]));

    expect(mocked.patch).toHaveBeenCalledWith("/admin/content/services/a", { published: true });
    expect(mocked.get).toHaveBeenCalledTimes(2);
  });

  it("deletes only after confirmation, then clears the pending item", async () => {
    mocked.get.mockResolvedValue([item("a", 1)]);
    mocked.delete.mockResolvedValue({});
    const { result } = renderHook(() => useContentItems("projects"));
    await waitFor(() => expect(result.current.items).not.toBeNull());

    act(() => result.current.requestDelete(result.current.items![0]));
    expect(mocked.delete).not.toHaveBeenCalled();
    expect(result.current.toDelete?.id).toBe("a");

    await act(() => result.current.confirmDelete());
    expect(mocked.delete).toHaveBeenCalledWith("/admin/content/projects/a");
    expect(result.current.toDelete).toBeNull();
  });

  it("keeps the dialog's item and reports the error when a delete fails", async () => {
    mocked.get.mockResolvedValue([item("a", 1)]);
    mocked.delete.mockRejectedValue(new Error("Forbidden"));
    const { result } = renderHook(() => useContentItems("projects"));
    await waitFor(() => expect(result.current.items).not.toBeNull());

    act(() => result.current.requestDelete(result.current.items![0]));
    await act(() => result.current.confirmDelete());

    expect(result.current.error).toBe("Forbidden");
    expect(result.current.toDelete?.id).toBe("a");
  });
});

describe("useContentEditor", () => {
  const setup = () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const setError = vi.fn();
    const hook = renderHook(() => useContentEditor({ collection: "projects", reload, setError }));
    return { ...hook, reload, setError };
  };

  it("opens on the English tab, whichever tab was last used", () => {
    const { result } = setup();
    act(() => result.current.setActiveLang("ar"));
    act(() => result.current.open(EMPTY_FORM));
    expect(result.current.activeLang).toBe("en");
    expect(result.current.form).toBe(EMPTY_FORM);
  });

  it("creates a new item with a POST, then closes and reloads", async () => {
    mocked.post.mockResolvedValue({});
    const { result, reload } = setup();
    act(() => result.current.open({ ...EMPTY_FORM, slug: "new-one" }));

    const e = submitEvent();
    await act(() => result.current.save(e));

    expect(e.preventDefault).toHaveBeenCalled();
    expect(mocked.post).toHaveBeenCalledWith(
      "/admin/content/projects",
      expect.objectContaining({ slug: "new-one" }),
    );
    expect(mocked.patch).not.toHaveBeenCalled();
    expect(result.current.form).toBeNull();
    expect(result.current.saving).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("updates an existing item with a PATCH that keeps its meta bag", async () => {
    mocked.patch.mockResolvedValue({});
    const { result } = setup();
    act(() => result.current.open(toForm(item("a", 1))));
    act(() => result.current.setLink("demoUrl", "https://demo.example.com"));

    await act(() => result.current.save(submitEvent()));

    expect(mocked.patch).toHaveBeenCalledWith(
      "/admin/content/projects/a",
      expect.objectContaining({
        meta: { alt: "seeded", points: [], demoUrl: "https://demo.example.com" },
      }),
    );
  });

  it("keeps the form open and reports the error when saving fails", async () => {
    mocked.post.mockRejectedValue(new Error("Slug taken"));
    const { result, reload, setError } = setup();
    act(() => result.current.open(EMPTY_FORM));

    await act(() => result.current.save(submitEvent()));

    expect(setError).toHaveBeenLastCalledWith("Slug taken");
    expect(result.current.form).not.toBeNull();
    expect(result.current.saving).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
