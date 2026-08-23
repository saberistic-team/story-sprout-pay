import { createFileRoute } from "@tanstack/react-router";
import { StoryHeader } from "@/components/StoryHeader";
import { StoryReader } from "@/components/StoryReader";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { fetchNodeSummary, truncate } from "@/lib/story-data";

const SITE = "https://story-sprout-pay.lovable.app";

export const Route = createFileRoute("/story/$nodeId")({
  loader: ({ params }) => fetchNodeSummary(params.nodeId),
  head: ({ params, loaderData }) => {
    const sentence = loaderData?.content ? truncate(loaderData.content, 70) : null;
    const title = sentence
      ? `“${sentence}” — Once upon a time`
      : "A branch of the story — Once upon a time";
    const description = loaderData
      ? `${truncate(loaderData.content, 110)} — a branch written by ${loaderData.author_name}. Read on, or write the sentence that comes next.`
      : "Follow this branch of the collaborative fairy tale and write the sentence that comes next.";
    const url = `${SITE}/story/${params.nodeId}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
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
