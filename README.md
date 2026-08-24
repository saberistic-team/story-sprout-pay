# Story Weaver (30)

Build a polished, mobile-first MVP web app— a collaborative, branching story platform where people pay to add sentences, branches become increasingly valuable as they grow, and contributors earn royalties when their story becomes valuable.

Core Concept

The entire platform starts with:

“Once upon a time…”

Users collectively write what happens next.

Every contribution creates a new child node, forming a branching story tree.

The experience should feel like a magical interactive storybook, not a financial marketplace.

Story Experience

The main screen should immediately show:

Once upon a time…

Below it, show the current story path as readable prose.

Whenever the reader reaches a fork, show the available continuations as elegant story cards.

Each card should display:

Continuation text

Author

Upvotes

Number of descendants

Current fork price

Continue button

Users can choose any branch and continue reading.

Anyone can read without signing in.

Users must sign in to contribute or vote.

Creating a Fork

At any node, users can choose:

Continue the story

They can:

Write myself

Polish with AI

Write with AI

AI should be able to transform rough user text into polished story prose while preserving the user's intended meaning.

AI-generated contributions should still be treated as contributions by the authenticated user.

Before payment, show the current price clearly.

After successful payment, create the new child node.

Economic System

The core economic mechanic is:

The more valuable a branch becomes, the more expensive it becomes to add another sentence to its higher-level nodes. New unexplored leaves remain inexpensive.

Starting price:

$0.10

Prices should increase dynamically based primarily on the amount of story activity beneath a node.

Node Price

Use this initial pricing formula:

price =
BASE_PRICE × (1 + log2(1 + subtree_size))^1.5


Where:

BASE_PRICE = $0.10
subtree_size = total descendants beneath the node


Round prices to sensible currency increments.

The system should have configurable parameters so the pricing curve can be tuned without rewriting the application.

The important behavior is:

New leaf → approximately $0.10

Small branch → modestly more expensive

Popular branch → increasingly expensive

Major root/ancestor → potentially much more expensive

As people add descendants to a branch, the prices of its ancestors automatically increase.

Existing contributors never have to pay the increased price retroactively.

Store both:

original_price_paid

current_fork_price

Creator Royalties

A portion of every new contribution payment should be distributed to the contributors whose nodes created the valuable path.

Initially allocate:

30% of each contribution payment → Creator Royalty Pool

The remainder can be divided between platform revenue and a future community/story treasury. Make these percentages configurable.

For example:

$1.00 contribution

$0.30 → creator royalty pool
$0.50 → platform
$0.20 → story/community treasury


Royalty Algorithm

Only the nearest 5 ancestors of the newly created node are eligible for royalties.

For each eligible ancestor calculate:

ancestry_weight = e^(-λ × distance)


Use an initial:

λ = 0.5


Also calculate:

popularity_weight = 1 + log(1 + upvotes)


And:

economic_weight = 1 + log(1 + downstream_revenue)


Then:

raw_weight =
    ancestry_weight
    × popularity_weight
    × economic_weight


Normalize all eligible ancestors:

payout_i =
    royalty_pool
    × raw_weight_i
    / sum(all_raw_weights)


This means:

The immediate parent receives the largest ancestry advantage.

Older ancestors can continue earning.

Highly upvoted nodes become more valuable.

Nodes that actually generate downstream economic activity become more valuable.

No single old/root node automatically captures all revenue.

The algorithm must be implemented server-side and every royalty distribution must be recorded in an immutable transaction ledger.

Example

If a user pays $1 to create a new node:

$0.30 Creator Pool


Suppose the eligible ancestors are:

Parent
Grandparent
3rd ancestor
4th ancestor
5th ancestor


Calculate each ancestor's:

distance
upvotes
downstream revenue
raw weight
payout


Show this information in the database and, optionally, in a contributor earnings view.

Voting

Users can upvote story branches.

Votes primarily determine visibility and ranking, not price.

At each fork:

Most upvoted continuation appears first.

Provide sorting options:

Top

New

Trending

Do not allow users to vote multiple times on the same node.

Prevent obvious vote manipulation through authenticated voting and database constraints.

Keep voting separate from the economic pricing algorithm except for its effect on royalty weighting.

Story Tree Data Model

Use PostgreSQL.

Core entities:

Story

id

title

root_node_id

status

created_at

StoryNode

id

story_id

parent_node_id

author_id

content

ai_generated

ai_polished

original_price_paid

current_fork_price

upvote_count

descendant_count

downstream_revenue

depth

created_at

Vote

id

node_id

user_id

created_at

Unique constraint:

(node_id, user_id)


Contribution

Track every payment separately from the node itself:

id

node_id

user_id

amount

currency

payment_provider_id

status

created_at

RoyaltyDistribution

id

contribution_id

source_node_id

recipient_user_id

ancestry_distance

ancestry_weight

popularity_weight

economic_weight

raw_weight

payout_amount

created_at

EarningsLedger

Maintain an append-only financial ledger for creator earnings.

Payments

Use Stripe.

Contribution flow:

Select node
→ Show current price
→ Write/polish/generate contribution
→ Preview
→ Pay
→ Stripe confirmation
→ Create node
→ Calculate royalties
→ Update ancestor statistics
→ Record ledger transactions


Never trust price values supplied by the browser.

The backend must calculate the authoritative price immediately before payment.

Use idempotency protection so payment retries cannot create duplicate contributions or royalties.

Contributor Profile

Create a simple profile showing:

Contributions

Upvotes received

Total earnings

Pending earnings

Story value generated

Most successful branches

Show a simple explanation:

“Your stories earn when people build on them.”

Do not make the product feel like a trading or investment platform. The core experience remains collaborative storytelling.

UI / Visual Design

Create a beautiful literary interface.

Think:

modern digital storybook + collaborative branching narrative

Use:

Warm paper-like backgrounds

Elegant typography

Large readable story text

Subtle animations

Story cards

Branching visual indicators

Magical but restrained visual design

Excellent mobile experience

Avoid making it look like a crypto app, stock market, casino, or complex financial dashboard.

The payment and earnings mechanics should feel secondary to the story.

Landing Page

Hero:

Once upon a time…

Subtitle:

One story. Infinite possibilities.

CTA:

Start Reading

Then show an example branching story.

Explain the concept in three steps:

Read → Choose → Continue

Then explain:

Every sentence creates a new possibility.

And:

If your story becomes valuable, you can earn when others build on it.

MVP Scope

Prioritize a fully functional single public story.

The MVP must support:

Public story reading

Story branching

User authentication

Creating contributions

$0.10 starting price

Dynamic node pricing

Stripe payments

AI writing

AI polishing

Upvotes

Branch ranking

Creator royalties

Earnings ledger

Contributor profiles

Responsive mobile UI

Start with one story rather than a multi-story marketplace.

Design the architecture so multiple stories can be added later.

Important Product Principle

The central loop should feel like:

Read → Discover a fork → Choose a branch → Write something → Pay → Publish → People vote → Branch grows → Node becomes valuable → Creator earns → More people discover the branch.

The product should make users think:

“What if the sentence I write becomes one of the most important sentences in the story?”

Build the MVP around that feeling.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://story-sprout-pay.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f8f3fecd-cc09-4661-aa5d-5f0a2bf7f568).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
