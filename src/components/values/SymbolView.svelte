<svelte:options immutable={true} />

<script lang="ts">
    import type Symbol from '@nodes/Symbol';
    import TokenCategories from '../editor/TokenCategories';

    export let symbol: string;
    export let type: Symbol;

    $: category = TokenCategories.get(type);
</script>

<span class={`symbol category-${category}`}>{symbol}</span>

<style>
    .symbol {
        color: currentColor;
        white-space: pre;
    }

    .category-name {
        font-weight: bold;
    }
    .category-literal {
        font-style: italic;
    }

    /* .category-delimiter { color: var(--color-grey); }
    .category-relation { color: var(--color-orange); }
    .category-share { color: var(--color-orange); }
    .category-eval { color: var(--color-blue); }
    .category-docs { color: var(--color-purple); }
    .category-type { color: var(--color-orange); }
    .category-operator { color: var(--color-orange); }
    .category-unknown { color: var(--color-pink); } */
</style>
