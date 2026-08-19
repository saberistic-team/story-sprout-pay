import { createFileRoute } from "@tanstack/react-router";
import { StoryHeader } from "@/components/StoryHeader";
import { StoryReader } from "@/components/StoryReader";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/story/$nodeId")({
  head: () => ({
    meta: [
      { title: "A branch of the story — Once upon a time" },
      {
        name: "description",
        content:
          "Follow this branch of the collaborative fairy tale and write the sentence that comes next.",
      },
      { property: "og:title", content: "A branch of the story — Once upon a time" },
      {
        property: "og:description",
        content: "Follow this branch and write the sentence that comes next.",
      },
    ],
  }),
  component: StoryBranch,
});

function StoryBranch() {
  const { nodeId } = Route.useParams();

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <StoryHeader />
      <main className="mx-auto max-w-3xl px-4">
        <StoryReader nodeId={nodeId} />
      </main>
    </div>
  );
}
