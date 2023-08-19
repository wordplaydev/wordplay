import { test, expect } from 'vitest';
import { examples, wpToSerializedProjects } from './examples';
import en from '../locale/en-US.json';
import type Locale from '../locale/Locale';
import Listen from './Listen.wp?raw';
import Talk from './Talk.wp?raw';
import Laughing from './Laughing.wp?raw';
import Layouts from './Layouts.wp?raw';
import Transforms from './WildTransforms.wp?raw';
import Colors from './Colors.wp?raw';
import TextTransitions from './TextTransitions.wp?raw';
import Garden from './Garden.wp?raw';
import Between from './Between.wp?raw';
import RotatingBinary from './RotatingBinary.wp?raw';
import Greeting from './Greeting.wp?raw';
import Amplitude from './Amplitude.wp?raw';
import type { SerializedProject } from '../models/Project';
import Project from '../models/Project';
import { Locales } from '../db/Database';

export const testExamples = wpToSerializedProjects([
    Listen,
    Talk,
    Laughing,
    Layouts,
    Transforms,
    Colors,
    TextTransitions,
    Garden,
    Between,
    RotatingBinary,
    Greeting,
    Amplitude,
]);

test.each([...examples.values(), ...testExamples.values()])(
    `Ensure $name has no conflicts`,
    async (example: SerializedProject) => {
        const project = await Project.deserializeProject(Locales, example);
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
