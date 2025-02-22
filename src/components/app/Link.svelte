<script lang="ts">
    import { page } from '$app/state';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        to: string;
        tip?: LocaleTextAccessor | undefined;
        nowrap?: boolean;
        external?: boolean;
        children?: import('svelte').Snippet;
    }

    let {
        to,
        tip = undefined,
        nowrap = false,
        external = false,
        children,
    }: Props = $props();
</script>

{#if to === '/' ? page.route.id === '/' : page.route.id?.endsWith(to)}
    {@render children?.()}
{:else}<a
        data-sveltekit-preload-data="tap"
        title={tip ? $locales.get(tip) : undefined}
        href={to}
        target={external ? '_blank' : null}
        class:nowrap
        >{@render children?.()}{#if external}<span class="external">↗</span
            >{/if}</a
    >
{/if}

<style>
    a {
        color: var(--wordplay-highlight-color);
        text-decoration: none;
    }

    /* Links in paragraphs should have underlines for visibility. */
    :global(p) > a {
        text-decoration: calc(var(--wordplay-focus-width) / 2) underline
            var(--wordplay-highlight-color);
    }

    :global(.feedback) > a {
        color: var(--wordplay-background);
        text-decoration: var(--wordplay-focus-width) underline
            var(--wordplay-background);
    }

    .nowrap {
        white-space: nowrap;
    }

    a:focus,
    a:hover {
        outline: none;
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
        text-decoration-color: var(--wordplay-focus-color);
    }

    .external {
        font-family: 'Noto Emoji';
        font-size: calc(var(--wordplay-font-size) - 6pt);
        display: inline-block;
        margin-inline-start: 0.25em;
    }
</style>
