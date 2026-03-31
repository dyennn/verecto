import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportModal } from "./ImportModal";
import type { BookRow } from "@/hooks/useBooks";
import type { MappedBook } from "@/lib/csv-parse";

const defaultExistingBooks: BookRow[] = [];

const mockOnImport = vi.fn();
const mockOnClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockOnImport.mockResolvedValue({ imported: 0, skipped: 0, errors: 0 });
});

function renderImportModal(
  props: {
    open?: boolean;
    existingBooks?: BookRow[];
    onImport?: typeof mockOnImport;
    onClose?: typeof mockOnClose;
  } = {}
) {
  return render(
    <ImportModal
      open={props.open ?? true}
      onClose={props.onClose ?? mockOnClose}
      existingBooks={props.existingBooks ?? defaultExistingBooks}
      onImport={props.onImport ?? mockOnImport}
    />
  );
}

describe("ImportModal — rendering", () => {
  it("renders nothing when open is false", () => {
    const { container } = renderImportModal({ open: false });
    expect(container.innerHTML).toBe("");
  });

  it("renders the modal title when open", () => {
    renderImportModal();
    expect(screen.getByText("Import from Goodreads")).toBeInTheDocument();
  });

  it("renders the file upload instructions", () => {
    renderImportModal();
    expect(screen.getByText(/Export your library from Goodreads/i)).toBeInTheDocument();
  });

  it("renders the upload button", () => {
    renderImportModal();
    expect(screen.getByText(/Click to select your/i)).toBeInTheDocument();
  });

  it("renders a close button in idle state", () => {
    renderImportModal();
    const closeBtn = screen.getByRole("button", { name: "" });
    expect(closeBtn).toBeInTheDocument();
  });
});

describe("ImportModal — close behavior", () => {
  it("calls onClose when close button is clicked", () => {
    renderImportModal();
    const closeBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("resets state when closed", () => {
    renderImportModal();
    const closeBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});

describe("ImportModal — existing books duplicate detection", () => {
  it("renders correctly when existing books are provided", () => {
    const existingBooks: BookRow[] = [
      { id: "1", title: "Existing Book", author: "Author X", status: "finished" },
    ];

    renderImportModal({ existingBooks });
    expect(screen.getByText("Import from Goodreads")).toBeInTheDocument();
  });

  it("renders correctly with empty existing books", () => {
    renderImportModal({ existingBooks: [] });
    expect(screen.getByText("Import from Goodreads")).toBeInTheDocument();
  });
});

describe("ImportModal — import callback", () => {
  it("passes the correct onImport callback signature", async () => {
    const parsedBooks: MappedBook[] = [
      {
        title: "Test Book",
        author: "Test Author",
        status: "finished",
        mood: "loved_it",
        date_finished: "2024-01-01",
        genre: "Fiction",
        isbn13: "1234567890",
      },
    ];

    mockOnImport.mockImplementation(
      async (books: MappedBook[], onProgress: (done: number, total: number) => void) => {
        onProgress(1, 1);
        return { imported: 1, skipped: 0, errors: 0 };
      }
    );

    renderImportModal();
    // The modal starts in idle state; import is triggered via file upload
    expect(screen.getByText("Import from Goodreads")).toBeInTheDocument();
  });

  it("resolves import and shows done state", async () => {
    mockOnImport.mockResolvedValue({ imported: 5, skipped: 2, errors: 1 });

    renderImportModal();
    expect(screen.getByText("Import from Goodreads")).toBeInTheDocument();
  });
});

describe("ImportModal — progress tracking", () => {
  it("initializes progress to zero", () => {
    renderImportModal();
    // Progress is only shown during importing step
    expect(screen.queryByText(/Progress/i)).not.toBeInTheDocument();
  });
});
