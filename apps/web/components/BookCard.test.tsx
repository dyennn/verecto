import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BookCard } from "@/components/BookCard";

// ---------------------------------------------------------------------------
// next/image is a server component with special loader behaviour that jsdom
// cannot handle. Stub it to a plain <img> so tests focus on BookCard logic.
// ---------------------------------------------------------------------------
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} />,
}));

// ---------------------------------------------------------------------------
// Rendering — required props
// ---------------------------------------------------------------------------
describe("BookCard — rendering", () => {
  it("renders the book title", () => {
    render(<BookCard title="Moby-Dick" author="Herman Melville" coverUrl={null} />);
    expect(screen.getByText("Moby-Dick")).toBeDefined();
  });

  it("renders the author name", () => {
    render(<BookCard title="Dune" author="Frank Herbert" coverUrl={null} />);
    expect(screen.getByText("Frank Herbert")).toBeDefined();
  });

  it("renders 'No Cover' placeholder when coverUrl is null", () => {
    render(<BookCard title="Test" author="Author" coverUrl={null} />);
    expect(screen.getByText("No Cover")).toBeDefined();
  });

  it("renders an img element when coverUrl is provided", () => {
    render(
      <BookCard
        title="Test"
        author="Author"
        coverUrl="https://example.com/cover.jpg"
      />
    );
    const img = screen.getByRole("img");
    expect(img).toBeDefined();
    expect((img as HTMLImageElement).src).toContain("example.com/cover.jpg");
  });

  it("does not render 'No Cover' when coverUrl is provided", () => {
    render(
      <BookCard
        title="Test"
        author="Author"
        coverUrl="https://example.com/cover.jpg"
      />
    );
    expect(screen.queryByText("No Cover")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
describe("BookCard — status badge", () => {
  it("renders 'Want to Read' badge when status is want_to_read", () => {
    render(
      <BookCard
        title="Test"
        author="Author"
        coverUrl={null}
        status="want_to_read"
      />
    );
    expect(screen.getByText("Want to Read")).toBeDefined();
  });

  it("renders 'Reading' badge when status is reading", () => {
    render(
      <BookCard title="Test" author="Author" coverUrl={null} status="reading" />
    );
    expect(screen.getByText("Reading")).toBeDefined();
  });

  it("renders 'Finished' badge when status is finished", () => {
    render(
      <BookCard
        title="Test"
        author="Author"
        coverUrl={null}
        status="finished"
      />
    );
    expect(screen.getByText("Finished")).toBeDefined();
  });

  it("does not render a status badge when status is not provided", () => {
    render(<BookCard title="Test" author="Author" coverUrl={null} />);
    expect(screen.queryByText("Want to Read")).toBeNull();
    expect(screen.queryByText("Reading")).toBeNull();
    expect(screen.queryByText("Finished")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mood badge
// ---------------------------------------------------------------------------
describe("BookCard — mood badge", () => {
  it("renders the loved_it mood badge", () => {
    render(
      <BookCard
        title="Test"
        author="Author"
        coverUrl={null}
        mood="loved_it"
      />
    );
    expect(screen.getByText(/Loved it/)).toBeDefined();
  });

  it("renders the it_was_fine mood badge", () => {
    render(
      <BookCard
        title="Test"
        author="Author"
        coverUrl={null}
        mood="it_was_fine"
      />
    );
    expect(screen.getByText(/It was fine/)).toBeDefined();
  });

  it("renders the dnf mood badge", () => {
    render(
      <BookCard title="Test" author="Author" coverUrl={null} mood="dnf" />
    );
    expect(screen.getByText(/DNF/)).toBeDefined();
  });

  it("does not render a mood badge when mood is null", () => {
    render(
      <BookCard title="Test" author="Author" coverUrl={null} mood={null} />
    );
    expect(screen.queryByText(/Loved it/)).toBeNull();
    expect(screen.queryByText(/It was fine/)).toBeNull();
    expect(screen.queryByText(/DNF/)).toBeNull();
  });

  it("does not render a mood badge when mood is not provided", () => {
    render(<BookCard title="Test" author="Author" coverUrl={null} />);
    expect(screen.queryByText(/Loved it/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Click handler
// ---------------------------------------------------------------------------
describe("BookCard — click handler", () => {
  it("calls onClick when the card is clicked", () => {
    const handleClick = vi.fn();
    render(
      <BookCard
        title="Test"
        author="Author"
        coverUrl={null}
        onClick={handleClick}
      />
    );
    // The Card renders as a div; click the title text
    fireEvent.click(screen.getByText("Test"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not throw when clicked without an onClick prop", () => {
    render(<BookCard title="Test" author="Author" coverUrl={null} />);
    expect(() => fireEvent.click(screen.getByText("Test"))).not.toThrow();
  });
});
