<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        text: LocaleTextAccessor;
        subtitle?: string | undefined;
    }

    let { text, subtitle }: Props = $props();

    // Compose the whole title as one expression. A block inside <title> is what
    // corrupted it before — an {#if} emits hydration anchor comments, and <title>
    // is RCDATA, so they survived as literal text. Inside <svelte:head> the
    // compiler takes a dedicated path that renders the title on the server and
    // assigns document.title on the client, never hydrating the element.
    let title = $derived.by(() => {
        const base = $locales.getPlainText(text);
        return subtitle ? `${base} - ${subtitle}` : base;
    });
</script>

<svelte:head>
    <title>{title}</title>
</svelte:head>
