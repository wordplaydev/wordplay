import { expect, test } from 'vitest';
import DefaultLocale from '#locale/DefaultLocale.ts';
import { toMarkup } from '#parser/toMarkup.ts';
import Example from '#nodes/Example.ts';
import { makeExampleProject } from '#components/concepts/previewEvaluator.ts';

test("a block example's code doesn't start with the line break after its opening delimiter", () => {
    const [markup, spaces] = toMarkup("Look:\n\n\\\nPhrase('hi')\n\\");
    const example = markup
        .nodes()
        .find((node): node is Example => node instanceof Example);
    expect(example).toBeDefined();
    if (example === undefined) return;
    const project = makeExampleProject('example', example.program, spaces, [
        DefaultLocale,
    ]);
    expect(project.getMain().code.toString()).toBe("Phrase('hi')");
});
