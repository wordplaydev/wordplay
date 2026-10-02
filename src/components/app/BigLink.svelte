<script lang="ts">
    import type { AppPath, ExternalURL } from '#util/appPath.ts';
    import MarkupHTMLView from '#components/concepts/MarkupHTMLView.svelte';
    import type { LocaleTextAccessor } from '#locale/Locales.ts';
    import Link from '#components/app/Link.svelte';

    interface Props {
        to: AppPath | ExternalURL;
        subtitle?: LocaleTextAccessor | undefined;
        external?: boolean;
        smaller?: boolean;
        children?: import('svelte').Snippet;
    }

    let {
        to,
        subtitle = undefined,
        external = false,
        smaller = false,
        children,
    }: Props = $props();
</script>

<div class="stack biglink" class:smaller>
    <div class="link"><Link {to} {external}>{@render children?.()}</Link></div>
    {#if subtitle}<div class="subtitle"
            ><MarkupHTMLView inline markup={subtitle} /></div
        >{/if}</div
>

<style>
    .link {
        font-size: min(24pt, max(18pt, 6vw));
    }

    .biglink.smaller .link {
        font-size: min(24pt, max(14pt, 3vw));
    }

    .subtitle {
        color: var(--wordplay-header);
        font-size: var(--wordplay-font-size);
    }
</style>
