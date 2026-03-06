# COS Editor — Design Intent (Wireframes)

> **Origin:** Extracted from the original `cos_editor-spec.md` (pre-kernel, now deleted).
> The surrounding architecture has evolved — treat as design reference, not spec.
> Current execution authority: `~/dev/NEXUS/vision/cos/COS_EDITOR_CRITICAL_PATH.md`.

## Main Window Layout

```text
+------------------------------------------------------------------+
|  [Book Title]     [Preview v]  [Jobs v]          [Settings G]    |
+------------+-----------------------------+-----------------------+
|            |                             |                       |
|  LEFT      |        CENTER               |       RIGHT           |
|  PANE      |        PANE                 |       PANE            |
|  (resizable|        (fills remaining)    |       (resizable      |
|   width)   |                             |        width,         |
|            |                             |        collapsible)   |
|            |                             |                       |
+------------+-----------------------------+-----------------------+
|  Status: Section 4.1 | v8 | 2,847 words | Saved 12s ago | *    |
+------------------------------------------------------------------+
```

## Left Pane — Navigation (3 Sub-Tabs)

```text
+---------------------------+
| Book Title                |  <- current book header
|                           |
| [Structure] [Outline] [D] |  <- three tabs
|                           |
|  TAB 1: STRUCTURE         |  (Book tree -- VS Code file explorer style)
|  v Part I: The Pattern    |
|    v Ch 1: Nobody Sees    |
|      * The Setup       *  |  <- * = dirty/unsaved indicator
|      * Historical Proof   |
|      * The Receipts       |
|    > Ch 2: ...            |
|  > Part II: ...           |
|                           |
|  TAB 2: OUTLINE           |  (Heading outline of CURRENT section)
|  H2: Why 1929 Matters     |  (Generated from CM6 Lezer syntax tree)
|  H2: The Fed's Role       |  (Clicking jumps editor to that position)
|  H3: Exposed Leverage     |
|                           |
|  TAB 3: CHANGES (D)       |  (Version history)
|  v8     +22w  11:05a      |  (Clicking opens version viewer pane)
|  v7  A +340w  3:12a       |  <- A = agent-sourced version
|  v6     -12w  ystrdy      |
|  v5    +891w  ystrdy      |
+---------------------------+
```

**Structure tab:** `books.structure` JSONB field (lightweight — just IDs and ordering)
**Outline tab:** CM6 Lezer syntax tree of current section (free — already parsed)
**Changes tab:** CAS history filtered by current section

## Center Pane — Editor / Review

### Edit Mode

```text
+-----------------------------------------+
|                                         |
|  CodeMirror 6 Editor                    |
|  (Live Preview -- decorations render    |
|   headings, bold, links, etc. inline    |
|   but clicking reveals raw markdown)    |
|                                         |
|  ## Why 1929 Matters                    |  <- rendered as styled heading
|                                         |
|  The ticker tape machine didn't just    |
|  stutter that morning -- it **choked**. |  <- bold rendered inline
|  Across the floor, traders who had      |
|  seen everything stood frozen...        |
|                                         |
|  > "The market can remain irrational    |  <- blockquote rendered
|  > longer than you can remain solvent"  |
|  > -- attributed to Keynes             |
|                                         |
+-----------------------------------------+
```

### Review Mode (viewing autonomous draft)

```text
+-----------------------------------------+
|  REVIEWING: Ch5 Sec 2 -- Job #12       |
|  +-------------------------------------+|
|  | [Your Outline]         [Agent Draft] ||
|  |                                      ||
|  | (Split view showing what you         ||
|  |  specified vs what agents produced)  ||
|  |                                      ||
|  | Voice Score: 0.87 ========..         ||
|  | Passes: 2                            ||
|  | Receipts Used: 3                     ||
|  +-------------------------------------+|
|                                         |
|  [Accept to Live]  [Edit Then Accept]   |
|  [Send Back]       [Open in Editor]     |
|                                         |
+-----------------------------------------+
```

## Right Pane — Agent Interaction (2 Collapsible Panels)

```text
+-----------------------------+
|                             |
|  DISCUSSION            [x] |  <- collapsible panel
|  Multi-turn conversation    |
|  about writing approach,    |
|  style, structure, ideas    |
|                             |
|  User: I don't want to      |
|  open with "in this         |
|  chapter you'll learn..."   |
|                             |
|  Agent: The authority        |
|  approach would be to        |
|  open in media res...        |
|                             |
|  [Propose Edit]              |
|  [Send to Execution]         |
|  [Keep Discussing]           |
|                             |
|  EXECUTION             [x] |  <- collapsible panel
|  Task-oriented agent         |
|                             |
|  Prompt: [              ]    |
|  [Run]                       |
|                             |
|  +-- Proposed Changes -----+|
|  | - "In this chapter"     ||
|  | + "The ticker tape       ||
|  |   machine stuttered"    ||
|  |                         ||
|  | [Accept] [Reject]       ||
|  | [Edit Before Accept]    ||
|  +-------------------------+|
+-----------------------------+
```

**Discussion -> Execution flow:** Discussion produces an insight -> user clicks "Send to Execution" -> conclusion becomes the execution prompt -> execution agent runs against current buffer -> diff appears -> user accepts/rejects.

## Observer Mode (Watching Autonomous Job)

```text
+-----------------------------+
|                             |
|  JOB PROGRESS               |
|  Ch5 Sec 1  ==========     |
|             review_ready    |
|  Ch5 Sec 2  ====......     |
|             drafting        |
|  Ch5 Sec 3  ..........     |
|             queued          |
|                             |
|  LIVE AGENT OUTPUT          |
|  [Streaming text as the     |
|   drafter writes sec 2      |
|   in real time...]          |
|                             |
|  [Pause] [Intervene]        |
|                             |
|  AGENT COMMS                |
|  Orchestrator -> Research:  |
|  "Sec 2 needs a             |
|   manufacturing story"      |
|                             |
|  Editor -> Drafter:         |
|  "Sec 1 pass 1: good        |
|   bones, transitions need   |
|   work. Sending back."      |
+-----------------------------+
```

## AFK Mode — Job Completion Dashboard

```text
+-------------------------------------------------------------------+
| DRAFT JOBS                                                        |
|                                                                   |
| [done] Ch4 Sections 1-4  Completed 3:47am    [Review]            |
| [wip]  Ch5 Sections 1-3  2/3 in voice pass   [Watch] [Intervene] |
| [wait] Ch6 Sections 1-5  Queued               [Start]            |
|                                                                   |
+-------------------------------------------------------------------+
```

## Clear + Restart Dialog

```text
+-------------------------------------------+
| CLEAR JOB #12                             |
|                                           |
| What to keep from this run:               |
| [x] Research findings (receipts, stories) |
| [ ] Drafted content                       |
| [ ] Voice alignment scores                |
|                                           |
| New instructions:                         |
| +---------------------------------------+ |
| | [Text field for revised direction]    | |
| +---------------------------------------+ |
|                                           |
| [Start New Job]  [Cancel]                 |
+-------------------------------------------+
```
