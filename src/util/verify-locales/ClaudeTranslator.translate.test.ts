import { describe, expect, test } from 'vitest';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Log from '#util/verify-locales/Log.ts';
import ClaudeTranslator from './ClaudeTranslator';

// The SDK client is constructed with the translator, and refuses to without a
// key; nothing here reaches the network, since every request is stubbed below.
process.env.ANTHROPIC_API_KEY ??= 'test';

/** A translator whose model is a function, recording every unit it was sent
 *  and which model each request asked for. */
class StubTranslator extends ClaudeTranslator {
    readonly sent: { model: string; chunk: string[] }[] = [];
    constructor(
        private readonly respond: (
            unit: string,
            model: string,
        ) => string | null,
    ) {
        super();
    }
    protected override translateChunk(
        _log: Log,
        chunk: string[],
        _system: string,
        _source: string,
        _target: string,
        model: string,
    ): Promise<(string | null)[]> {
        this.sent.push({ model, chunk });
        return Promise.resolve(chunk.map((unit) => this.respond(unit, model)));
    }
}

const log = new Log(false, { sink: () => undefined, color: false });

const translate = (translator: StubTranslator, text: string[]) =>
    translator.translate(log, text, 'en-US', 'ja-JP', DefaultLocale, {
        examples: false,
    });

describe('ClaudeTranslator.translate', () => {
    test('sends a string with examples as one unit, not the pieces between them', async () => {
        const translator = new StubTranslator((unit) => unit);
        await translate(translator, [
            '\\⊤\\ is not \\⊥\\; \\⊥\\ is not \\⊤\\.',
        ]);
        expect(translator.sent.flatMap((request) => request.chunk)).toEqual([
            '⟦0⟧ is not ⟦1⟧; ⟦2⟧ is not ⟦3⟧.',
        ]);
    });

    test('puts each example back where a verb-final translation moved it', async () => {
        const translator = new StubTranslator(
            () => '⟦1⟧ は ⟦0⟧ ではありません。',
        );
        expect(await translate(translator, ['\\⊥\\ is not \\⊤\\.'])).toEqual([
            '\\⊤\\ は \\⊥\\ ではありません。',
        ]);
    });

    test('retries a string that lost an example on the repair model alone', async () => {
        let first = true;
        const translator = new StubTranslator((unit) => {
            if (first) {
                first = false;
                return unit.replace('⟦1⟧', '');
            }
            return unit;
        });
        expect(await translate(translator, ['Use \\a\\ and \\b\\.'])).toEqual([
            'Use \\a\\ and \\b\\.',
        ]);
        expect(translator.sent).toHaveLength(2);
        expect(translator.sent[1]?.chunk).toEqual(['Use ⟦0⟧ and ⟦1⟧.']);
        expect(translator.sent[1]?.model).not.toBe(translator.sent[0]?.model);
    });

    test('never sends a string that is all code', async () => {
        const translator = new StubTranslator((unit) => unit);
        expect(await translate(translator, ['\\1 + 1\\'])).toEqual([
            '\\1 + 1\\',
        ]);
        expect(translator.sent).toHaveLength(0);
    });
});
