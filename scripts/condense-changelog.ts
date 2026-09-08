/**
 * One-time pass: condense multi-sentence CHANGELOG entries to a single short
 * sentence, before the 29-locale updates backfill translates them all.
 *
 * Why this is worth doing to published text: every entry is about to be
 * translated 29 times, and the file's own preamble says it is written "to an
 * audience of teachers and youth" — which is not who a 220-character
 * two-sentence entry is written for. It also finishes a job begun by hand in
 * `324cf14` ("Improved updates layout and readability"), which rewrote 110
 * published bullets the same way and stopped at 0.17.6.
 *
 * Three commands, so nothing is written until a person has read it:
 *
 *   propose  ask the model, validate, checkpoint to .changelog-condense/
 *   judge    score before and after against the plain-language rubric
 *   apply    splice accepted rewrites into CHANGELOG.md
 *
 * Run: ANTHROPIC_API_KEY must be set (loadEnv reads .env.local).
 *   npx tsx scripts/condense-changelog.ts propose [--limit N]
 *   npx tsx scripts/condense-changelog.ts judge
 *   npx tsx scripts/condense-changelog.ts apply
 */
import '@util/verify-locales/loadEnv';

import Anthropic from '@anthropic-ai/sdk';
import { PLAIN_LANGUAGE_GUIDANCE } from '@locale/readingLevel';
import { chunkUnits } from '@util/chunkUnits';
import {
    describeClaudeError,
    estimateCost,
} from '@util/verify-locales/ClaudeTranslator';
import Log from '@util/verify-locales/Log';
import fs from 'fs';
import path from 'path';
import {
    reduction,
    rejectRewrite,
    scanCandidates,
    type Candidate,
    type Rejection,
    type SecondReason,
} from './condenseRules';

const log: Log = new Log(false);

/** Opus rather than the default Sonnet: this is editing published prose with
 *  judgment about what may be dropped, which is the case CLAUDE.md reserves the
 *  repair model for. The whole pass is under a dollar either way. */
const MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 16000;

/** Gitignored, and in the repo rather than a temp dir so the review file opens
 *  in the editor beside CHANGELOG.md. */
const OutDir = '.changelog-condense';
const ProposalsPath = path.join(OutDir, 'proposals.json');
const ReviewPath = path.join(OutDir, 'review.md');

type Proposal = Candidate & {
    text?: string;
    second?: SecondReason;
    rejected?: Rejection | undefined;
    /** What the model reports cutting, which is what a reviewer scans. */
    dropped?: string;
};

const SYSTEM = `You are the editor of the change log for Wordplay, a programming language for young, multilingual learners. Each entry you are given is a published release note. Rewrite it shorter.

Rules:
- One sentence. Aim for 90-140 characters.
- Keep the first person plural voice the entries already use ("We fixed...", "You can now...").
- Say what a reader experiences, not how it was built. Cut explanations of the cause, the internals, or the work; keep the effect.
- Keep every distinct thing a reader can do or see. Cutting an explanation is right; cutting a second behavior is not — "Pressing Enter after a bullet starts the next one" and "the example buttons only appear when your cursor is inside an example" are facts, not explanations. If two behaviors will not fit in one sentence, return the entry unchanged.
- Keep every \`code span\`, [link](url), and (#1234) citation exactly as it appears. They are the concrete parts a reader can act on. If a clause carrying one has to go, cut a different clause instead.
- Never invent a fact that is not in the original. Cutting is the only change you may make; if nothing can be cut without inventing, return the original unchanged.
- A second sentence is allowed only when the first cannot carry the entry alone. Say which:
  - "code": the entry's point is a code example that will not fit in one sentence with its explanation.
  - "caveat": the original states a condition, an exception, or a second distinct behavior a reader needs ("If you asked for less motion, they jump instead"; "Pressing Enter after a bullet starts the next one"), and folding it into the first sentence would make it unreadable.
  Return "second": "none" when you used one sentence. Two sentences with "none" are rejected.
- Also return "dropped": a few words naming what you removed ("the cause", "how it used to fail", "the Enter-after-bullet behavior"), or "nothing" if you only tightened the wording. Be honest here; it is what a person reads to check your work.

${PLAIN_LANGUAGE_GUIDANCE}`;

const SCHEMA = {
    type: 'object',
    properties: {
        results: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    index: { type: 'integer' },
                    text: { type: 'string' },
                    // A sentinel rather than a nullable enum: the API refuses
                    // an enum whose values don't match a union type.
                    second: {
                        type: 'string',
                        enum: ['code', 'caveat', 'none'],
                    },
                    dropped: { type: 'string' },
                },
                required: ['index', 'text', 'second', 'dropped'],
                additionalProperties: false,
            },
        },
    },
    required: ['results'],
    additionalProperties: false,
};

