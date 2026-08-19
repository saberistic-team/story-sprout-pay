const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

export type ComposeMode = "polish" | "write";

const SYSTEM_PROMPT = `You are a quiet, skilled storyteller helping someone add ONE sentence to a shared fairy-tale.

Rules:
- Return exactly one sentence (rarely two short ones), 8-40 words.
- It must read as a natural continuation of the story so far.
- Warm, literary, slightly magical tone. No headings, quotes, emoji, or commentary.
- Never resolve or end the story; leave room for others to continue.
- Return only the sentence text.`;

export async function composeSentence(input: {
  mode: ComposeMode;
  storySoFar: string;
  roughText: string;
}): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");

  const userPrompt =
    input.mode === "polish"
      ? `The story so far:\n\n${input.storySoFar}\n\nThe writer's rough idea for the next sentence:\n"""${input.roughText}"""\n\nRewrite their idea as polished story prose. Preserve their meaning, events, names and intent exactly — only improve the language.`
      : `The story so far:\n\n${input.storySoFar}\n\n${
          input.roughText.trim()
            ? `The writer wants the next sentence to head in this direction: """${input.roughText}"""`
            : "Write a surprising but fitting next sentence."
        }`;

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) throw new Error("The storyteller is busy. Try again in a moment.");
    if (response.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    throw new Error(`AI request failed [${response.status}]: ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("The storyteller had nothing to say. Try again.");
  return text.replace(/^["']|["']$/g, "").trim();
}
