import type { SupportedLocale } from '@locale/SupportedLocales';
import { doc, getDoc } from 'firebase/firestore';
import type { SerializedLayout } from '@components/project/Layout';
import Layout from '@components/project/Layout';
import type { WritingLayoutChoice } from '@locale/Scripts';
import type Progress from '../../tutorial/Progress';
import { CreatorCollection } from '@db/creators/CreatorDatabase';
import type { Database } from '@db/Database';
import { firestore } from '@db/firebase';
import { AnimationFactorSetting } from '@db/settings/AnimationFactorSetting';
import { AnnotationsSetting } from '@db/settings/AnnotationsSetting';
import type { ArrangementType } from '@db/settings/Arrangement';
import { ArrangementSetting } from '@db/settings/ArrangementSetting';
import type { StagePlacementType } from '@db/settings/StagePlacement';
import { StagePlacementSetting } from '@db/settings/StagePlacementSetting';
import { AdaptOutputSetting } from '@db/settings/AdaptOutputSetting';
import {
    BlockDensitySetting,
    type BlockDensity,
} from '@db/settings/BlockDensitySetting';
import { BlocksSetting } from '@db/settings/BlocksSetting';
import { WordsSetting } from '@db/settings/WordsSetting';
import { CameraSetting } from '@db/settings/CameraSetting';
import { ChatLanguageSetting } from '@db/settings/ChatLanguageSetting';
import { CaretsSetting } from '@db/settings/CaretsSetting';
import { FoldsSetting } from '@db/settings/FoldsSetting';
import type { Path } from '@nodes/Root';
import type { SerializedCaret } from '@db/projects/ProjectSchemas';
import { DarkSetting } from '@db/settings/DarkSetting';
import { FaceSetting } from '@db/settings/FaceSetting';
import { HowToNotificationsSetting } from '@db/settings/HowToNotificationsSetting';
import { LayoutsSetting } from '@db/settings/LayoutsSetting';
import {
    ProjectFoldersSetting,
    type ProjectFolder,
    type ProjectFolders,
} from '@db/settings/ProjectFoldersSetting';
import { ToursSetting, type ToursTaken } from '@db/settings/ToursSetting';
import {
    ChatThreadsSetting,
    type ChatThreadsSeen,
} from '@db/settings/ChatThreadsSetting';
import type { TourID } from '@components/project/tours';
import {
    ProjectSortSetting,
    type ProjectSort,
} from '@db/settings/ProjectSortSetting';
import { LineSetting } from '@db/settings/LinesSetting';
import { CaptionSizeSetting } from '@db/settings/CaptionSizeSetting';
import {
    AnimationCuesSetting,
    ContactCuesSetting,
    CuesSetting,
} from '@db/settings/CuesSetting';
import { LocalesSetting } from '@db/settings/LocalesSetting';
import { MicSetting } from '@db/settings/MicSetting';
import type { MusicVisualization } from '@db/settings/MusicSettings';
import {
    HapticsSetting,
    MusicDuckingSetting,
    MusicVisualizationSetting,
    MusicVolumeSetting,
} from '@db/settings/MusicSettings';
import { SaySetting } from '@db/settings/SaySetting';
import { SpaceSetting } from '@db/settings/SpaceSetting';
import { TabSetting } from '@db/settings/TabSetting';
import {
    TutorialSetting,
    type TutorialProgress,
    type TutorialState,
} from '@db/settings/TutorialProgressSetting';
import { DefaultProgress } from '@db/settings/TutorialProgressSetting';
import { ContrastLanguageSetting } from '@db/settings/ContrastLanguageSetting';
import type { TutorialMode } from '../../tutorial/TutorialMode';
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
    writingLayout: WritingLayoutChoice;
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

export type SettingsSchemaV4 = Omit<SettingsSchemaV3, 'v' | 'tutorial'> & {
    v: 4;
    /** All tutorial state (chosen mode + per-tutorial progress), consolidated under one key. */
    tutorial: TutorialState;
};

