<script lang="ts">
    import Link from './Link.svelte';

    export let to: string;
    export let subtitle: string | undefined = undefined;
    export let external = false;
</script>

<p class="link"
    ><Link {to} {external}><slot /></Link>{#if subtitle}<span class="subtitle"
            ><br />{subtitle}</span
        >{/if}</p
>

<style>
    .link {
        font-size: min(6vw, 32pt);
        margin-block-end: 1em;
        line-height: 0.85;
    }

    .subtitle {
        color: var(--wordplay-header);
        font-size: min(4vw, 16pt);
    }
</style>
