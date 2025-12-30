<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import EmojiChooser from '@components/widgets/EmojiChooser.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import type { ButtonText } from '@locale/UITexts';
    import { CANCEL_SYMBOL } from '@parser/Symbols';

    let expandedScope: boolean = $state(false);
    let guidingQuestionsText: string = $state('');
    let reactions: ButtonText[] = $state(
        $locales.get((l) => l.ui.howto.viewHowTo.reactions),
    );
    let showReactionOptions: boolean[] = $state(
        Array(reactions.length).fill(false),
    );
</script>

<Dialog
    header={(l) => l.ui.howto.configuration.configurationDialog.header}
    explanation={(l) =>
        l.ui.howto.configuration.configurationDialog.explanation}
    button={{
        tip: (l) => l.ui.howto.configuration.configurationButton.tip,
        label: (l) => l.ui.howto.configuration.configurationButton.label,
    }}
>
    <Subheader
        text={(l) => l.ui.howto.configuration.visibility.subheader.header}
    />
    <MarkupHTMLView
        markup={(l) =>
            l.ui.howto.configuration.visibility.subheader.explanation}
    />
    <Mode
        choice={expandedScope ? 1 : 0}
        modes={[
            $locales.get((l) => l.ui.howto.configuration.visibility.limited),
            $locales.get((l) => l.ui.howto.configuration.visibility.expanded),
        ]}
        descriptions={(l) => l.ui.howto.configuration.visibility.mode}
        select={(num) => (expandedScope = num === 1)}
    />

    <Subheader
        text={(l) => l.ui.howto.configuration.guidingQuestions.subheader.header}
    />
    <MarkupHTMLView
        markup={(l) =>
            l.ui.howto.configuration.guidingQuestions.subheader.explanation}
    />
    <FormattedEditor
        id="guidingquestions"
        description={(l) =>
            l.ui.howto.configuration.guidingQuestions.descriptor}
        placeholder={(l) => l.ui.howto.newHowTo.prompt}
        bind:text={guidingQuestionsText}
    />
    <Button
        label={(l) => l.ui.howto.configuration.guidingQuestions.submit.label}
        tip={(l) => l.ui.howto.configuration.guidingQuestions.submit.tip}
        action={() => {
            // Save guiding questions logic here.
        }}
        submit={true}
        background={true}
    />

    <Subheader
        text={(l) => l.ui.howto.configuration.reactions.subheader.header}
    />
    <MarkupHTMLView
        markup={(l) => l.ui.howto.configuration.reactions.subheader.explanation}
    />
    {#each reactions as reaction, index}
        <div class="reactionConfiguration">
            <Button
                tip={(l) =>
                    l.ui.howto.configuration.reactions.reactionPickerTip}
                action={() =>
                    (showReactionOptions[index] = !showReactionOptions[index])}
                icon={reaction.label}
            />

            <TextField
                id={'reactiondescription' + index}
                description={(l) =>
                    l.ui.howto.configuration.reactions.reactionDescriptionTip}
                placeholder={(l) =>
                    l.ui.howto.configuration.reactions.reactionDescriptionTip}
                bind:text={reaction.tip}
            />

            <Button
                tip={(l) =>
                    l.ui.howto.configuration.reactions.removeReactionTip}
                icon={CANCEL_SYMBOL}
                action={() => {
                    reactions.splice(index, 1);
                    showReactionOptions.splice(index, 1);
                }}
            />
        </div>
        {#if showReactionOptions[index]}
            <EmojiChooser
                pick={(emoji) => (reactions[index]['label'] = emoji)}
                emoji={reaction.label}
            />
        {/if}
    {/each}
    <Button
        tip={(l) => l.ui.howto.configuration.reactions.addReactionTip}
        icon={'+'}
        action={() => {
            reactions.push({ label: '😀', tip: '' });
            showReactionOptions.push(false);
        }}
    />
    <Button
        label={(l) => l.ui.howto.configuration.reactions.submit.label}
        tip={(l) => l.ui.howto.configuration.reactions.submit.tip}
        action={() => {
            // Save reactions logic here.
        }}
        submit={true}
        background={true}
    />
</Dialog>

<style>
    .reactionConfiguration {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }
</style>
