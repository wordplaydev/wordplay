<script lang="ts">
    import Link from './Link.svelte';

    export let to: string;
    export let subtitle: string | undefined = undefined;
    export let external = false;
    export let smaller = false;
</script>

<p class="link" class:smaller
    ><Link nowrap {to} {external}><slot /></Link>{#if subtitle}<span
            class="subtitle"><br />{subtitle}</span
        >{/if}</p
>

<style>
    .link {
        font-size: min(6vw, 32pt);
        margin-block-end: 1em;
        line-height: 0.85;
    }

    .link.smaller {
        font-size: min(3vw, 24pt);
    }

    .subtitle {
        color: var(--wordplay-header);
        font-size: min(4vw, 16pt);
    }

    .smaller .subtitle {
        font-size: min(2vw, 14pt);
    }
</style>
