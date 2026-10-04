import { describe, expect, it } from "vitest";
import { useStdioTransport } from "../src/transport.js";

describe("transport", () => {
  it("uses stdio when stdin is not a terminal", () => {
    expect(useStdioTransport({ isTTY: true })).toBe(false);
    expect(useStdioTransport({ isTTY: false })).toBe(true);
    expect(useStdioTransport({})).toBe(true);
  });
});
