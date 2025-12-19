<script lang="ts">
    import { page } from '$app/state';
    import Subheader from '@components/app/Subheader.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { HowTos } from '@db/Database';

    let show: boolean = $state(false);
    let notify: boolean = $state(true);
    let howToContent: string = $state('');

    interface Props {
        midpointX: number;
        midpointY: number;
    }

    let { midpointX, midpointY }: Props = $props();

    const galleryId: string = decodeURI(page.params.galleryid);
    // const reactionOptions: string[] = $locales.ui.howto.reactions.map(
    //     (r: ButtonText) => r.label,
    // );
    const reactionOptions: string[] = ['👍', '💭', '🙏', '🎉', '🤩', '😁'];

    function saveDraft() {
        HowTos.addHowTo(
            galleryId,
            false,
            midpointX,
            midpointY,
            [],
            '',
            [],
            [howToContent],
            ['en-US'],
            reactionOptions,
        );
    }

    function postHowTo() {
        HowTos.addHowTo(
            galleryId,
            true,
            midpointX,
            midpointY,
            [],
            '',
            [],
            [howToContent],
            ['en-US'],
            reactionOptions,
        );
    }
</script>

<Dialog
    bind:show
    header={(l) => l.ui.howto.newHowTo.form.header}
    explanation={(l) => l.ui.howto.newHowTo.form.explanation}
    button={{
        tip: (l) => l.ui.howto.newHowTo.add.tip,
        icon: '+',
        large: true,
    }}
>
    <Subheader text={(l) => l.ui.howto.newHowTo.prompt} />

    <FormattedEditor
        placeholder={(l) => l.ui.howto.newHowTo.editorPlaceholder}
        description={(l) => l.ui.howto.newHowTo.editorDescription}
        bind:text={howToContent}
        id="howto-prompt"
    />

    <div class="toolbar">
        <label for="notify-checked">
            <Checkbox
                id="notify-checked"
                on={notify}
                changed={(value) => (notify = value ?? true)}
                label={(l) => l.ui.howto.newHowTo.notificationOptOut}
            />
            <LocalizedText
                path={(l) => l.ui.howto.newHowTo.notificationOptOut}
            />
        </label>
        <Button
            tip={(l) => l.ui.howto.newHowTo.save.tip}
            label={(l) => l.ui.howto.newHowTo.save.label}
            action={() => {
                saveDraft();
                show = false;
            }}
            active={true}
        />
        <Button
            tip={(l) => l.ui.howto.newHowTo.post.tip}
            label={(l) => l.ui.howto.newHowTo.post.label}
            action={() => {
                postHowTo();
                show = false;
            }}
            active={true}
            submit={true}
        />
    </div>
</Dialog>

<style>
    .toolbar {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        padding-top: var(--wordplay-spacing);
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }
</style>
