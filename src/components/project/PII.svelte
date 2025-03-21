<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';

    interface Props {
        nonPII: string[];
        unmark: (piiText: string) => void;
    }

    let { nonPII, unmark }: Props = $props();
</script>

<Subheader text={(l) => l.ui.dialog.share.subheader.pii.header} />

<MarkupHTMLView markup={(l) => l.ui.dialog.share.subheader.pii.explanation} />

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

<style>
    .piiLabel {
        font-style: italic;
        margin-right: 0.5em;
    }

    .piiText {
        margin-block-start: 0.5em;
    }
</style>