/**
 * v5 adds the projects page's organization: the creator's folders, and the one
 * sort order that applies to all of them.
 *
 * Both live here rather than in localStorage because filing your projects is
 * organization you expect to find again on another device — and because folder
 * *membership* is already on the project doc, which syncs. Splitting the two
 * halves across a synced field and a device-local one would show a creator
 * their projects filed into folders that don't exist on that device.
 *
 * The document this becomes is overwritten wholesale by uploadSettings, so
 * anything added here has to be read in syncUser and written in toObject in
 * the same change, or the next write of any other setting silently drops it.
 */
export type SettingsSchemaV5 = Omit<SettingsSchemaV4, 'v'> & {
    v: 5;
    /** The creator's project folders, by ID. */
    projectFolders: ProjectFolders;
    /** How the projects page orders projects, everywhere. */
    projectSort: ProjectSort;
};

/**
 * v6 adds four preferences that were already flagged `device: false` — and so
 * already paying for a full creator-doc write on every change — but appeared in
 * neither `toObject` nor `syncUser`, and so never actually crossed devices.
 *
 * They're optional because a v5 document genuinely lacks them: filling in
 * defaults during the upgrade would let the first sync after this ships
 * overwrite whatever the creator had chosen on that device. So `syncUser`
 * applies each only when present, while `toObject` always writes all four.
 */
export type SettingsSchemaV6 = Omit<SettingsSchemaV5, 'v'> & {
    v: 6;
    /** The chosen typeface, or null to follow the locale's default. */
    face?: string | null;
    /** Whether the text editor numbers its lines. */
    lines?: boolean;
    /** Whether the text editor soft wraps. */
    wrap?: boolean;
    /** Whether the editor draws space and line-break markers. */
    space?: boolean;
};

/**
 * v7 adds the interface tours the creator has taken. The tutorial holds a
 * learner at the step that offers a tour until it's in here, so a creator who
 * toured the editor on one device shouldn't be gated again on another.
 *
 * Optional for the same reason the v6 fields are: a v6 document genuinely lacks
 * it, and filling in a default during the upgrade would let the first sync
 * after this ships erase tours the creator had already taken on that device.
 */
export type SettingsSchemaV7 = Omit<SettingsSchemaV6, 'v'> & {
    v: 7;
    /** The interface tours this creator has taken. */
    tours?: ToursTaken;
};

/**
 * v8 adds how much of each chat thread the creator has already read, so the
 * "new replies" marker means the same thing on every device they use.
 *
 * Optional for the same reason the v6 and v7 fields are: a v7 document
 * genuinely lacks it, and filling in a default during the upgrade would let the
 * first sync after this ships mark every thread unread on a device where they
 * had read them.
 */
export type SettingsSchemaV8 = Omit<SettingsSchemaV7, 'v'> & {
    v: 8;
    /** How many replies each thread had when this creator last read it. */
    chatThreads?: ChatThreadsSeen;
};

export type SettingsSchema = SettingsSchemaV8;
const SettingsSchemaLatestVersion = 8;

