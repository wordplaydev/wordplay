<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { locales } from '@db/Database';

    export let nonPII: string[];
    export let unmark: (piiText: string) => void;
</script>

<Subheader>
    {$locales.get((l) => l.ui.dialog.share.subheader.pii.header)}
</Subheader>

<MarkupHtmlView
    markup={$locales.get((l) => l.ui.dialog.share.subheader.pii.explanation)}
/>

{#each nonPII as piiText}
    <div class="piiText">
        <span class="piiLabel">{piiText}</span>
        <Button
            background
            tip={$locales.get((l) => l.ui.dialog.share.button.sensitive.tip)}
            action={() => unmark(piiText)}
            >{$locales.get((l) => l.ui.dialog.share.button.sensitive.label)}</Button>
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