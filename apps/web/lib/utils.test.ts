import { cn } from "@/lib/utils";

describe("cn", () => {
  describe("basic merging", () => {
    it("returns an empty string when called with no arguments", () => {
      expect(cn()).toBe("");
    });

    it("returns the class unchanged when given a single class", () => {
      expect(cn("foo")).toBe("foo");
    });

    it("merges multiple class name strings into one space-separated string", () => {
      expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
    });
  });

  describe("falsy / conditional values", () => {
    it("omits false values", () => {
      expect(cn("foo", false, "bar")).toBe("foo bar");
    });

    it("omits null values", () => {
      expect(cn("foo", null, "bar")).toBe("foo bar");
    });

    it("omits undefined values", () => {
      expect(cn("foo", undefined, "bar")).toBe("foo bar");
    });

    it("omits numeric zero", () => {
      // 0 is falsy; clsx treats it as falsy and ignores it
      expect(cn("foo", 0 as unknown as string, "bar")).toBe("foo bar");
    });

    it("omits empty strings", () => {
      expect(cn("foo", "", "bar")).toBe("foo bar");
    });

    it("returns an empty string when all inputs are falsy", () => {
      expect(cn(false, null, undefined, "")).toBe("");
    });
  });

  describe("Tailwind conflict resolution", () => {
    it("resolves conflicting padding utilities — last one wins", () => {
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("resolves conflicting text-color utilities — last one wins", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("resolves conflicting margin utilities — last one wins", () => {
      expect(cn("m-4", "m-8")).toBe("m-8");
    });

    it("keeps non-conflicting utilities from both arguments", () => {
      expect(cn("p-4 text-sm", "m-2")).toBe("p-4 text-sm m-2");
    });

    it("resolves conflicts across multiple arguments correctly", () => {
      // p-4 → p-6 → p-2: the last padding class survives
      expect(cn("p-4", "p-6", "p-2")).toBe("p-2");
    });
  });

  describe("array inputs", () => {
    it("handles a flat array of class names", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("handles nested arrays", () => {
      expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
    });

    it("skips falsy entries inside arrays", () => {
      expect(cn(["foo", false, null, undefined, "bar"])).toBe("foo bar");
    });

    it("resolves Tailwind conflicts that span an array and a plain string", () => {
      expect(cn(["p-4"], "p-2")).toBe("p-2");
    });
  });

  describe("object inputs", () => {
    it("includes keys whose value is true", () => {
      expect(cn({ foo: true, bar: true })).toBe("foo bar");
    });

    it("excludes keys whose value is false", () => {
      expect(cn({ foo: true, bar: false })).toBe("foo");
    });

    it("handles a mix of true and false object entries", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("handles an object combined with plain strings", () => {
      expect(cn("base", { active: true, disabled: false })).toBe(
        "base active"
      );
    });

    it("resolves Tailwind conflicts from object keys", () => {
      // { 'p-4': true } then 'p-2' → p-2 wins
      expect(cn({ "p-4": true }, "p-2")).toBe("p-2");
    });
  });

  describe("mixed input shapes", () => {
    it("combines strings, arrays, and objects in a single call", () => {
      expect(
        cn("base", ["array-class"], { conditional: true, skipped: false })
      ).toBe("base array-class conditional");
    });

    it("resolves conflicts across mixed input shapes", () => {
      expect(
        cn("p-8", ["p-4"], { "p-2": true })
      ).toBe("p-2");
    });
  });
});
