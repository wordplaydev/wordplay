<script lang="ts">
    import Switch from '../widgets/Switch.svelte';
    import { getEvaluation } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import { locales } from '../../db/Database';
    import CommandButton from '../widgets/CommandButton.svelte';
    import {
        Pause,
        Play,
        Restart,
        StepBack,
        StepBackInput,
        StepBackNode,
        StepForward,
        StepForwardInput,
        StepForwardNode,
        StepOut,
        StepToPresent,
        StepToStart,
    } from '../editor/util/Commands';

    export let evaluator: Evaluator;

    const evaluation = getEvaluation();
</script>

<CommandButton command={Restart} />
<Switch
    on={$evaluation?.playing === true}
    toggle={(play) => (play ? evaluator.play() : evaluator.pause())}
    offTip={$locales.get(Pause.description)}
    onTip={$locales.get(Play.description)}
    offLabel={Pause.symbol}
    onLabel={Play.symbol}
    uiid="playToggle"
/>
<CommandButton command={StepToStart} />
<CommandButton command={StepBackInput} />
<CommandButton command={StepBackNode} />
<CommandButton command={StepBack} />
<CommandButton command={StepOut} />
<CommandButton command={StepForward} />
<CommandButton command={StepForwardNode} />
<CommandButton command={StepForwardInput} />
<CommandButton command={StepToPresent} />
