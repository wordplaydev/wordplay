import type EditTexts from './EditTexts';

type UITexts = {
    phrases: {
        /** Used to address someone or say hi, on the login screen. */
        welcome: string;
        /** The motto for Wordplay on the landing page. */
        motto: string;
    };
    placeholders: {
        code: string;
        expression: string;
        type: string;
        percent: string;
        name: string;
        project: string;
        email: string;
    };
    tooltip: {
        yes: string;
        no: string;
        play: string;
        pause: string;
        back: string;
        backInput: string;
        out: string;
        start: string;
        forward: string;
        forwardInput: string;
        present: string;
        reset: string;
        home: string;
        revert: string;
        set: string;
        fullscreen: string;
        collapse: string;
        expand: string;
        close: string;
        changeLanguage: string;
        addLanguage: string;
        removeLanguage: string;
        horizontal: string;
        vertical: string;
        freeform: string;
        fit: string;
        grid: string;
        addPose: string;
        removePose: string;
        movePoseUp: string;
        movePoseDown: string;
        addGroup: string;
        addPhrase: string;
        removeContent: string;
        moveContentUp: string;
        moveContentDown: string;
        editContent: string;
        sequence: string;
        animate: string;
        addSource: string;
        deleteSource: string;
        deleteProject: string;
        editProject: string;
        settings: string;
        newProject: string;
        dark: string;
        chooserExpand: string;
        place: string;
        paint: string;
        nextLesson: string;
        previousLesson: string;
        nextLessonStep: string;
        previousLessonStep: string;
        revertProject: string;
        showOutput: string;
    };
    prompt: {
        deleteSource: string;
        deleteProject: string;
    };
    labels: {
        learn: string;
        nodoc: string;
        /** Shown in the output palette when multiple outputs are selected but they have unequal values. */
        mixed: string;
        /** Shown in the output palette when the output(s) selected have expressions that are not editable using the editor. */
        computed: string;
        /** Shown in the output palette when the output(s) selected have no value set, but have a default */
        default: string;
        /** Shown in the output palette when a value is unset but is inherited */
        inherited: string;
        /** Shown in the output palette when a sequence isn't valid */
        notSequence: string;
        /** Shown in the output palette when a list of content is isn't valid */
        notContent: string;
        /** Shown when using an anonymous account */
        anonymous: string;
    };
    header: {
        learn: string;
        editing: string;
        select: string;
        projects: string;
        examples: string;
        /** Documentation header in structure and functions before inputs */
        inputs: string;
        /** Documentation header in structure view before interfaces */
        interfaces: string;
        /** Documentation header in structure before properties */
        properties: string;
        /** Documentation header in structure before functions */
        functions: string;
        /** Documentation header in structure before conversions */
        conversions: string;
        /** How to label the locales that have been selected */
        selectedLocales: string;
        /** How to label the supported locales that have not been selected */
        supportedLocales: string;
        /** How to request help with localization */
        helpLocalize: string;
    };
    section: {
        project: string;
        conflicts: string;
        timeline: string;
        toolbar: string;
        output: string;
        palette: string;
        editor: string;
    };
    feedback: {
        unknownProject: string;
    };
    login: {
        header: string;
        prompt: string;
        anonymousPrompt: string;
        enterEmail: string;
        submit: string;
        sent: string;
        success: string;
        failure: string;
        expiredFailure: string;
        invalidFailure: string;
        emailFailure: string;
        logout: string;
        offline: string;
    };
    edit: EditTexts;
    error: {
        tutorial: string;
        /** The placeholder string indicating that a locale string is not yet written */
        unwritten: string;
        /** The placeholder string indicating that a template string could not be parsed */
        template: string;
    };
};

export default UITexts;
