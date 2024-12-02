<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';
    import { locales } from '../../db/Database';

    interface Props {
        painting: boolean;
    }

    let { painting = $bindable() }: Props = $props();
</script>

<Switch
    on={painting}
    toggle={(on) => (painting = on)}
    offTip={$locales.get((l) => l.ui.output.toggle.paint.off)}
    onTip={$locales.get((l) => l.ui.output.toggle.paint.on)}
    offLabel="✥"
    onLabel="🖌️"
/>
