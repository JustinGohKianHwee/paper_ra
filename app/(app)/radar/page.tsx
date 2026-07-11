import type { Metadata } from "next";
import { Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Research Radar" };

const PLANNED_PROVIDERS = [
  "arXiv",
  "Semantic Scholar",
  "Crossref",
  "OpenReview",
  "Conference proceedings",
  "Official company and lab research blogs",
];

export default function RadarPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Radar className="size-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold tracking-tight">Research Radar</h1>
        <Badge variant="outline" className="font-normal">
          planned — not yet enabled
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        The Radar will automatically discover recent candidate papers, deduplicate them against your
        library, score their relevance with an auditable rubric, and place them in a review queue.
        Nothing lands in your knowledge base without your explicit approval, and no paper is ever
        automatically marked as read.
      </p>

      <Card className="py-4">
        <CardContent className="space-y-3 px-4 text-sm">
          <div>
            <p className="font-medium">Planned workflow</p>
            <p className="mt-1 text-muted-foreground">
              Fetched candidate → relevance scoring → personal review queue → accept or dismiss →
              reading queue → structured notes → experiment → synthesis.
            </p>
          </div>
          <div>
            <p className="font-medium">Planned providers</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {PLANNED_PROVIDERS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Already in place</p>
            <p className="mt-1 text-muted-foreground">
              The <code className="rounded bg-muted px-1 font-mono text-xs">radar_candidates</code>{" "}
              table, the provider interface (
              <code className="rounded bg-muted px-1 font-mono text-xs">lib/radar/types.ts</code>),
              and the tested scoring rubric and deduplication logic (
              <code className="rounded bg-muted px-1 font-mono text-xs">lib/radar/scoring.ts</code>,{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">lib/radar/dedupe.ts</code>).
              See{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                docs/research-radar-roadmap.md
              </code>{" "}
              for the full design.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
