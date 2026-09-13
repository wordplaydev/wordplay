<!-- Renders its children one heading level deeper.

     The level is a context rather than a prop (see headingLevel.ts) because the
     views that draw headings are shared and several deep. This is the other half
     of that: a caller that stacks sections inside a section says so once, here,
     instead of every heading in the subtree taking a level it would have to be
     handed. -->
<script lang="ts">
    import {
        getHeadingLevel,
        setHeadingLevel,
    } from '@components/app/headingLevel.js';
    import type { Snippet } from 'svelte';

    let { children }: { children: Snippet } = $props();

    // Read and set at construction: how deep a section sits doesn't change.
    setHeadingLevel(getHeadingLevel() + 1);
</script>

{@render children()}
