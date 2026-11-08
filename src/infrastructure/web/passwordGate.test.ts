import { describe, expect, it } from "vitest";
import { isAllowed } from "./passwordGate";

// Hosting (8 Nov 2026): until there are real logins, a hosted copy is protected by one shared password.
// The browser asks for it (HTTP Basic auth); any user name works.

const header = (user: string, password: string) => `Basic ${btoa(`${user}:${password}`)}`;

describe("password gate", () => {
  it("lets everyone in when no password is set (running on your own computer, tests)", () => {
    expect(isAllowed(null, undefined)).toBe(true);
    expect(isAllowed(null, "")).toBe(true);
  });

  it("asks for the password when one is set", () => {
    expect(isAllowed(null, "s3cret")).toBe(false);
  });

  it("lets in the right password, with any user name", () => {
    expect(isAllowed(header("sean", "s3cret"), "s3cret")).toBe(true);
    expect(isAllowed(header("", "s3cret"), "s3cret")).toBe(true);
  });

  it("keeps out a wrong password", () => {
    expect(isAllowed(header("sean", "guess"), "s3cret")).toBe(false);
    expect(isAllowed(header("sean", "s3cret!"), "s3cret")).toBe(false);
  });

  it("allows a colon inside the password", () => {
    expect(isAllowed(header("x", "a:b"), "a:b")).toBe(true);
  });

  it("keeps out anything that isn't Basic auth", () => {
    expect(isAllowed("Bearer abc", "s3cret")).toBe(false);
    expect(isAllowed("Basic !!!not-base64", "s3cret")).toBe(false);
  });
});
