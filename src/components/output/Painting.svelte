<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';

    interface Props {
        painting: boolean;
    }

    let { painting = $bindable() }: Props = $props();
</script>

<Switch
    on={painting}
    toggle={(on) => (painting = on)}
    offTip={(l) => l.ui.output.toggle.paint.off}
    onTip={(l) => l.ui.output.toggle.paint.on}
    offLabel="✥"
    onLabel="🖌️"
    shortcut={undefined}
/>
