<script lang="ts">
    import Link from './Link.svelte';

    export let to: string;
</script>

<Link {to}><div class="big"><slot /></div></Link>

<style>
    .big {
        font-size: min(6vw, 32pt);
        margin-bottom: var(--wordplay-spacing);
    }
</style>
