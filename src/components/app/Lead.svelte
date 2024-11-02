<script lang="ts">
    import { type Snippet } from 'svelte';
    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();
</script>

<p class="lead">{@render children()}</p>

<style>
    p {
        font-size: 150%;
    }
</style>
