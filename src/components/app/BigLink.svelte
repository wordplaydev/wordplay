<script lang="ts">
    import Link from './Link.svelte';

    export let to: string;
    export let subtitle: string;
</script>

<p><Link {to}><slot /></Link><span class="subtitle"><br />{subtitle}</span></p>

<style>
    p {
        font-size: min(6vw, 32pt);
        margin-block-end: 1em;
        line-height: 0.85;
    }

    .subtitle {
        color: var(--wordplay-header);
        font-size: min(4vw, 16pt);
    }
</style>
