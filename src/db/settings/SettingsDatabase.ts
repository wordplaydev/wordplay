import { LayoutsSetting } from './LayoutsSetting';
import { ArrangementSetting } from './ArrangementSetting';
import { AnimationFactorSetting } from './AnimationFactorSetting';
import { LocalesSetting } from './LocalesSetting';
import { WritingLayoutSetting } from './WritingLayoutSetting';
import {
    TutorialProgressSetting,
    type TutorialProgress,
} from './TutorialProgressSetting';
import { CameraSetting } from './CameraSetting';
import { MicSetting } from './MicSetting';
import { derived } from 'svelte/store';
import type { SupportedLocale } from '@locale/SupportedLocales';
import type { Database } from '../Database';
import type { SerializedLayout } from '../../components/project/Layout';
import type Arrangement from './Arrangement';
import type { WritingLayout } from '../../locale/Scripts';
import type Progress from '../../tutorial/Progress';
import Layout from '../../components/project/Layout';
import { BlocksSetting } from './BlocksSetting';
import { DarkSetting } from './DarkSetting';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { CreatorCollection } from '../creators/CreatorDatabase';
import { SpaceSetting } from './SpaceSetting';
import { LineSetting } from './LinesSetting';
import { AnnotationsSetting } from './AnnotationsSetting';
import { FaceSetting } from './FaceSetting';

/** The schema of the record written to the creators collection. */
export type SettingsSchemaV1 = {
    v: 1;
    tutorial: TutorialProgress;
    locales: SupportedLocale[];
    animationFactor: number;
    writingLayout: WritingLayout;
};

export type SettingsSchema = SettingsSchemaV1;

type SettingsSchemaUnknown = SettingsSchemaV1;

function upgradeSettings(settings: SettingsSchemaUnknown): SettingsSchema {
    switch (settings.v) {
        case 1:
            return settings;
        default:
            throw new Error(`Unknown settings version ${settings.v}`);
    }
}

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
        face: FaceSetting,
        camera: CameraSetting,
        mic: MicSetting,
        blocks: BlocksSetting,
        dark: DarkSetting,
        space: SpaceSetting,
        lines: LineSetting,
        annotations: AnnotationsSetting,
    };

    /** A derived store based on animation factor */
    readonly animationDuration = derived(
        this.settings.animationFactor.value,
        (factor) => factor * 200,
    );

    constructor(database: Database, locales: SupportedLocale[]) {
        this.database = database;

        // Initialize default languages if none are set
        if (this.settings.locales.get().length === 0 && locales.length > 0)
            this.settings.locales.set(database, locales);
    }

    async syncUser() {
        if (firestore === undefined) return;
        const user = this.database.getUser();
        if (user === null) return;

        // Get the config from the database
        const config = await getDoc(
            doc(firestore, CreatorCollection, user.uid),
        );
        if (config.exists()) {
            const data = upgradeSettings(
                config.data() as SettingsSchemaUnknown,
            );
            // Copy each key/value pair from the database to memory and the local store.
            this.settings.animationFactor.set(
                this.database,
                data.animationFactor,
            );
            this.settings.locales.set(this.database, data.locales);
            this.settings.tutorial.set(this.database, data.tutorial);
            this.settings.writingLayout.set(this.database, data.writingLayout);
        }
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
            Object.entries(this.settings.layouts.get()),
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
        this.settings.tutorial.set(this.database, progress.serialize());
    }

    setFace(face: string | null) {
        this.settings.face.set(this.database, face);
    }

    getFace() {
        return this.settings.face.get();
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

    setSpace(space: boolean) {
        this.settings.space.set(this.database, space);
    }

    setLines(on: boolean) {
        this.settings.lines.set(this.database, on);
    }

    setShowAnnotations(on: boolean) {
        this.settings.annotations.set(this.database, on);
    }

    getDark() {
        return this.settings.dark.get();
    }

    getSpace() {
        return this.settings.space.get();
    }

    setBlocks(on: boolean) {
        this.settings.blocks.set(this.database, on);
    }

    getBlocks() {
        return this.settings.blocks.get();
    }

    /** To serialize to a database */
    toObject(): SettingsSchema {
        // Get the config, but delete all device-specific configs.
        return {
            v: 1,
            animationFactor: this.settings.animationFactor.get(),
            locales: this.settings.locales.get(),
            tutorial: this.settings.tutorial.get(),
            writingLayout: this.settings.writingLayout.get(),
        };
    }
}
