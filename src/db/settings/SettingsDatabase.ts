import type { SupportedLocale } from '@locale/SupportedLocales';
import { doc, getDoc } from 'firebase/firestore';
import type { SerializedLayout } from '@components/project/Layout';
import Layout from '@components/project/Layout';
import type { WritingLayout } from '@locale/Scripts';
import type Progress from '../../tutorial/Progress';
import { CreatorCollection } from '@db/creators/CreatorDatabase';
import type { Database } from '@db/Database';
import { firestore } from '@db/firebase';
import { AnimationFactorSetting } from '@db/settings/AnimationFactorSetting';
import { AnnotationsSetting } from '@db/settings/AnnotationsSetting';
import type { ArrangementType } from '@db/settings/Arrangement';
import { ArrangementSetting } from '@db/settings/ArrangementSetting';
import {
    BlockDensitySetting,
    type BlockDensity,
} from '@db/settings/BlockDensitySetting';
import { BlocksSetting } from '@db/settings/BlocksSetting';
import { CameraSetting } from '@db/settings/CameraSetting';
import { CaretsSetting } from '@db/settings/CaretsSetting';
import { FoldsSetting } from '@db/settings/FoldsSetting';
import type { Path } from '@nodes/Root';
import type { SerializedCaret } from '@db/projects/ProjectSchemas';
import { DarkSetting } from '@db/settings/DarkSetting';
import { FaceSetting } from '@db/settings/FaceSetting';
import { HowToNotificationsSetting } from '@db/settings/HowToNotificationsSetting';
import { LayoutsSetting } from '@db/settings/LayoutsSetting';
import { LineSetting } from '@db/settings/LinesSetting';
import { LocalesSetting } from '@db/settings/LocalesSetting';
import { MicSetting } from '@db/settings/MicSetting';
import { SaySetting } from '@db/settings/SaySetting';
import { SpaceSetting } from '@db/settings/SpaceSetting';
import { TabSetting } from '@db/settings/TabSetting';
import {
    TutorialProgressSetting,
    type TutorialProgress,
} from '@db/settings/TutorialProgressSetting';
import { UpdatesSetting } from '@db/settings/UpdatesSetting';
import { WellspringSetting } from '@db/settings/WellspringSetting';
import { WrapSetting } from '@db/settings/WrapSetting';
import { WritingLayoutSetting } from '@db/settings/WritingLayoutSetting';
import type { SidebarState } from '@db/settings/SidebarSetting';
import type Setting from '@db/settings/Setting';

/** The schema of the record written to the creators collection. */
export type SettingsSchemaV1 = {
    v: 1;
    tutorial: TutorialProgress;
    locales: SupportedLocale[];
    animationFactor: number;
    writingLayout: WritingLayout;
};

export type SettingsSchemaV2 = Omit<SettingsSchemaV1, 'v'> & {
    v: 2;
    newHowToNotifications: boolean;
};

export type SettingsSchemaV3 = Omit<
    SettingsSchemaV2,
    'v' | 'animationFactor'
> & {
    v: 3;
    /** `null` means "follow the device's prefers-reduced-motion setting". */
    animationFactor: number | null;
};

export type SettingsSchema = SettingsSchemaV3;
const SettingsSchemaLatestVersion = 3;

type SettingsSchemaUnknown =
    | SettingsSchemaV1
    | SettingsSchemaV2
    | SettingsSchema;

function upgradeSettings(settings: SettingsSchemaUnknown): SettingsSchema {
    switch (settings.v) {
        case 1:
            return upgradeSettings({
                ...settings,
                v: 2,
                newHowToNotifications: true,
            });
        case 2:
            return upgradeSettings({ ...settings, v: 3 });
        case SettingsSchemaLatestVersion:
            return settings;
        default:
            throw new Error(`Unknown settings version ${settings}`);
    }
}

/** Enscapsulates settings stored in localStorage. */
export default class SettingsDatabase {
    readonly database: Database;

    /** The current settings */
    readonly settings = {
        layouts: LayoutsSetting,
        carets: CaretsSetting,
        folds: FoldsSetting,
        arrangement: ArrangementSetting,
        animationFactor: AnimationFactorSetting,
        locales: LocalesSetting,
        writingLayout: WritingLayoutSetting,
        tutorial: TutorialProgressSetting,
        face: FaceSetting,
        camera: CameraSetting,
        mic: MicSetting,
        blocks: BlocksSetting,
        blockDensity: BlockDensitySetting,
        dark: DarkSetting,
        space: SpaceSetting,
        lines: LineSetting,
        wrap: WrapSetting,
        annotations: AnnotationsSetting,
        wellspring: WellspringSetting,
        howToNotifications: HowToNotificationsSetting,
        updates: UpdatesSetting,
        say: SaySetting,
        tab: TabSetting,
    };

    constructor(database: Database, locales: SupportedLocale[]) {
        this.database = database;

        // Initialize default languages if none are set
        if (this.settings.locales.get().length === 0 && locales.length > 0)
            this.settings.locales.set(database, locales);

        // Migrate the legacy standalone width settings into the combined
        // sidebar settings, then drop the old keys.
        this.migrateSidebarWidth('annotationsWidth', this.settings.annotations);
        this.migrateSidebarWidth('wellspringWidth', this.settings.wellspring);
    }

    /**
     * One-time migration: an earlier version stored each sidebar's width in its
     * own `<name>Width` localStorage key. Fold a present, valid legacy width
     * into the combined `{ shown, width }` setting and remove the old key.
     */
    private migrateSidebarWidth(
        legacyKey: string,
        setting: Setting<SidebarState>,
    ) {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const raw = window.localStorage.getItem(legacyKey);
        if (raw === null) return;
        try {
            const width = JSON.parse(raw);
            if (typeof width === 'number' && Number.isFinite(width))
                setting.set(this.database, { ...setting.get(), width });
        } catch {
            // Ignore an unparseable legacy value.
        }
        window.localStorage.removeItem(legacyKey);
    }

