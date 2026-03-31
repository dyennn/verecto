import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./input";

describe("Input — rendering", () => {
  it("renders an input element", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders with placeholder text", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("renders with default type of text", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input.type).toBe("text");
  });

  it("renders with custom type", () => {
    render(<Input type="email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("applies custom className", () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("custom-class");
  });

  it("applies default Tailwind classes", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("flex");
    expect(input).toHaveClass("rounded-md");
    expect(input).toHaveClass("border");
  });
});

describe("Input — value and onChange", () => {
  it("accepts typed input", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(input).toHaveValue("hello");
  });

  it("calls onChange when value changes", () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "test" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("respects defaultValue prop", () => {
    render(<Input defaultValue="initial" />);
    expect(screen.getByRole("textbox")).toHaveValue("initial");
  });
});

describe("Input — disabled state", () => {
  it("is not disabled by default", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("applies disabled styling classes", () => {
    render(<Input disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("disabled:cursor-not-allowed");
    expect(input).toHaveClass("disabled:opacity-50");
  });
});

describe("Input — focus styles", () => {
  it("has focus-visible ring classes", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("focus-visible:ring-2");
  });
});

describe("Input — ref forwarding", () => {
  it("forwards ref to the input element", () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLElement));
  });
});

describe("Input — accessibility", () => {
  it("has aria-label when provided", () => {
    render(<Input aria-label="Search" />);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("has aria-describedby when provided", () => {
    render(<Input aria-describedby="helper-text" />);
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-describedby",
      "helper-text"
    );
  });
});
