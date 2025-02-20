<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import type Concept from '@concepts/Concept';
    import ConceptGroupView from './ConceptGroupView.svelte';

    interface Props {
        category: string;
        concepts: Concept[];
        collapse: boolean;
    }

    let { category, concepts, collapse }: Props = $props();
</script>

<Subheader>{category}</Subheader>
<ConceptGroupView {concepts} {collapse} />