type SettingsSchemaUnknown =
    | SettingsSchemaV1
    | SettingsSchemaV2
    | SettingsSchemaV3
    | SettingsSchemaV4
    | SettingsSchemaV5
    | SettingsSchemaV6
    | SettingsSchemaV7
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
        case 3:
            // Consolidate the old flat tutorial progress into the new state shape, defaulting the
            // chosen mode to the complete tutorial since the creator already had progress.
            return upgradeSettings({
                ...settings,
                v: 4,
                tutorial: {
                    mode: 'complete',
                    progress: { complete: settings.tutorial },
                },
            });
        case 4:
            // v4→v5: a creator who predates folders has none, and the default
            // ordering is the alphabetical one the page has always used.
            return upgradeSettings({
                ...settings,
                v: 5,
                projectFolders: {},
                projectSort: 'name',
            });
        case 5:
            // v5→v6: nothing to fill in. The four new fields stay absent until
            // the creator's next settings write, so this upgrade can't stomp a
            // local choice with a default.
            return upgradeSettings({ ...settings, v: 6 });
        case 6:
            // v6→v7: nothing to fill in, for the same reason as v5→v6 — an
            // absent `tours` means "unknown", not "none taken".
            return upgradeSettings({ ...settings, v: 7 });
        case 7:
            // v7→v8: nothing to fill in either — an absent `chatThreads` means
            // "unknown", not "has read nothing".
            return upgradeSettings({ ...settings, v: 8 });
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
        stagePlacement: StagePlacementSetting,
        animationFactor: AnimationFactorSetting,
        locales: LocalesSetting,
        writingLayout: WritingLayoutSetting,
        tutorial: TutorialSetting,
        contrastLanguage: ContrastLanguageSetting,
        face: FaceSetting,
        camera: CameraSetting,
        chatLanguage: ChatLanguageSetting,
        mic: MicSetting,
        blocks: BlocksSetting,
        words: WordsSetting,
        blockDensity: BlockDensitySetting,
        dark: DarkSetting,
        adaptOutput: AdaptOutputSetting,
        space: SpaceSetting,
        lines: LineSetting,
        wrap: WrapSetting,
        annotations: AnnotationsSetting,
        wellspring: WellspringSetting,
        howToNotifications: HowToNotificationsSetting,
        updates: UpdatesSetting,
        say: SaySetting,
        tab: TabSetting,
        musicVisualization: MusicVisualizationSetting,
        musicVolume: MusicVolumeSetting,
        musicDucking: MusicDuckingSetting,
        haptics: HapticsSetting,
        cues: CuesSetting,
        animationCues: AnimationCuesSetting,
        contactCues: ContactCuesSetting,
        captionSize: CaptionSizeSetting,
        projectFolders: ProjectFoldersSetting,
        projectSort: ProjectSortSetting,
        tours: ToursSetting,
        chatThreads: ChatThreadsSetting,
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
        // backend fails fast (and feeds the connection state, which reports
        // only if the outage persists) instead of hanging the user's settings
        // sync indefinitely.
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
            this.settings.projectFolders.set(
                this.database,
                data.projectFolders,
            );
            this.settings.projectSort.set(this.database, data.projectSort);
            // Absent in a document written before v6. Each is applied only when
            // present so an older document leaves this device's choice alone
            // rather than resetting it to the default. `face` is checked against
            // undefined specifically, since null is one of its real values.
            if (data.face !== undefined)
                this.settings.face.set(this.database, data.face);
            if (data.lines !== undefined)
                this.settings.lines.set(this.database, data.lines);
            if (data.wrap !== undefined)
                this.settings.wrap.set(this.database, data.wrap);
            if (data.space !== undefined)
                this.settings.space.set(this.database, data.space);
            if (data.tours !== undefined)
                this.settings.tours.set(this.database, data.tours);
            if (data.chatThreads !== undefined)
                this.settings.chatThreads.set(this.database, data.chatThreads);
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

    /** The interface tours this creator has taken. */
    getToursTaken(): ToursTaken {
        return this.settings.tours.get();
    }

    /** Remember that a tour was taken, from wherever it was launched — the ⓘ
     *  button on a tile counts, so a creator who already toured the editor is
     *  never held at the tutorial step that offers it. */
    markTourTaken(id: TourID) {
        const taken = this.getToursTaken();
        if (taken.includes(id)) return;
        this.settings.tours.set(this.database, [...taken, id]);
    }

    /** How many replies a thread had when this creator last read it, or zero
     *  for one they have never opened. */
    getThreadRepliesSeen(chat: string, root: string): number {
        return this.settings.chatThreads.get()[chat]?.[root] ?? 0;
    }

    /** Remember that this creator has now seen a thread's replies. Only ever
     *  moves forward: reading an older copy of a conversation shouldn't
     *  re-announce replies they have already read. */
    markThreadRead(chat: string, root: string, replies: number) {
        const seen = this.settings.chatThreads.get();
        if ((seen[chat]?.[root] ?? 0) >= replies) return;
        this.settings.chatThreads.set(this.database, {
            ...seen,
            [chat]: { ...(seen[chat] ?? {}), [root]: replies },
        });
    }

    /** The creator's project folders, by ID. */
    getProjectFolders(): ProjectFolders {
        return this.settings.projectFolders.get();
    }

    /** Add or replace one folder. */
    setProjectFolder(id: string, folder: ProjectFolder) {
        this.settings.projectFolders.set(this.database, {
            ...this.settings.projectFolders.get(),
            [id]: folder,
        });
    }

    /** Forget a folder. Its projects are the caller's to deal with first —
     *  a project pointing at a folder that no longer exists falls back to the
     *  top level rather than disappearing, but that's a safety net, not the
     *  intended path. */
    removeProjectFolder(id: string) {
        const folders = this.getProjectFolders();
        if (!(id in folders)) return;
        const next = { ...folders };
        delete next[id];
        this.settings.projectFolders.set(this.database, next);
    }

    getProjectSort(): ProjectSort {
        return this.settings.projectSort.get();
    }

    setProjectSort(sort: ProjectSort) {
        this.settings.projectSort.set(this.database, sort);
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

    setStagePlacement(placement: StagePlacementType) {
        this.settings.stagePlacement.set(this.database, placement);
    }

    getStagePlacement() {
        return this.settings.stagePlacement.get();
    }

    setAnimationFactor(factor: number | null) {
        this.settings.animationFactor.set(this.database, factor);
    }

    setWritingLayout(layout: WritingLayoutChoice) {
        this.settings.writingLayout.set(this.database, layout);
    }

    setTutorialProgress(progress: Progress) {
        // Patch the single tutorial setting, keeping each tutorial's place under its own id.
        const current = this.settings.tutorial.get();
        this.settings.tutorial.set(this.database, {
            ...current,
            progress: {
                ...current.progress,
                [progress.mode]: progress.serialize(),
            },
        });
    }

    getTutorialProgress(mode: TutorialMode): TutorialProgress {
        return this.settings.tutorial.get().progress[mode] ?? DefaultProgress;
    }

    setTutorialMode(mode: TutorialMode | null) {
        const current = this.settings.tutorial.get();
        this.settings.tutorial.set(this.database, { ...current, mode });
    }

    getTutorialMode(): TutorialMode | null {
        return this.settings.tutorial.get().mode;
    }

    setContrastLanguage(tag: string) {
        this.settings.contrastLanguage.set(this.database, tag);
    }

    getContrastLanguage(): string {
        return this.settings.contrastLanguage.get();
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

    getChatLanguage() {
        return this.settings.chatLanguage.get();
    }

    setChatLanguage(locale: string | null) {
        this.settings.chatLanguage.set(this.database, locale);
    }

    setMic(deviceID: string | null) {
        this.settings.mic.set(this.database, deviceID);
    }

    getMic() {
        return this.settings.mic.get();
    }

    setMusicVisualization(visualization: MusicVisualization) {
        this.settings.musicVisualization.set(this.database, visualization);
    }

    getMusicVisualization() {
        return this.settings.musicVisualization.get();
    }

    setMusicVolume(volume: number) {
        this.settings.musicVolume.set(this.database, volume);
    }

    getMusicVolume() {
        return this.settings.musicVolume.get();
    }

    setMusicDucking(depth: number) {
        this.settings.musicDucking.set(this.database, depth);
    }

    getMusicDucking() {
        return this.settings.musicDucking.get();
    }

    setContactCues(on: boolean) {
        this.settings.contactCues.set(this.database, on);
    }

    getContactCues() {
        return this.settings.contactCues.get();
    }

    setAnimationCues(on: boolean) {
        this.settings.animationCues.set(this.database, on);
    }

    getAnimationCues() {
        return this.settings.animationCues.get();
    }

    setCues(on: boolean) {
        this.settings.cues.set(this.database, on);
    }

    getCues() {
        return this.settings.cues.get();
    }

    setHaptics(on: boolean) {
        this.settings.haptics.set(this.database, on);
    }

    getHaptics() {
        return this.settings.haptics.get();
    }

    setCaptionSize(size: number) {
        this.settings.captionSize.set(this.database, size);
    }

    getCaptionSize() {
        return this.settings.captionSize.get();
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

    setAdaptOutput(on: boolean) {
        this.settings.adaptOutput.set(this.database, on);
    }

    getAdaptOutput() {
        return this.settings.adaptOutput.get();
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

    setWords(on: boolean) {
        this.settings.words.set(this.database, on);
    }

    getWords() {
        return this.settings.words.get();
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
            projectFolders: this.settings.projectFolders.get(),
            projectSort: this.settings.projectSort.get(),
            tours: this.settings.tours.get(),
            chatThreads: this.settings.chatThreads.get(),
            face: this.settings.face.get(),
            lines: this.settings.lines.get(),
            wrap: this.settings.wrap.get(),
            space: this.settings.space.get(),
        };
    }
}
