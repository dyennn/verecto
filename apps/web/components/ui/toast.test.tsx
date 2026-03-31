import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./toast";

function TestConsumer() {
  const { toast } = useToast();
  return (
    <div>
      <button
        onClick={() =>
          toast({ title: "Success", description: "Operation completed" })
        }
      >
        Show Toast
      </button>
      <button
        onClick={() =>
          toast({
            title: "Error",
            description: "Something went wrong",
            variant: "destructive",
          })
        }
      >
        Show Error Toast
      </button>
      <button onClick={() => toast({ title: "Title only" })}>
        Show Title Only
      </button>
      <button onClick={() => toast({ description: "Description only" })}>
        Show Description Only
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestConsumer />
    </ToastProvider>
  );
}

describe("ToastProvider — rendering", () => {
  it("renders children", () => {
    renderWithProvider();
    expect(screen.getByText("Show Toast")).toBeInTheDocument();
  });

  it("does not show any toasts initially", () => {
    renderWithProvider();
    expect(screen.queryByText("Success")).not.toBeInTheDocument();
  });
});

describe("useToast — showing toasts", () => {
  it("shows a toast with title and description", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Operation completed")).toBeInTheDocument();
  });

  it("shows a destructive toast", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Show Error Toast"));
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows a toast with title only", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Show Title Only"));
    expect(screen.getByText("Title only")).toBeInTheDocument();
  });

  it("shows a toast with description only", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Show Description Only"));
    expect(screen.getByText("Description only")).toBeInTheDocument();
  });

  it("can show multiple toasts simultaneously", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Show Toast"));
    fireEvent.click(screen.getByText("Show Title Only"));
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Title only")).toBeInTheDocument();
  });
});

describe("useToast — dismissing toasts", () => {
  it("dismisses a toast when close button is clicked", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Success")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Success")).not.toBeInTheDocument();
  });
});

describe("useToast — auto-dismiss", () => {
  it("auto-dismisses a toast after 4 seconds", async () => {
    vi.useFakeTimers();
    renderWithProvider();
    fireEvent.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Success")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Success")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe("useToast — context defaults", () => {
  it("provides a no-op toast when used outside ToastProvider", () => {
    function OutsideConsumer() {
      const { toast } = useToast();
      return (
        <button onClick={() => toast({ title: "Test" })}>Click</button>
      );
    }
    render(<OutsideConsumer />);
    expect(() => fireEvent.click(screen.getByText("Click"))).not.toThrow();
  });
});
