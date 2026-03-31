import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

function renderTabs() {
  return render(
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab One</TabsTrigger>
        <TabsTrigger value="tab2">Tab Two</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content One</TabsContent>
      <TabsContent value="tab2">Content Two</TabsContent>
    </Tabs>
  );
}

describe("Tabs — rendering", () => {
  it("renders all tab triggers", () => {
    renderTabs();
    expect(screen.getByRole("tab", { name: "Tab One" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tab Two" })).toBeInTheDocument();
  });

  it("renders the default tab content", () => {
    renderTabs();
    expect(screen.getByText("Content One")).toBeInTheDocument();
    expect(screen.queryByText("Content Two")).not.toBeInTheDocument();
  });

  it("renders the tablist role", () => {
    renderTabs();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("marks the default tab as selected", () => {
    renderTabs();
    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });
});

describe("Tabs — switching tabs", () => {
  it("shows different content when a tab is clicked", () => {
    renderTabs();
    fireEvent.click(screen.getByRole("tab", { name: "Tab Two" }));
    expect(screen.getByText("Content Two")).toBeInTheDocument();
    expect(screen.queryByText("Content One")).not.toBeInTheDocument();
  });

  it("updates aria-selected when switching tabs", () => {
    renderTabs();
    fireEvent.click(screen.getByRole("tab", { name: "Tab Two" }));
    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("calls onValueChange when a tab is clicked", () => {
    const handleChange = vi.fn();
    render(
      <Tabs defaultValue="tab1" onValueChange={handleChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab One</TabsTrigger>
          <TabsTrigger value="tab2">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content One</TabsContent>
        <TabsContent value="tab2">Content Two</TabsContent>
      </Tabs>
    );
    fireEvent.click(screen.getByRole("tab", { name: "Tab Two" }));
    expect(handleChange).toHaveBeenCalledWith("tab2");
  });
});

describe("Tabs — controlled mode", () => {
  it("respects controlled value prop", () => {
    const { rerender } = render(
      <Tabs value="tab2" onValueChange={() => {}}>
        <TabsList>
          <TabsTrigger value="tab1">Tab One</TabsTrigger>
          <TabsTrigger value="tab2">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content One</TabsContent>
        <TabsContent value="tab2">Content Two</TabsContent>
      </Tabs>
    );
    expect(screen.getByText("Content Two")).toBeInTheDocument();
    expect(screen.queryByText("Content One")).not.toBeInTheDocument();
  });
});

describe("Tabs — styling", () => {
  it("applies active styling to selected tab", () => {
    renderTabs();
    const activeTab = screen.getByRole("tab", { name: "Tab One" });
    expect(activeTab.className).toContain("bg-[var(--card)]");
  });

  it("applies custom className to TabsList", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-class">
          <TabsTrigger value="tab1">Tab One</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole("tablist")).toHaveClass("custom-class");
  });

  it("applies custom className to TabsTrigger", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1" className="trigger-class">Tab One</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveClass("trigger-class");
  });

  it("applies custom className to TabsContent", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab One</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="content-class">Content</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole("tabpanel")).toHaveClass("content-class");
  });
});

describe("Tabs — accessibility", () => {
  it("has tabpanel role on content", () => {
    renderTabs();
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("has focus-visible ring styles", () => {
    renderTabs();
    const tab = screen.getByRole("tab", { name: "Tab One" });
    expect(tab.className).toContain("focus-visible:ring-2");
  });
});
