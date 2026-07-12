import { afterEach, describe, expect, it } from "vitest";
import { signupEnabled } from "@/lib/config";

describe("signupEnabled (secure default)", () => {
  const original = process.env.ALLOW_SIGNUP;
  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_SIGNUP;
    else process.env.ALLOW_SIGNUP = original;
  });

  it("is OFF when unset — a deployed instance is single-user by default", () => {
    delete process.env.ALLOW_SIGNUP;
    expect(signupEnabled()).toBe(false);
  });

  it("is enabled only by the exact string 'true'", () => {
    process.env.ALLOW_SIGNUP = "true";
    expect(signupEnabled()).toBe(true);
    for (const truthyish of ["1", "TRUE", "yes", "false", ""]) {
      process.env.ALLOW_SIGNUP = truthyish;
      expect(signupEnabled()).toBe(false);
    }
  });
});
