import { createFileRoute } from "@tanstack/react-router";
import { StoryHeader } from "@/components/StoryHeader";
import { StoryReader } from "@/components/StoryReader";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/story/")({
  head: () => ({
    meta: [
      { title: "Read the story — Once upon a time" },
      {
        name: "description",
        content:
          "Read a branching fairy tale written one paid sentence at a time, then choose which path to follow.",
      },
      { property: "og:title", content: "Read the story — Once upon a time" },
      {
        property: "og:description",
        content: "A branching fairy tale written one sentence at a time by everyone.",
      },
    ],
  }),
  component: StoryIndex,
});

function StoryIndex() {
  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <StoryHeader />
      <main className="mx-auto max-w-3xl px-4">
        <StoryReader />
      </main>
    </div>
  );
}
