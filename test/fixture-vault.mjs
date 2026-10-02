/**
 * Builds a throwaway novel vault for the tests.
 *
 * The suite used to need a real vault (AI_REVIEW_VAULT / vaults.local.json) and wrote its
 * fixtures into it — including an `rm -rf .ai-review` on teardown. This builds the same shape
 * in a temp directory instead, so `npm test` runs anywhere, deterministically, and can never
 * damage someone's notes.
 *
 * Shape (matches DEFAULT_SETTINGS of the fork):
 *   outline.md, worldview.md (index), worldview/00..03, characters/, events/, skills/,
 *   chapters/, principles/ — 41 files inside the review scope, one template per folder.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

export const CHARACTER_TEMPLATE = `# Character template

## Core identity
- **Name**:
- **Role**: protagonist / heroine / villain / mentor / confidant / extra
- **Age**:

## Appearance
- **Build**:
- **Marks**:

## Background
- **Origin**:

## Motivation
- **Wants**:

## Relationships
- **Family**:

## Abilities
- **Cultivation**:

## Arc
- **Turning point**:

## Voice
- **Verbal tic**:

## Open questions
- none
`;

const EVENT_TEMPLATE = `# Event template

## Basics
- **Title**:
- **When**:
- **Where**:

## Participants
- **Cast**:

## Consequences
- **Changes**:
`;

const SKILL_TEMPLATE = `# Skill template

## Basics
- **Skill**:
- **Tier**:

## Effect
- **Does**:

## Cost
- **Price**:
`;

const CHAPTER_TEMPLATE = `# Chapter template

## Metadata
- **Status**:
- **Words**:

## Summary
- **One line**:

## Beats
- **Opening**:
`;

/** Blockquote fields: the principle cards carry their id in a callout, not in a bullet list */
const PRINCIPLE_TEMPLATE = `# Principle template

## Identity
> Principle ID:
> Tier:

## Rule
- **Scope**:
`;

function character(name, role, age) {
	return `# ${name}

## Core identity
- **Name**: ${name}
- **Role**: ${role}
- **Age**: ${age}

## Appearance
- **Build**: lean
- **Marks**: a scar across the left brow

## Background
- **Origin**: Riverbend, a silt town on the lower delta

## Motivation
- **Wants**: to buy back the family ledger

## Relationships
- **Family**: see [[characters/female-lead.md]]

## Abilities
- **Cultivation**: second tier, water affinity

## Arc
- **Turning point**: the night the ledger burns

## Voice
- **Verbal tic**: counts on their fingers while lying

## Open questions
- none
`;
}

function event(n, title) {
	return `# ${title}

## Basics
- **Title**: ${title}
- **When**: year 12, late autumn
- **Where**: the salt road north of Riverbend

## Participants
- **Cast**: the male lead, two toll clerks

## Consequences
- **Changes**: the toll is doubled, chapter ${n} opens on the fallout
`;
}

function skill(n, name) {
	return `# ${name}

## Basics
- **Skill**: ${name}
- **Tier**: ${n}

## Effect
- **Does**: moves standing water uphill for the length of one breath

## Cost
- **Price**: one day of hearing
`;
}

function chapter(n, status) {
	return `# Chapter ${String(n).padStart(2, "0")}

## Metadata
- **Status**: ${status}
- **Words**: ${1800 + n * 40}

## Summary
- **One line**: the ledger changes hands again

## Beats
- **Opening**: rain on the toll house roof
`;
}

function principle(n, name) {
	return `# ${name}

## Identity
> Principle ID: P-${String(n).padStart(2, "0")}
> Tier: ${n}

## Rule
- **Scope**: binding for every cultivator above the second tier
`;
}

/** Deliberately unfinished: feeds the draft-marker scan (>= 5 marked lines, none of them a heading) */
const MALE_LEAD = `# Male lead

## Core identity
- **Name**: Shen Yuan
- **Role**: protagonist
- **Age**: TODO decide between fourteen and seventeen

## Appearance
- **Build**: lean
- **Marks**: FIXME the scar moves between chapters 3 and 9

## Background
- **Origin**: Riverbend — the family name is still undecided

## Motivation
- **Wants**: TBD, depends on whether the ledger survives chapter 9

## Relationships
- **Family**: placeholder until the sister is named

## Abilities
- **Cultivation**: second tier (draft, may be raised to third)

## Arc
- **Turning point**: unresolved

## Voice
- **Verbal tic**: counts on their fingers while lying

## Open questions
- see [[characters/female-lead.md]]
`;

