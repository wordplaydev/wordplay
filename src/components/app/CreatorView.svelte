<script lang="ts">
    import CreatorSymbolView from '@components/app/CreatorCharacterView.svelte';
    import Feedback from '@components/app/Notice.svelte';
    import Text from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { withMonoEmoji } from '@unicode/emoji';

    interface Props {
        creator: Creator | null;
        anonymize?: boolean;
        chrome?: boolean;
        fade?: boolean;
        prompt?: boolean;
        /** Authentication hasn't resolved yet: show a spinning face in place of
         *  the creator, keeping the same chrome so nothing shifts/pops. */
        loading?: boolean;
        /** Hold roughly a resolved row's width while loading, for a list whose
         *  columns would otherwise resize as the names arrive. Off by default:
         *  a lone chip should be as wide as what is in it. */
        reserve?: boolean;
    }

    let {
        creator,
        anonymize = true,
        chrome = true,
        fade = false,
        prompt = false,
        loading = false,
        reserve = false,
    }: Props = $props();

    let username = $derived(creator?.getUsername(anonymize) ?? '');
</script>

<div
    class="creator"
    class:chrome
    class:fade
    class:reserving={loading && reserve}
    aria-busy={loading}
    aria-label={loading
        ? $locales.getPrimaryPlainText((l) => l.ui.widget.loading.message)
        : undefined}
    >{#if loading}<span class="loading-face">{withMonoEmoji('🙂')}</span
        >—{:else if creator}<CreatorSymbolView
            character={creator.getName() ?? ''}
        ></CreatorSymbolView>
        {username.length < 10
            ? username
            : `${username.substring(0, 10)}…`}{:else if prompt}<Text
            path={(l) => l.ui.page.login.anonymous}
        ></Text>{:else}
        <Feedback inline>—</Feedback>{/if}</div
>

<style>
    .creator {
        /* A username is someone's data, not a label, and worth copying. */
        user-select: text;
        -webkit-user-select: text;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: center;
        justify-content: center;
        font-size: var(--wordplay-small-font-size);
        padding: var(--wordplay-spacing);
    }

    .fade {
        color: var(--wordplay-inactive-color);
    }

    /* About what a resolved row wants — a username truncates at ten characters,
       plus its character — so a list keeps its shape as the names arrive. */
    .reserving {
        min-width: 8em;
        justify-content: flex-start;
    }

    .chrome {
        border-radius: var(--wordplay-border-radius);
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }

    .loading-face {
        display: inline-block;
        transform-origin: center;
        /* The mono chain, so this monochrome face doesn't match a color emoji
           slice and download it. The FE0E selector alone doesn't prevent that. */
        font-family: var(--wordplay-emoji-mono-font);
        /* Multiplying by --animation-factor makes this a no-op under
           prefers-reduced-motion (factor 0), matching Spinning.svelte. */
        animation: spin infinite linear;
        animation-duration: calc(var(--animation-factor) * 1s);
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes rotate {
        0% {
            transform: rotate(10deg);
        }
        20% {
            transform: rotate(70deg);
        }
        50% {
            transform: rotate(-50deg);
        }
        80% {
            transform: rotate(10deg);
        }
        100% {
            transform: rotate(0deg);
        }
    }
</style>
