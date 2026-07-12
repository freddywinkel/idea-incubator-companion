# Integration Contract: Idea Jar ↔ Business Idea Incubator

**Version:** 1.0
**Date:** 2026-07-12
**Status:** Frozen

## Roles

- **Idea Jar (PWA):** Capture-and-staging companion. Generates local capture IDs. Never assigns official Idea IDs.
- **Business Idea Incubator (ChatGPT Work):** Master portfolio system. Owns `IDEA-###` identifiers, the master workbook, and narrative records.

## Export from Idea Jar to Incubator

### Format: Markdown

File name: `YYYY-MM-DD-business-idea-inbox-v1.md`

Contains:
- Schema version, batch ID, export timestamp
- Processing instructions for ChatGPT Work
- One section per capture with:
  - Local capture ID (`CAP-YYYYMMDD-NNN`)
  - Raw wording (preserved exactly)
  - All user-entered fields
  - Labels distinguishing hypotheses from evidence
  - Handoff state

### Format: JSON (optional machine-readable batch)

File name: `YYYY-MM-DD-business-idea-batch.json`

Schema: `BusinessExport` (see `src/types/index.ts`)

### Processing instructions (embedded in every Markdown export)

> These are unprocessed captures from the Idea Jar companion app. Before changing the Business Idea Incubator, read its operating files and master workbook. For each capture, preserve the raw wording, check the existing portfolio for duplicates or variations, and only then assign the next official `IDEA-###` identifier when appropriate. Create or update the narrative idea record, master workbook row, and update log together. Start new ideas with status `Captured`. Leave unknown cells blank. Do not invent evidence or research and do not research unless explicitly requested. Return a processing-result mapping containing each local capture ID, its outcome, any assigned or matched official Idea ID, and a short note. Give one recommended next action.

## Return from Incubator to Idea Jar

### Format: JSON

Schema: `ProcessingResult` (see `src/types/index.ts`)

```json
{
  "schemaVersion": "1.0",
  "type": "incubator-processing-result",
  "batchId": "UUID",
  "processedAt": "ISO_TIMESTAMP",
  "results": [
    {
      "captureId": "CAP-20260712-001",
      "outcome": "created",
      "ideaId": "IDEA-002",
      "note": "Optional processing note"
    }
  ]
}
```

### Allowed outcomes

- `created` — new official idea created
- `duplicate` — matches an existing idea
- `variation` — related to an existing idea but distinct
- `needs_clarification` — requires more information from the user
- `error` — processing failed

### Validation rules in Idea Jar

- `ideaId` must match `IDEA-[0-9]{3,}` if present
- Never generate an official Idea ID locally
- Preview all changes before applying
- Update fields: `officialIdeaId`, `processingOutcome`, `handoffState`

## Data boundaries

| What | Idea Jar | Incubator |
|------|----------|-----------|
| Raw wording | Owns | Reads, preserves |
| Local capture ID (`CAP-###`) | Generates | Reads |
| Official Idea ID (`IDEA-###`) | Receives | Generates |
| Portfolio status | Receives | Owns |
| Scores, evidence, competitors | Receives | Owns |
| Next actions | Receives | Owns |
| Master workbook | Never edits | Owns |
| Narrative idea record | Never edits | Owns |

## Non-negotiables

1. Idea Jar never assigns official `IDEA-###` identifiers.
2. ChatGPT Work checks for duplicates before assigning new IDs.
3. Unknown business fields remain blank in the Incubator.
4. User’s original raw wording is preserved exactly.
5. Business captures and personal activities remain separate by default.
6. No personal activity is included in a Business Incubator export unless explicitly selected.
