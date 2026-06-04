<script lang="ts">
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import CharacterView from '@components/output/CharacterView.svelte';
    import ConceptLink, { CharacterName } from '@nodes/ConceptLink';

    interface Props {
        node: ConceptLink;
        format: Format;
    }

    let { node, format }: Props = $props();

    // If this link refers to a custom character (a `username/name` reference),
    // show its glyph inline next to the markup so the editor and the
    // auto-complete menu preview what the character looks like.
    let character = $derived(ConceptLink.parse(node.getName()));
</script>

<NodeView
    node={[node, 'concept']}
    {format}
/>{#if character instanceof CharacterName && character.name}
    <CharacterView name={character} />
{/if}