type Reply = {
    index: number;
    text: string;
    second: 'code' | 'caveat' | 'none';
    /** What the model says it removed, in its own words. */
    dropped: string;
};

function readProposals(): Proposal[] {
    if (!fs.existsSync(ProposalsPath)) return [];
    return JSON.parse(fs.readFileSync(ProposalsPath, 'utf-8')) as Proposal[];
}

function saveProposals(proposals: Proposal[]): void {
    fs.mkdirSync(OutDir, { recursive: true });
    fs.writeFileSync(
        ProposalsPath,
        JSON.stringify(proposals, null, 2),
        'utf-8',
    );
}

const client = new Anthropic();
let usage = {
    model: MODEL,
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    thinkingTokens: 0,
};

async function condenseChunk(bodies: string[]): Promise<Reply[] | undefined> {
    try {
        const response = await client.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: [
                {
                    type: 'text',
                    text: SYSTEM,
                    cache_control: { type: 'ephemeral' },
                },
            ],
            output_config: { format: { type: 'json_schema', schema: SCHEMA } },
            messages: [
                {
                    role: 'user',
                    content: `Rewrite these ${bodies.length} entries. Return JSON {"results":[...]} with exactly ${bodies.length} entries, each carrying the "index" it was given.\n\n${JSON.stringify(
                        bodies.map((text, index) => ({ index, text })),
                    )}`,
                },
            ],
        });
        usage.requests++;
        usage.inputTokens += response.usage?.input_tokens ?? 0;
        usage.outputTokens += response.usage?.output_tokens ?? 0;
        usage.cacheReadTokens += response.usage?.cache_read_input_tokens ?? 0;
        usage.cacheWriteTokens +=
            response.usage?.cache_creation_input_tokens ?? 0;
        if (response.stop_reason === 'refusal') return undefined;
        if (response.stop_reason === 'max_tokens') return undefined;
        const block = response.content.find((b) => b.type === 'text');
        if (block === undefined) return undefined;
        const parsed = JSON.parse(block.text) as { results?: Reply[] };
        return parsed.results;
    } catch (error) {
        log.warning(`Request failed: ${describeClaudeError(error)}`);
        return undefined;
    }
}

async function propose(limit: number | undefined): Promise<void> {
    const lines = fs.readFileSync('CHANGELOG.md', 'utf-8').split('\n');
    const all = scanCandidates(lines);
    const candidates = limit === undefined ? all : all.slice(0, limit);
    log.say(
        `${all.length} multi-sentence entries in dated releases${limit === undefined ? '' : `; taking the first ${candidates.length}`}.`,
    );

    // Resume: a proposal already made for this exact original is kept, so a
    // killed run costs only the chunk in flight.
    const done = new Map(readProposals().map((p) => [p.original, p]));
    const proposals: Proposal[] = candidates.map(
        (c) => done.get(c.original) ?? c,
    );
    const pending = proposals.filter((p) => p.text === undefined);
    if (pending.length === 0) {
        log.good('Every candidate already has a proposal.');
        return;
    }
    log.say(`Asking for ${pending.length}.`);

    const byBody = new Map(pending.map((p) => [p.body, p]));
    let done_ = 0;
    for (const chunk of chunkUnits(pending.map((p) => p.body))) {
        const replies = await condenseChunk(chunk);
        done_ += chunk.length;
        process.stdout.write(`  …condensed ${done_}/${pending.length}\r`);
        if (replies === undefined) continue;
        for (const reply of replies) {
            const body = chunk[reply.index];
            const proposal = body === undefined ? undefined : byBody.get(body);
            if (proposal === undefined || typeof reply.text !== 'string')
                continue;
            proposal.text = reply.text.trim();
            proposal.second = reply.second === 'none' ? null : reply.second;
            proposal.dropped =
                typeof reply.dropped === 'string' ? reply.dropped : '';
            proposal.rejected = rejectRewrite(
                proposal.body,
                proposal.text,
                proposal.second,
            );
        }
        saveProposals(proposals);
    }
    process.stdout.write('\n');
    saveProposals(proposals);
    report(proposals);
}

function report(proposals: Proposal[]): void {
    const answered = proposals.filter((p) => p.text !== undefined);
    const accepted = answered.filter((p) => p.rejected === undefined);
    const before = accepted.reduce((n, p) => n + p.body.length, 0);
    const after = accepted.reduce((n, p) => n + (p.text ?? '').length, 0);
    log.say(
        `${accepted.length} accepted, ${answered.length - accepted.length} rejected, ${proposals.length - answered.length} unanswered.`,
    );
    if (accepted.length > 0)
        log.say(
            `Accepted entries: ${before} → ${after} characters (${Math.round((100 * (before - after)) / before)}% shorter).`,
        );
    const counts = new Map<string, number>();
    for (const p of answered)
        if (p.rejected)
            counts.set(p.rejected, (counts.get(p.rejected) ?? 0) + 1);
    for (const [reason, n] of counts) log.warning(`${n} rejected: ${reason}.`);
    const cost = estimateCost(usage);
    if (usage.requests > 0)
        log.say(
            `${usage.requests} requests, ${usage.inputTokens} in, ${usage.outputTokens} out${cost === undefined ? '' : ` ≈ $${cost.toFixed(2)}`}.`,
        );
}

