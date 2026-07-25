<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';

    interface Props {
        nonPII: string[];
        unmark: (piiText: string) => void;
    }

    let { nonPII, unmark }: Props = $props();
</script>

<!-- No header: the share dialog's tab already names this section. -->
<MarkupHTMLView markup={(l) => l.ui.dialog.share.subheader.pii.explanation} />

{#if nonPII.length === 0}
    <!-- The explanation promises a list, so say when there isn't one rather
         than trailing off into blank space. -->
    <MarkupHTMLView markup={(l) => l.ui.dialog.share.pii.none} />
{:else}
    {#each nonPII as piiText}
        <div class="piiText">
            <span class="piiLabel">{piiText}</span>
            <Button
                background
                tip={(l) => l.ui.dialog.share.button.sensitive.tip}
                action={() => unmark(piiText)}
                ><LocalizedText
                    path={(l) => l.ui.dialog.share.button.sensitive.label}
                /></Button
            >
        </div>
    {/each}
{/if}

<style>
    .piiLabel {
        font-style: italic;
        margin-inline-end: 0.5em;
    }

    .piiText {
        margin-block-start: 0.5em;
    }
</style>
