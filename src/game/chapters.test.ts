import { describe, it, expect } from "vitest";
import { getChapterForWave, getChapter, CHAPTER_ORDER, CHAPTERS } from "./chapters";
import type { ChapterId } from "./types";

describe("getChapterForWave", () => {
  it("returns space for waves 1-5", () => {
    expect(getChapterForWave(1)).toBe("space");
    expect(getChapterForWave(3)).toBe("space");
    expect(getChapterForWave(5)).toBe("space");
  });

  it("returns asteroid for waves 6-10", () => {
    expect(getChapterForWave(6)).toBe("asteroid");
    expect(getChapterForWave(8)).toBe("asteroid");
    expect(getChapterForWave(10)).toBe("asteroid");
  });

  it("returns carrier for waves 11-15", () => {
    expect(getChapterForWave(11)).toBe("carrier");
    expect(getChapterForWave(15)).toBe("carrier");
  });

  it("returns wormhole for waves 16-20", () => {
    expect(getChapterForWave(16)).toBe("wormhole");
    expect(getChapterForWave(20)).toBe("wormhole");
  });

  it("wraps back to space after wave 20", () => {
    expect(getChapterForWave(21)).toBe("space");
    expect(getChapterForWave(25)).toBe("space");
    expect(getChapterForWave(26)).toBe("asteroid");
  });

  it("clamps wave 0 to space", () => {
    expect(getChapterForWave(0)).toBe("space");
  });

  it("clamps negative waves to space", () => {
    expect(getChapterForWave(-5)).toBe("space");
  });
});

describe("getChapter", () => {
  it("returns the correct definition for each chapter id", () => {
    for (const id of CHAPTER_ORDER) {
      const ch = getChapter(id);
      expect(ch.id).toBe(id);
      expect(ch.name).toBeTruthy();
      expect(ch.bgTop).toMatch(/^#/);
      expect(ch.hazardType).toBeDefined();
    }
  });
});

describe("CHAPTER_ORDER", () => {
  it("has exactly four chapters", () => {
    expect(CHAPTER_ORDER).toHaveLength(4);
  });

  it("contains all defined chapter keys", () => {
    const allKeys = Object.keys(CHAPTERS) as ChapterId[];
    expect(CHAPTER_ORDER.sort()).toEqual(allKeys.sort());
  });
});