const WORLDVIEW_INDEX = `# Worldview

Hard rules first, then the detail files.

| File | Topic | State |
| --- | --- | --- |
| \`worldview/00-core-rules.md\` | hard rules, never contradicted | settled |
| \`worldview/01-power.md\` | tiers and affinities | settled |
| \`worldview/02-rebirth.md\` | the rebirth cycle | open |
`;

const OUTLINE = `# Outline

- Act one — [[chapters/01.md]] to [[chapters/03.md]]: the ledger is stolen
- Act two — [[chapters/04.md]] to [[chapters/06.md]]: the salt road
- Act three — [[chapters/07.md]] to [[chapters/08.md]]: the ledger burns
- Cast: [[characters/male-lead.md]], [[characters/female-lead.md]]
`;

const CHARACTER_NAMES = [
	["female-lead", "Female lead", "heroine", 16],
	["mentor", "Mentor", "mentor", 54],
	["villain", "Villain", "villain", 41],
	["confidant", "Confidant", "confidant", 17],
	["toll-clerk", "Toll clerk", "extra", 33],
	["sister", "Sister", "confidant", 11],
	["ferryman", "Ferryman", "extra", 60],
];

const EVENT_NAMES = ["ledger-theft", "salt-road-toll", "flood-night", "duel-at-the-weir", "market-fire", "ledger-burns", "the-reckoning"];
const SKILL_NAMES = ["river-step", "silt-palm", "tide-ear", "salt-ward", "undertow", "still-water"];
const PRINCIPLE_NAMES = ["conservation-of-debt", "water-finds-level", "names-bind", "no-free-tier", "the-ledger-remembers", "salt-pays-salt"];

/** Writes the fixture tree into `root` (created if missing) and returns `root` */
export function buildFixtureVault(root) {
	const put = (rel, body) => {
		const p = join(root, rel);
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, body);
	};

	put("characters/character-template.md", CHARACTER_TEMPLATE);
	put("events/event-template.md", EVENT_TEMPLATE);
	put("skills/skill-template.md", SKILL_TEMPLATE);
	put("chapters/chapter-template.md", CHAPTER_TEMPLATE);
	put("principles/_template.md", PRINCIPLE_TEMPLATE);

	put("characters/male-lead.md", MALE_LEAD);
	for (const [slug, name, role, age] of CHARACTER_NAMES) put(`characters/${slug}.md`, character(name, role, age));

	EVENT_NAMES.forEach((slug, i) => put(`events/${slug}.md`, event(i + 1, slug.replace(/-/g, " "))));
	SKILL_NAMES.forEach((slug, i) => put(`skills/${slug}.md`, skill(i + 1, slug.replace(/-/g, " "))));
	PRINCIPLE_NAMES.forEach((slug, i) => put(`principles/${slug}.md`, principle(i + 1, slug.replace(/-/g, " "))));
	for (let n = 1; n <= 8; n++) put(`chapters/${String(n).padStart(2, "0")}.md`, chapter(n, n <= 6 ? "final" : "draft"));

	put("worldview.md", WORLDVIEW_INDEX);
	put("worldview/00-core-rules.md", "# Core rules\n\n- A debt follows the name, not the body.\n- Nobody skips a tier.\n");
	put("worldview/01-power.md", "# Power\n\n- Four tiers, five affinities. See `worldview/00-core-rules.md`.\n");
	put("worldview/02-rebirth.md", "# Rebirth\n\n- One return per name. See [[worldview/00-core-rules.md]].\n");
	// Not listed in worldview.md on purpose: the index check must report it as missing
	put("worldview/03-factions.md", "# Factions\n\n- The salt guild, the weir keepers.\n");
	// One dangling wikilink on purpose: the reference scan must have something to report
	put("chapters/04.md", `${chapter(4, "final")}\n- Callback to [[events/the-vanished-barge.md]]\n`);
	put("outline.md", OUTLINE);

	return root;
}

/** Fresh fixture vault in a temp dir. `cleanup()` removes it again. */
export function createFixtureVault() {
	const root = buildFixtureVault(mkdtempSync(join(tmpdir(), "ai-work-review-fixture-")));
	return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
