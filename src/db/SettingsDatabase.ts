import { LayoutsSetting } from './LayoutsSetting';
import { ArrangementSetting } from './ArrangementSetting';
import { AnimationFactorSetting } from './AnimationFactorSetting';
import { LocalesSetting } from './LocalesSetting';
import { WritingLayoutSetting } from './WritingLayoutSetting';
import { TutorialProgressSetting } from './TutorialProgressSetting';
import { CameraSetting } from './CameraSetting';
import { MicSetting } from './MicSetting';
import { derived } from 'svelte/store';
import type { SupportedLocale } from '../locale/Locale';
import type { Database } from './Database';
import type { SerializedLayout } from '../components/project/Layout';
import type Arrangement from './Arrangement';
import type { WritingLayout } from '../locale/Scripts';
import type Progress from '../tutorial/Progress';
import Layout from '../components/project/Layout';
import { BlocksSetting } from './BlocksSetting';
import { DarkSetting } from './DarkSetting';

/** Enscapsulates settings stored in localStorage. */
export default class SettingsDatabase {
    readonly database: Database;

    /** The current settings */
    readonly settings = {
        layouts: LayoutsSetting,
        arrangement: ArrangementSetting,
        animationFactor: AnimationFactorSetting,
        locales: LocalesSetting,
        writingLayout: WritingLayoutSetting,
        tutorial: TutorialProgressSetting,
        camera: CameraSetting,
        mic: MicSetting,
        blocks: BlocksSetting,
        dark: DarkSetting,
    };

    /** A derived store based on animation factor */
    readonly animationDuration = derived(
        this.settings.animationFactor.value,
        (factor) => factor * 200
    );

    constructor(database: Database, locales: SupportedLocale[]) {
        this.database = database;

        // Initialize default languages if none are set
        if (this.settings.locales.get().length === 0 && locales.length > 0)
            this.settings.locales.set(database, locales);
    }

    getProjectLayout(id: string) {
        const layouts = this.settings.layouts.get();
        const layout = layouts ? layouts[id] : null;
        return layout ? Layout.fromObject(id, layout) : null;
    }

    setProjectLayout(id: string, layout: Layout) {
        // Has the layout changed?
        const currentLayoutObject = this.settings.layouts.get()[id] ?? null;
        const currentLayout = currentLayoutObject
            ? Layout.fromObject(id, currentLayoutObject)
            : null;
        if (currentLayout !== null && currentLayout.isEqualTo(layout)) return;

        const newLayout = Object.fromEntries(
            Object.entries(this.settings.layouts.get())
        );
        newLayout[id] = layout.toObject();
        this.setLayout(newLayout);
    }

    setLayout(layouts: Record<string, SerializedLayout>) {
        this.settings.layouts.set(this.database, layouts);
    }

    setArrangement(arrangement: Arrangement) {
        this.settings.arrangement.set(this.database, arrangement);
    }

    setAnimationFactor(factor: number) {
        this.settings.animationFactor.set(this.database, factor);
    }

    setWritingLayout(layout: WritingLayout) {
        this.settings.writingLayout.set(this.database, layout);
    }

    setTutorialProgress(progress: Progress) {
        this.settings.tutorial.set(this.database, progress.seralize());
    }

    getCamera() {
        return this.settings.camera.get();
    }

    setCamera(deviceID: string | null) {
        this.settings.camera.set(this.database, deviceID);
    }

    setMic(deviceID: string | null) {
        this.settings.mic.set(this.database, deviceID);
    }

    getMic() {
        return this.settings.mic.get();
    }

    setDark(dark: boolean | null) {
        this.settings.dark.set(this.database, dark);
    }

    getDark() {
        return this.settings.dark.get();
    }

    setBlocks(on: boolean) {
        this.settings.blocks.set(this.database, on);
    }

    /** To serialize to a database */
    toObject() {
        // Get the config, but delete all device-specific configs.
        const settings: Record<string, unknown> = {};
        for (const [key, setting] of Object.entries(this.settings)) {
            if (!setting.device) {
                const value = setting.get();
                if (value !== null) settings[key] = value;
            }
        }
        return settings;
    }
}
