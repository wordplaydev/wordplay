<script lang="ts">
    import Link from './Link.svelte';

    export let to: string;
</script>

<p><Link {to}><slot /></Link></p>

<style>
    p {
        font-size: 8vw;
        margin-bottom: var(--wordplay-spacing);
    }
</style>
