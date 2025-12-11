<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import TextField from '@components/widgets/TextField.svelte';

    let show: boolean = false;
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

</Dialog>
