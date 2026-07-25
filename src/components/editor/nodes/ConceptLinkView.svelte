<script lang="ts">
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import CharacterView from '@components/output/CharacterView.svelte';
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

<NodeView
    node={[node, 'concept']}
    {format}
/>{#if character instanceof CharacterName && character.name}
    <CharacterView name={character} />
{/if}
