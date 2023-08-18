import { test, expect } from 'vitest';
import { makeProject, wpToStuff, type Stuff, examples } from './examples';
import en from '../locale/en-US.json';
import type Locale from '../locale/Locale';
import Listen from './Listen.wp?raw';
import Talk from './Talk.wp?raw';
import Laughing from './Laughing.wp?raw';
import Layouts from './Layouts.wp?raw';
import Transforms from './WildTransforms.wp?raw';
import Move from './Move.wp?raw';
import Colors from './Colors.wp?raw';
import TextTransitions from './TextTransitions.wp?raw';
import Video from './Video.wp?raw';
import RainingLetters from './RainingLetters.wp?raw';
import Garden from './Garden.wp?raw';
import Between from './Between.wp?raw';
import RotatingBinary from './RotatingBinary.wp?raw';
import Greeting from './Greeting.wp?raw';
import Amplitude from './Amplitude.wp?raw';

export const testExamples: Stuff[] = [
    Listen,
    Talk,
    Laughing,
    Layouts,
    Transforms,
    Move,
    Colors,
    TextTransitions,
    Video,
    RainingLetters,
    Garden,
    Between,
    RotatingBinary,
    Greeting,
    Amplitude,
].map((source) => wpToStuff(source));

test.each([...examples, ...testExamples])(
    `Ensure $name has no conflicts`,
    async (example: Stuff) => {
        const project = await makeProject(example);
        project.analyze();
        project.getAnalysis();
        const context = project.getContext(project.main);
        for (const conflict of Array.from(
            project.getPrimaryConflicts().values()
        ).flat()) {
            const conflictingNodes = conflict.getConflictingNodes();
            console.error(
                conflictingNodes.primary.explanation(en as Locale, context)
            );
        }
        expect(project.getPrimaryConflicts()).toHaveLength(0);
    }
);
