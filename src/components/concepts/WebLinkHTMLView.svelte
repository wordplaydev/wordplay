<script lang="ts">
    import { authoredLink } from '#util/appPath.ts';
    import type WebLink from '#nodes/WebLink.ts';
    import type Spaces from '#parser/Spaces.ts';
    import Link from '#components/app/Link.svelte';
    import linkHref from '#parser/linkHref.ts';

    interface Props {
        link: WebLink;
        spaces: Spaces;
    }

    let { link, spaces }: Props = $props();

    // Undefined when the URL points somewhere documentation has no business
    // pointing, or names no route; the description then renders as plain text.
    let url = $derived(
        link.url ? authoredLink(linkHref(link.url.getText())) : undefined,
    );
</script>

{#if url !== undefined && link.description}
    {#if spaces.getSpace(link.open).length > 0}&nbsp;{/if}<Link
        external={!url.startsWith('/')}
        to={url}>{link.description.getText()}</Link
    >
{:else if link.description}
    {link.description.getText()}
{/if}
