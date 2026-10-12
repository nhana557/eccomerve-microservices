import { expect, test, describe } from "bun:test";
import { cn } from "./utils";

describe("cn Utility Function", () => {
  test("merges plain string class names cleanly", () => {
    expect(cn("px-4", "py-2", "text-sm")).toBe("px-4 py-2 text-sm");
  });

  test("ignores falsy values (false, null, undefined, empty string)", () => {
    expect(cn("px-4", false && "hidden", null, undefined, "", "text-white")).toBe(
      "px-4 text-white"
    );
  });

  test("handles object conditionals properly", () => {
    const isPrimary = true;
    const isDisabled = false;
    expect(
      cn("btn", {
        "bg-emerald-500 text-white": isPrimary,
        "opacity-50 cursor-not-allowed": isDisabled,
      })
    ).toBe("btn bg-emerald-500 text-white");
  });

  test("handles arrays of classes including nested arrays", () => {
    expect(cn(["flex", "items-center"], ["gap-2", ["text-slate-100"]])).toBe(
      "flex items-center gap-2 text-slate-100"
    );
  });

  test("resolves Tailwind CSS conflicts correctly via tailwind-merge", () => {
    // p-2 should be overridden by p-4
    expect(cn("p-2", "p-4")).toBe("p-4");

    // text-red-500 should be overridden by text-emerald-400
    expect(cn("text-red-500", "text-emerald-400")).toBe("text-emerald-400");

    // bg color conflict
    expect(cn("bg-slate-900", "bg-slate-950")).toBe("bg-slate-950");
  });

  test("allows combining scoped class blocks with comments cleanly", () => {
    const isFocused = true;
    const result = cn(
      // Layout & Positioning
      "fixed inset-0 z-50 flex items-center justify-center",
      // Sizing
      "max-w-md w-full",
      // Visual styling
      "bg-slate-900 border border-slate-800 rounded-2xl",
      // State conditional
      isFocused ? "ring-2 ring-emerald-500" : "ring-0"
    );

    expect(result).toBe(
      "fixed inset-0 z-50 flex items-center justify-center max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl ring-2 ring-emerald-500"
    );
  });
});
