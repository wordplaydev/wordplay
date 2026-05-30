<script lang="ts">
    import { page } from '$app/state';
    import {
        getLocalizing,
        setLinkLocalize,
    } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        to: string;
        tip?: LocaleTextAccessor | undefined;
        nowrap?: boolean;
        external?: boolean;
        /** Force a full-page navigation (data-sveltekit-reload) instead of a
         * client-side one. Use when the destination must load fresh code/data
         * rather than render with the bundle this tab is already running —
         * e.g. linking to /updates from the new-version notification. */
        reload?: boolean;
        label?: LocaleTextAccessor;
        children?: import('svelte').Snippet;
    }

    let {
        to,
        tip = undefined,
        nowrap = false,
        external = false,
        reload = false,
        label,
        children,
    }: Props = $props();

    let localizing = getLocalizing();

    // A LocalizedText child registers its path here so the edit affordance can
    // render outside the anchor. See `LinkLocalizeContext` for the rationale.
    let registeredPath = $state<LocaleTextAccessor | undefined>(undefined);
    setLinkLocalize({
        register: (path) => (registeredPath = path),
    });

    // True while the edit-affordance LocalizedText is showing its inline editor.
    // We hide the anchor during edit so the field has the row to itself.
    let editing = $state(false);

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

<!-- LocalizedText children render as plain text (via the link context),
     keeping the anchor a clean hyperlink. The edit affordance for localize
     mode sits *beside* the link — see LinkLocalizeContext. -->
{#snippet labelOrChildren()}
    {#if children}{@render children()}{:else if label}<LocalizedText
            path={label}
        />{/if}
{/snippet}

<!-- Keep `linkPart` in a stable position in the tree across registeredPath
     transitions — moving it would unmount and remount the LocalizedText child
     it contains, whose mount-time register() call would flip registeredPath
     back and trigger an infinite re-mount loop. -->
{#snippet linkPart()}
    {#if isActive}
        {@render labelOrChildren()}
    {:else}<a
            data-sveltekit-preload-data="tap"
            data-sveltekit-reload={reload ? '' : null}
            title={tip ? $locales.getPlainText(tip) : undefined}
            {href}
            target={external ? '_blank' : null}
            class="link"
            class:nowrap
            >{@render labelOrChildren()}{#if external}<span class="external"
                    >↗</span
                >{/if}</a
        >{/if}
{/snippet}

{#if localizing?.on}
    <span class="link-with-editor link" class:editing>
        <span class="link-part">{@render linkPart()}</span
        >{#if registeredPath !== undefined}<LocalizedText
                path={registeredPath}
                editOnly
                onEditingChange={(e) => (editing = e)}
            />{/if}
    </span>
{:else}
    {@render linkPart()}
{/if}

<style>
    .link {
        align-self: flex-start;
    }

    .nowrap {
        white-space: nowrap;
    }

    .external {
        font-family: 'Noto Emoji';
        font-size: calc(var(--wordplay-font-size) - 6pt);
        display: inline-block;
        margin-inline-start: 0.25em;
    }

    .link-with-editor {
        display: inline-flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        vertical-align: middle;
    }

    /* While the inline editor is open, give the field + action buttons the row
       to themselves by hiding the link half (rather than unmounting it, which
       would tear down the LocalizedText that has registered our path). */
    .link-with-editor.editing > .link-part {
        display: none;
    }
</style>
