<script lang="ts">
    import Link from './Link.svelte';

    export let to: string;
</script>

<div><Link {to}><span class="big"><slot /></span></Link></div>

<style>
    .big {
        font-size: min(6vw, 32pt);
        margin-bottom: var(--wordplay-spacing);
    }
</style>
