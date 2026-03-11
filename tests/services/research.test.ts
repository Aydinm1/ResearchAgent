import { describe, expect, it } from "vitest";
import { filterExistingCandidates } from "@/lib/services/research";

describe("filterExistingCandidates", () => {
  it("skips labs that already exist in findings or opportunities", () => {
    const candidates = [
      {
        title: "BASC Lab",
        url: "https://basclab.faculty.ucdavis.edu/",
        source: "BASC Lab (basclab.faculty.ucdavis.edu)",
        snippet: "Existing lab",
        candidateName: "BASC Lab"
      },
      {
        title: "Neurocognitive Imaging Lab",
        url: "https://example.ucdavis.edu/neurocog",
        source: "UC Davis",
        snippet: "New lab",
        candidateName: "Neurocognitive Imaging Lab"
      },
      {
        title: "Media Lab",
        url: "https://media-lab.ucdavis.edu",
        source: "UC Davis",
        snippet: "Existing opportunity",
        candidateName: "Media Lab"
      }
    ];

    const result = filterExistingCandidates(
      "lab",
      candidates,
      [
        {
          targetType: "lab",
          candidateName: "BASC Lab",
          title: "BASC Lab",
          url: "https://basclab.faculty.ucdavis.edu"
        }
      ],
      [
        {
          targetType: "lab",
          name: "Media Lab"
        }
      ]
    );

    expect(result.freshCandidates).toHaveLength(1);
    expect(result.freshCandidates[0]?.candidateName).toBe("Neurocognitive Imaging Lab");
    expect(result.skippedCandidates).toHaveLength(2);
  });

  it("skips startups that share the same host even if the path differs", () => {
    const result = filterExistingCandidates(
      "startup",
      [
        {
          title: "Acme Careers",
          url: "https://acme.com/careers",
          source: "Acme",
          snippet: "Hiring page",
          candidateName: "Acme"
        },
        {
          title: "Neuronix",
          url: "https://neuronix.ai/jobs",
          source: "Neuronix",
          snippet: "Fresh startup",
          candidateName: "Neuronix"
        }
      ],
      [
        {
          targetType: "startup",
          candidateName: "Acme",
          title: "Acme",
          url: "https://www.acme.com"
        }
      ],
      []
    );

    expect(result.freshCandidates).toHaveLength(1);
    expect(result.freshCandidates[0]?.candidateName).toBe("Neuronix");
    expect(result.skippedCandidates).toHaveLength(1);
    expect(result.skippedCandidates[0]?.candidateName).toBe("Acme");
  });
});
