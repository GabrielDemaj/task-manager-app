import { describe, expect, it } from "vitest";

import { formatDate } from "@/utils/date";

describe("formatDate", () => {
  it("formats a valid ISO timestamp into a non-empty date string with the year", () => {
    const out = formatDate("2026-06-23T10:00:00.000Z");

    expect(out).not.toBe("");
    // Locale-independent: every locale renders the numeric year.
    expect(out).toContain("2026");
  });

  it("returns an empty string for an unparseable date", () => {
    expect(formatDate("not-a-date")).toBe("");
    expect(formatDate("")).toBe("");
  });
});
