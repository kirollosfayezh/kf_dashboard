import { describe, expect, it } from "vitest";
import { toneForStatus } from "./tone";

describe("toneForStatus", () => {
  it.each([
    ["published", "success"],
    ["replied", "success"],
    ["won", "success"],
    ["scheduled", "warning"],
    ["contacted", "warning"],
    ["new", "danger"],
    ["draft", "neutral"],
    ["something-unknown", "neutral"],
  ] as const)("maps %s to %s", (status, tone) => {
    expect(toneForStatus(status)).toBe(tone);
  });

  it("ignores case", () => {
    expect(toneForStatus("Published")).toBe("success");
  });
});
