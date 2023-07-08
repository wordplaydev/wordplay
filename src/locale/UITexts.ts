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
        language: string;
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
    tiles: {
        output: string;
        docs: string;
        palette: string;
    };
    headers: {
        learn: string;
        editing: string;
        projects: string;
        examples: string;
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
    edit: {
        wrap: string;
        unwrap: string;
        bind: string;
    };
    error: {
        tutorial: string;
    };
};

export default UITexts;
