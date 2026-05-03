<script lang="ts">
    import { page } from '$app/state';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        to: string;
        tip?: LocaleTextAccessor | undefined;
        nowrap?: boolean;
        external?: boolean;
        label?: LocaleTextAccessor;
        children?: import('svelte').Snippet;
    }

    let {
        to,
        tip = undefined,
        nowrap = false,
        external = false,
        label,
        children,
    }: Props = $props();

    // Prefix internal paths with the current locale segment.
    let href = $derived.by(() => {
        if (external || to.startsWith('http')) return to;
        const locale = page.params.locale;
        if (!locale) return to;
        return `/${locale}${to === '/' ? '' : to}`;
    });

    // A link is "active" when the current route matches the destination.
    // With [[locale]] wrapping all pages, route IDs look like /[[locale]] or /[[locale]]/guide.
    let isActive = $derived.by(() => {
        const id = page.route.id ?? '';
        if (to === '/') return id === '/[[locale]]';
        return id.endsWith(to);
    });
</script>

{#snippet labelOrChildren()}
    {#if children}{@render children()}{:else if label}<LocalizedText
            path={label}
        />{/if}
{/snippet}

{#if isActive}
    {@render labelOrChildren()}
{:else}<a
        data-sveltekit-preload-data="tap"
        title={tip ? $locales.getPlainText(tip) : undefined}
        {href}
        target={external ? '_blank' : null}
        class:nowrap
        >{@render labelOrChildren()}{#if external}<span class="external">↗</span
            >{/if}</a
    >
{/if}

<style>
    .nowrap {
        white-space: nowrap;
    }

    .external {
        font-family: 'Noto Emoji';
        font-size: calc(var(--wordplay-font-size) - 6pt);
        display: inline-block;
        margin-inline-start: 0.25em;
    }
</style>