/**
 * Write the side-by-side review, ordered so the entries needing a human come
 * first. A sampled review is only safe if the risky ones are not in the sample.
 */
function writeReview(proposals: Proposal[]): void {
    const accepted = proposals.filter(
        (p) => p.text !== undefined && p.rejected === undefined,
    );
    // A declared second sentence is the one thing a rule can single out. Cut
    // size is *not* a proxy for lost meaning — the slice dropped a whole
    // behavior at a 36% cut and dropped only an explanation at 59% — so the
    // rest are ordered biggest-cut-first and every one carries what the model
    // says it removed, which is what makes 511 reviewable by scanning.
    const needsEye = (p: Proposal) => p.second !== null;
    const flagged = accepted.filter(needsEye);
    const rest = accepted
        .filter((p) => !needsEye(p))
        .sort(
            (a, b) =>
                reduction(b.body, b.text ?? '') -
                reduction(a.body, a.text ?? ''),
        );
    const rejected = proposals.filter((p) => p.rejected !== undefined);

    const pair = (p: Proposal) =>
        [
            `### ${p.version} — line ${p.line + 1} — cut ${Math.round(100 * reduction(p.body, p.text ?? ''))}%${p.second ? ` — second sentence: ${p.second}` : ''}`,
            '',
            `- **dropped**: ${p.dropped ?? '(not reported)'}`,
            `- **before** (${p.body.length}): ${p.body}`,
            `- **after** (${(p.text ?? '').length}): ${p.text ?? ''}`,
            '',
        ]
            .filter((l) => l !== '')
            .join('\n');

    const out = [
        '# Changelog condensation — review',
        '',
        `${accepted.length} accepted rewrites, ${rejected.length} refused (their originals are kept).`,
        '',
        `## Read these first (${flagged.length})`,
        '',
        'These kept a second sentence, and each had to name why.',
        '',
        ...flagged.map(pair),
        `## The rest (${rest.length})`,
        '',
        ...rest.map(pair),
        `## Refused, original kept (${rejected.length})`,
        '',
        ...rejected.map(
            (p) =>
                `- \`${p.rejected}\` — ${p.version} line ${p.line + 1}: ${p.body}\n  - proposed: ${p.text ?? ''}\n`,
        ),
    ].join('\n');
    fs.mkdirSync(OutDir, { recursive: true });
    fs.writeFileSync(ReviewPath, out, 'utf-8');
    log.good(`Wrote ${ReviewPath}.`);
}

/** Splice accepted rewrites into CHANGELOG.md, refusing any line that moved. */
function apply(): void {
    const proposals = readProposals().filter(
        (p) => p.text !== undefined && p.rejected === undefined,
    );
    if (proposals.length === 0) return void log.warning('Nothing to apply.');
    const lines = fs.readFileSync('CHANGELOG.md', 'utf-8').split('\n');
    let applied = 0;
    let skipped = 0;
    for (const p of proposals) {
        if (lines[p.line] !== p.original) {
            skipped++;
            log.warning(
                `Line ${p.line + 1} changed since it was proposed; leaving it alone.`,
            );
            continue;
        }
        lines[p.line] = `- ${p.emoji ? `${p.emoji} ` : ''}${p.text ?? ''}`;
        applied++;
    }
    fs.writeFileSync('CHANGELOG.md', lines.join('\n'), 'utf-8');
    log.good(
        `Rewrote ${applied} entries${skipped > 0 ? `, skipped ${skipped}` : ''}.`,
    );
}

// Only dispatch when run directly, so the scanner above stays importable by
// tests — the convention scripts/updates.ts uses.
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    const limitFlag = process.argv.indexOf('--limit');
    const limit =
        limitFlag === -1 ? undefined : Number(process.argv[limitFlag + 1]);

    if (command === 'propose') {
        if (!process.env.ANTHROPIC_API_KEY)
            log.exit('ANTHROPIC_API_KEY is not set.');
        await propose(limit);
        writeReview(readProposals());
    } else if (command === 'review') {
        writeReview(readProposals());
        report(readProposals());
    } else if (command === 'apply') {
        apply();
    } else {
        log.exit(
            'Usage: condense-changelog.ts propose [--limit N] | review | apply',
        );
    }
}