    async syncUser() {
        if (firestore === undefined) return;
        const user = this.database.getUser();
        if (user === null) return;

        // Get the config from the database. Wrap in read() so an unreachable
        // backend fails fast (and trips the connection banner) instead of
        // hanging the user's settings sync indefinitely.
        let config;
        try {
            config = await this.database.read(
                getDoc(doc(firestore, CreatorCollection, user.uid)),
            );
        } catch (err) {
            this.database.reportLoadFailure(err);
            return;
        }
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
            this.settings.howToNotifications.set(
                this.database,
                data.newHowToNotifications,
            );
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

    /** The persisted caret (offset, range, or node path) for a project source,
     *  or undefined if none. The setting validator has already checked the
     *  stored shape against the project's caret schema. */
    getProjectCaret(
        projectID: string,
        sourceIndex: number,
    ): SerializedCaret | undefined {
        return this.settings.carets.get()[projectID]?.[sourceIndex];
    }

    setProjectCaret(
        projectID: string,
        sourceIndex: number,
        caret: SerializedCaret,
    ) {
        // Skip redundant writes when the caret hasn't changed. Compare by value
        // so all caret forms (offset, range, node path) are handled uniformly.
        const current = this.settings.carets.get()[projectID]?.[sourceIndex];
        if (
            current !== undefined &&
            JSON.stringify(current) === JSON.stringify(caret)
        )
            return;

        const all = this.settings.carets.get();
        this.settings.carets.set(this.database, {
            ...all,
            [projectID]: { ...all[projectID], [sourceIndex]: caret },
        });
    }

    /** Drop a project's persisted carets (on local deletion). */
    removeProjectCarets(projectID: string) {
        const all = this.settings.carets.get();
        if (!(projectID in all)) return;
        const next = { ...all };
        delete next[projectID];
        this.settings.carets.set(this.database, next);
    }

    /** The persisted folded-node paths for a project source, or undefined. */
    getProjectFolds(
        projectID: string,
        sourceIndex: number,
    ): Path[] | undefined {
        return this.settings.folds.get()[projectID]?.[sourceIndex];
    }

    setProjectFolds(projectID: string, sourceIndex: number, paths: Path[]) {
        const current = this.settings.folds.get()[projectID]?.[sourceIndex];
        if (
            current !== undefined &&
            JSON.stringify(current) === JSON.stringify(paths)
        )
            return;
        const all = this.settings.folds.get();
        this.settings.folds.set(this.database, {
            ...all,
            [projectID]: { ...all[projectID], [sourceIndex]: paths },
        });
    }

    /** Drop a project's persisted folds (on local deletion). */
    removeProjectFolds(projectID: string) {
        const all = this.settings.folds.get();
        if (!(projectID in all)) return;
        const next = { ...all };
        delete next[projectID];
        this.settings.folds.set(this.database, next);
    }

    setArrangement(arrangement: ArrangementType) {
        this.settings.arrangement.set(this.database, arrangement);
    }

    setAnimationFactor(factor: number | null) {
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

    setVoice(voiceURI: string | null) {
        this.settings.say.set(this.database, voiceURI);
    }

    getVoice() {
        return this.settings.say.get();
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

    setWrap(on: boolean) {
        this.settings.wrap.set(this.database, on);
    }

    getWrap() {
        return this.settings.wrap.get();
    }

    setShowAnnotations(on: boolean) {
        const current = this.settings.annotations.get();
        this.settings.annotations.set(this.database, { ...current, shown: on });
    }

    setAnnotationsWidth(width: number) {
        const current = this.settings.annotations.get();
        this.settings.annotations.set(this.database, { ...current, width });
    }

    setShowWellspring(on: boolean) {
        const current = this.settings.wellspring.get();
        this.settings.wellspring.set(this.database, { ...current, shown: on });
    }

    setWellspringWidth(width: number) {
        const current = this.settings.wellspring.get();
        this.settings.wellspring.set(this.database, { ...current, width });
    }

    getDark() {
        return this.settings.dark.get();
    }

    getSpace() {
        return this.settings.space.get();
    }

    setTab(on: boolean) {
        this.settings.tab.set(this.database, on);
    }

    getTab() {
        return this.settings.tab.get();
    }

    setBlocks(on: boolean) {
        this.settings.blocks.set(this.database, on);
    }

    getBlocks() {
        return this.settings.blocks.get();
    }

    setBlockDensity(density: BlockDensity) {
        this.settings.blockDensity.set(this.database, density);
    }

    getBlockDensity() {
        return this.settings.blockDensity.get();
    }

    setHowToNotifications(on: boolean) {
        this.settings.howToNotifications.set(this.database, on);
    }

    getHowToNotifications() {
        return this.settings.howToNotifications.get();
    }

    getUpdatesLastChecked() {
        return this.settings.updates.get();
    }

    setUpdatesLastChecked(date: string) {
        this.settings.updates.set(this.database, date);
    }

    /** To serialize to a database */
    toObject(): SettingsSchema {
        // Get the config, but delete all device-specific configs.
        return {
            v: SettingsSchemaLatestVersion,
            animationFactor: this.settings.animationFactor.get(),
            locales: this.settings.locales.get(),
            tutorial: this.settings.tutorial.get(),
            writingLayout: this.settings.writingLayout.get(),
            newHowToNotifications: this.settings.howToNotifications.get(),
        };
    }
}
