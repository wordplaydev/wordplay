<script lang="ts">
    import type WebLink from '../../nodes/WebLink';
    import type Spaces from '../../parser/Spaces';

    export let link: WebLink;
    export let spaces: Spaces;

    let url = link.url
        ? link.url.getText().startsWith('://')
            ? link.url.getText().replace('://', '/')
            : link.url.getText()
        : '';
</script>

{#if link.url && link.description}
    {#if spaces.getSpace(link.open).length > 0}&nbsp;{/if}<a
        href={url}
        target="_blank"
        rel="noreferrer">{link.description.getText()}</a
    >
{:else if link.description}
    {link.description.getText()}
{/if}
