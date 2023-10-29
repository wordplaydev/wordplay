<script lang="ts">
    import type Concept from '@concepts/Concept';
    import ConceptGroupView from './ConceptGroupView.svelte';
    import TiltedHeader from '../app/Tilted.svelte';
    export let category: string;
    export let concepts: Concept[];
</script>

<h1><TiltedHeader>{category}</TiltedHeader></h1>
<ConceptGroupView {concepts} />

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
