<script lang="ts">
    import type Concept from '@concepts/Concept';
    import ConceptGroupView from './ConceptGroupView.svelte';

    interface Props {
        category: string;
        concepts: Concept[];
        collapse: boolean;
    }

    let { category, concepts, collapse }: Props = $props();
</script>

<h1>{category}</h1>
<ConceptGroupView {concepts} {collapse} />

<style>
    h1 {
        font-size: xx-large;
        font-family: var(--wordplay-app-font);
        color: var(--wordplay-header);
        font-weight: bold;
        text-align: start;
        transform: rotate(-1deg);
        white-space: nowrap;
        text-transform: capitalize;
    }
</style>
