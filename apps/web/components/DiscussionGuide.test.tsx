import { render, screen } from "@testing-library/react";
import { DiscussionGuide } from "./DiscussionGuide";
import type { DiscussionGuide as DiscussionGuideType } from "@/lib/openrouter";

const mockDiscussion: DiscussionGuideType = {
  hook: "What if the real villain of this story was the society itself?",
  themes: [
    {
      title: "Power and Corruption",
      insight: "The novel explores how absolute power corrupts absolutely, showing characters who begin with noble intentions but gradually become indistinguishable from the oppressors they fought against.",
      question: "Where do you draw the line between necessary compromise and moral surrender?",
    },
    {
      title: "Identity and Belonging",
      insight: "Through the protagonist's journey, the book examines how identity is shaped by both personal choice and external forces, particularly in times of social upheaval.",
      question: "How much of who we are is truly our own creation?",
    },
  ],
  character_spotlight: {
    character: "Elena",
    analysis: "Elena's arc from idealistic journalist to reluctant revolutionary is the emotional core of the novel. Her internal struggle between truth and survival mirrors the book's central tension.",
    question: "Would you risk everything for the truth, or is survival its own kind of victory?",
  },
  connection_to_reader: "Given your love for morally complex protagonists, Elena's journey will likely resonate with your appreciation for characters who refuse easy categorization.",
  closing_provocation: "Maybe the question isn't who the villain is — but whether we'd do any different.",
};

describe("DiscussionGuide — rendering", () => {
  it("renders the hook text in quotes", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText(/What if the real villain/i)).toBeInTheDocument();
  });

  it("renders all theme titles", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText("Power and Corruption")).toBeInTheDocument();
    expect(screen.getByText("Identity and Belonging")).toBeInTheDocument();
  });

  it("renders all theme insights", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText(/The novel explores how absolute power/i)).toBeInTheDocument();
  });

  it("renders all theme questions", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText(/Where do you draw the line/i)).toBeInTheDocument();
    expect(screen.getByText(/How much of who we are/i)).toBeInTheDocument();
  });

  it("renders the character spotlight name", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText(/Character Spotlight: Elena/i)).toBeInTheDocument();
  });

  it("renders the character analysis", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText(/Elena's arc from idealistic journalist/i)).toBeInTheDocument();
  });

  it("renders the character question", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText(/Would you risk everything/i)).toBeInTheDocument();
  });

  it("renders the connection to reader section", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText("Connection to You")).toBeInTheDocument();
    expect(screen.getByText(/Given your love for morally complex/i)).toBeInTheDocument();
  });

  it("renders the closing provocation", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText(/Maybe the question isn't who the villain/i)).toBeInTheDocument();
  });

  it("renders the Themes to Explore heading", () => {
    render(<DiscussionGuide discussion={mockDiscussion} />);
    expect(screen.getByText("Themes to Explore")).toBeInTheDocument();
  });
});
