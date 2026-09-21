import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  VenmoVerification,
  normalizeVenmoHandle,
  venmoProfileUrl,
} from "../VenmoVerification";

afterEach(cleanup);

describe("normalizeVenmoHandle", () => {
  it.each([
    [" @rebecca-genack ", "rebecca-genack"],
    ["https://venmo.com/rebecca-genack", "rebecca-genack"],
    ["venmo.com/u/rebecca-genack?utm_source=test", "rebecca-genack"],
    ["https://account.venmo.com/u/rebecca_genack", "rebecca_genack"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeVenmoHandle(input)).toBe(expected);
  });

  it("rejects spaces and non-Venmo URLs", () => {
    expect(() => normalizeVenmoHandle("two people")).toThrow(/only letters/i);
    expect(() => normalizeVenmoHandle("https://example.com/user")).toThrow(/venmo\.com/i);
  });
});

describe("venmoProfileUrl", () => {
  it("builds the canonical profile URL", () => {
    expect(venmoProfileUrl("@Venmo")).toBe("https://account.venmo.com/u/Venmo");
  });
});

describe("VenmoVerification", () => {
  it("previews and confirms a normalized handle", async () => {
    const user = userEvent.setup();
    const onVerified = vi.fn();

    render(<VenmoVerification onVerified={onVerified} />);

    await user.type(screen.getByLabelText("Your Venmo handle"), "@Venmo");
    await user.click(screen.getByRole("button", { name: "Preview account" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTitle("Venmo profile preview for @Venmo")).toHaveAttribute(
      "src",
      "https://account.venmo.com/u/Venmo",
    );

    await user.click(screen.getByRole("button", { name: "Yes, this is my account" }));

    expect(onVerified).toHaveBeenCalledWith("Venmo");
    expect(screen.getByText("Verified as @Venmo")).toBeInTheDocument();
  });

  it("invalidates verification after an edit", async () => {
    const user = userEvent.setup();

    render(<VenmoVerification defaultValue="Venmo" onVerified={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Preview account" }));
    await user.click(screen.getByRole("button", { name: "Yes, this is my account" }));
    await user.type(screen.getByLabelText("Your Venmo handle"), "2");

    expect(screen.queryByText(/Verified as/)).not.toBeInTheDocument();
  });
});
