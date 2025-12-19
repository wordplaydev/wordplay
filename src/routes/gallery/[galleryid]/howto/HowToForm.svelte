<script lang="ts">
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { HowTos, locales } from '@db/Database';

    let show: boolean = $state(false);
    let notify: boolean = $state(true);
    let howToTitle: string = $state('');
    let howToContent: string = $state('');

    interface Props {
        midpointX: number;
        midpointY: number;
    }

    let { midpointX, midpointY }: Props = $props();

    const galleryId: string = decodeURI(page.params.galleryid);
    const reactionOptions: string[] = $locales
        .get((l) => l.ui.howto.reactions)
        .map((b) => b.label);

    function writeNewHowTo(publish: boolean) {
        HowTos.addHowTo(
            galleryId,
            publish,
            midpointX,
            midpointY,
            [],
            howToTitle,
            [$locales.get((l) => l.ui.howto.newHowTo.prompt)],
            [howToContent],
            ['en-US'],
            reactionOptions,
        );

        howToContent = '';
        howToTitle = '';

        // TODO(@mc) -- need to refresh DB
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
    <Header>
        <TextField
            bind:text={howToTitle}
            description={(l) => l.ui.howto.newHowTo.title.description}
            placeholder={(l) => l.ui.howto.newHowTo.title.placeholder}
            id="howto-title"
        />
    </Header>

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
                writeNewHowTo(false);
                show = false;
            }}
            active={true}
        />
        <Button
            tip={(l) => l.ui.howto.newHowTo.post.tip}
            label={(l) => l.ui.howto.newHowTo.post.label}
            action={() => {
                writeNewHowTo(true);
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
