<script lang="ts">
    import type Value from '@values/Value';

    interface Props {
        value: Value;
        inline?: boolean;
    }

    let { value, inline = true }: Props = $props();
</script>

{#if inline || !inline}<span>{value.constructor.name}</span>{/if}

<style>
    span {
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
    }
</style>
