<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import type Concept from '@concepts/Concept';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import ConceptGroupView from './ConceptGroupView.svelte';

    interface Props {
        category: LocaleTextAccessor;
        concepts: Concept[];
        collapse: boolean;
        row: boolean;
        describe?: boolean;
    }

    let {
        category,
        concepts,
        collapse,
        row,
        describe = true,
    }: Props = $props();
</script>

<Subheader text={category} />
<ConceptGroupView {concepts} {collapse} {row} {describe} />
