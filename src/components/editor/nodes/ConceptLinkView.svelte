<script lang="ts">
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import CharacterView from '@components/output/CharacterView.svelte';
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import { locales } from '@db/Database';
    import ConceptLink, { CharacterName } from '@nodes/ConceptLink';

    interface Props {
        node: ConceptLink;
        format: Format;
    }

    let { node, format }: Props = $props();

    // If this link refers to a custom character (a `username/name` reference),
    // show its glyph inline next to the markup so the editor and the
    // auto-complete menu preview what the character looks like. The locale's
    // glossary forms are passed so a reference like `@parameters` isn't
    // mistaken here for a character while rendering as a term everywhere else.
    let character = $derived(
        ConceptLink.parse(node.getName(), $locales.getGlossaryForms()),
    );
</script>

{#if format.editable}<!-- Editable: the link is source being typed, so it
    renders as the tokens it is — the caret has to be able to sit inside
    it.

    In the markup editor's prose mode it is additionally drawn as a chip, so a
    reference reads as one thing rather than as prose that happens to start with
    an `@`. The chip is a plain span wrapping the same tokens, never
    `ConceptLinkUI`: that renders a button or an anchor, and a focusable element
    inside a text editor would be reachable by Tab, taking focus off the field
    the editor's whole keyboard model runs through. Keeping the tokens is also
    what keeps the caret exact — `@Phrase` is a single token, so drawing it
    without its `@` would make every caret offset inside it disagree with the
    glyphs `measureTokenSegment` measures. -->
    <span class="concept" class:chip={format.prose === true}
        ><NodeView
            node={[node, 'concept']}
            {format}
        />{#if character instanceof CharacterName && character.name}<CharacterView
                name={character}
            />{/if}</span
    >
{:else}<!-- Read-only: render the concept the way prose does, so a `@Time` in a
    program's documentation is the same link a `@Time` in a doc paragraph is.
    ConceptLinkUI resolves against the concept index when there is one and falls
    back to the plain name when there isn't. -->
    <ConceptLinkUI link={node} symbolic={false} />{/if}

<style>
    .concept.chip {
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-alternating-color);
        padding-inline: calc(var(--wordplay-spacing) / 4);
    }
</style>
