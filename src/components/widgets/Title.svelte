<script lang="ts">
    import { browser } from '$app/environment';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        text: LocaleTextAccessor;
        subtitle?: string | undefined;
    }

    let { text, subtitle }: Props = $props();

    // Set document.title imperatively rather than emitting <title> inside
    // <svelte:head>. Svelte 5 inserts hydration anchor comments (<!--[…]-->)
    // alongside reactive text, but the HTML spec parses <title> content as
    // RCDATA — those comments survive as literal text, so the actual title
    // ends up like "Galleries<!--[-1--><!--]-->", which never matches what
    // Svelte's client-side render expects. Bypassing <title> altogether
    // avoids the mismatch entirely.
    $effect(() => {
        if (!browser) return;
        const base = $locales.getPlainText(text);
        document.title = subtitle ? `${base} - ${subtitle}` : base;
    });
</script>
