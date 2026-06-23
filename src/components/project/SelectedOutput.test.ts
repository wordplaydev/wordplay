import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import SelectedOutput from '@components/project/SelectedOutput.svelte';

/** A project with two top-level Phrase outputs, plus those two Evaluates. */
function setup() {
    const source = new Source('test', `Phrase('a')\nPhrase('b')`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const phrases = source.expression
        .nodes()
        .filter(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                n.is(project.shares.output.Phrase, context),
        );
    return { project, a: phrases[0], b: phrases[1] };
}

test('toggle adds an output, then removes it', () => {
    const { project, a, b } = setup();
    const sel = new SelectedOutput();
    expect(sel.isEmpty()).toBe(true);

    sel.toggle(project, a);
    expect(sel.includes(a, project)).toBe(true);
    expect(sel.getOutput(project).length).toBe(1);

    sel.toggle(project, b);
    expect(sel.includes(b, project)).toBe(true);
    expect(sel.getOutput(project).length).toBe(2);

    sel.toggle(project, a); // remove a
    expect(sel.includes(a, project)).toBe(false);
    expect(sel.includes(b, project)).toBe(true);
    expect(sel.getOutput(project).length).toBe(1);
});

test('selectAll selects every given output', () => {
    const { project, a, b } = setup();
    const sel = new SelectedOutput();
    sel.selectAll(project, [a, b]);
    expect(sel.getOutput(project).length).toBe(2);
    expect(sel.includes(a, project)).toBe(true);
    expect(sel.includes(b, project)).toBe(true);
});

test('empty clears the selection', () => {
    const { project, a } = setup();
    const sel = new SelectedOutput();
    sel.toggle(project, a);
    expect(sel.isEmpty()).toBe(false);
    sel.empty();
    expect(sel.isEmpty()).toBe(true);
});

test('toggle clears any phrase text-edit', () => {
    const { project, a } = setup();
    const sel = new SelectedOutput();
    sel.setPhrase({ name: 'x', index: 0 });
    expect(sel.getPhrase()).not.toBeNull();
    sel.toggle(project, a);
    expect(sel.getPhrase()).toBeNull();
});
