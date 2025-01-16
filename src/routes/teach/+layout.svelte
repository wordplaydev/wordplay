<script module lang="ts">
    const TeachDataSymbol = 'teach';

    export function getTeachData() {
        return getContext<TeachData>(TeachDataSymbol);
    }

    class TeachData {
        /** Undefined means loading, null means not available, and otherwise a list */
        private classes: Class[] | undefined | null = $state(undefined);

        constructor() {}

        getClasses() {
            return this.classes;
        }

        getClass(id: string) {
            return this.classes === undefined
                ? undefined
                : this.classes === null
                  ? null
                  : (this.classes.find((c) => c.id === id) ?? null);
        }

        setClasses(classes: Class[] | null) {
            this.classes = classes;
        }
    }
</script>

<script lang="ts">
    import Writing from '@components/app/Writing.svelte';
    import { getUser } from '@components/project/Contexts';
    import { firestore } from '@db/firebase';
    import {
        ClassesCollection,
        ClassSchema,
        type Class,
    } from '@db/TeacherDatabase.svelte';
    import { FirebaseError } from 'firebase/app';
    import type { Unsubscribe } from 'firebase/auth';
    import { collection, onSnapshot, query, where } from 'firebase/firestore';
    import { getContext, setContext } from 'svelte';

    let { children } = $props();

    // Load the classes in a Firebase realtime listener.
    let user = getUser();
    let unsub: Unsubscribe | null = null;
    let data = new TeachData();
    setContext(TeachDataSymbol, data);

    function listen(uid: string | undefined) {
        if (firestore === undefined) return;
        if (uid === undefined) {
            if (unsub) unsub();
            data.setClasses(null);
            return;
        }

        unsub = onSnapshot(
            query(
                collection(firestore, ClassesCollection),
                where('teachers', 'array-contains', uid),
            ),
            async (snapshot) => {
                // Reset the classes.
                data.setClasses(
                    snapshot.docs
                        .map((doc) => {
                            const classData = doc.data();

                            // Try to parse the chat and save on success.
                            try {
                                return ClassSchema.parse(classData);
                            } catch (error) {
                                // If the chat doesn't succeed, then we don't save it.
                                console.error(error);
                                return undefined;
                            }
                        })
                        .filter((c) => c !== undefined),
                );
            },
            (error) => {
                data.setClasses(null);
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                } else console.error(error);
            },
        );
    }

    // When the user changes, listen to new classes.
    $effect(() => {
        listen($user?.uid);

        return () => {
            if (unsub) unsub();
        };
    });
</script>

<Writing>
    {@render children()}
</Writing>
