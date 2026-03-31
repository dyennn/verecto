import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MoodTag } from "@/components/MoodTag";

type Mood = "loved_it" | "it_was_fine" | "dnf";

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("MoodTag — rendering", () => {
  it("renders three mood buttons", () => {
    render(<MoodTag mood={null} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("renders the 'Loved it' button", () => {
    render(<MoodTag mood={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/Loved it/)).toBeDefined();
  });

  it("renders the 'It was fine' button", () => {
    render(<MoodTag mood={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/It was fine/)).toBeDefined();
  });

  it("renders the 'DNF' button", () => {
    render(<MoodTag mood={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/DNF/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Selected state
// ---------------------------------------------------------------------------
describe("MoodTag — selected state", () => {
  it("applies the primary-color class to the selected mood button", () => {
    render(<MoodTag mood="loved_it" onSelect={vi.fn()} />);
    const lovedItBtn = screen
      .getByText(/Loved it/)
      .closest("button") as HTMLButtonElement;
    expect(lovedItBtn.className).toContain("border-[var(--primary)]");
  });

  it("does not apply the primary selected bg class to unselected buttons", () => {
    render(<MoodTag mood="loved_it" onSelect={vi.fn()} />);
    const dnfBtn = screen
      .getByText(/DNF/)
      .closest("button") as HTMLButtonElement;
    // Unselected buttons have bg-[var(--primary)]/10 only on the selected one.
    // The unselected bg class is absent; only the hover prefix contains "/40".
    expect(dnfBtn.className).not.toContain("bg-[var(--primary)]/10");
  });

  it("applies primary class to it_was_fine when that mood is selected", () => {
    render(<MoodTag mood="it_was_fine" onSelect={vi.fn()} />);
    const btn = screen
      .getByText(/It was fine/)
      .closest("button") as HTMLButtonElement;
    expect(btn.className).toContain("border-[var(--primary)]");
  });

  it("applies primary class to dnf when that mood is selected", () => {
    render(<MoodTag mood="dnf" onSelect={vi.fn()} />);
    const btn = screen
      .getByText(/DNF/)
      .closest("button") as HTMLButtonElement;
    expect(btn.className).toContain("border-[var(--primary)]");
  });

  it("no button has the selected bg class when mood is null", () => {
    render(<MoodTag mood={null} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    // The selected state adds bg-[var(--primary)]/10 — this should not appear
    const anySelectedBg = buttons.some((b) =>
      b.className.includes("bg-[var(--primary)]/10")
    );
    expect(anySelectedBg).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------
describe("MoodTag — disabled state", () => {
  it("all buttons are disabled when disabled=true", () => {
    render(<MoodTag mood={null} onSelect={vi.fn()} disabled />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((b) => expect(b).toBeDisabled());
  });

  it("applies opacity-50 class when disabled", () => {
    render(<MoodTag mood={null} onSelect={vi.fn()} disabled />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((b) =>
      expect(b.className).toContain("opacity-50")
    );
  });

  it("buttons are not disabled by default", () => {
    render(<MoodTag mood={null} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((b) => expect(b).not.toBeDisabled());
  });
});

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------
describe("MoodTag — interactions", () => {
  it("calls onSelect with 'loved_it' when that button is clicked", () => {
    const handleSelect = vi.fn();
    render(<MoodTag mood={null} onSelect={handleSelect} />);
    fireEvent.click(screen.getByText(/Loved it/));
    expect(handleSelect).toHaveBeenCalledWith("loved_it");
  });

  it("calls onSelect with 'it_was_fine' when that button is clicked", () => {
    const handleSelect = vi.fn();
    render(<MoodTag mood={null} onSelect={handleSelect} />);
    fireEvent.click(screen.getByText(/It was fine/));
    expect(handleSelect).toHaveBeenCalledWith("it_was_fine");
  });

  it("calls onSelect with 'dnf' when that button is clicked", () => {
    const handleSelect = vi.fn();
    render(<MoodTag mood={null} onSelect={handleSelect} />);
    fireEvent.click(screen.getByText(/DNF/));
    expect(handleSelect).toHaveBeenCalledWith("dnf");
  });

  it("calls onSelect exactly once per click", () => {
    const handleSelect = vi.fn();
    render(<MoodTag mood={null} onSelect={handleSelect} />);
    fireEvent.click(screen.getByText(/DNF/));
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });
});
