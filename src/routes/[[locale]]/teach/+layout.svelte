<script lang="ts">
    import PageHeader from '@components/app/PageHeader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { getUser } from '@components/project/Contexts';
    import { firestore } from '@db/firebase';
    import {
        ClassesCollection,
        ClassSchema,
    } from '@db/teachers/TeacherDatabase.svelte';
    // TeachData lives in @db, not this route component, so the teach pages don't
    // import from a route node (that cycle crashes WebKit hydration).
    import { TeachData, TeachDataSymbol } from '@db/teachers/TeachData.svelte';
    import { FirebaseError } from 'firebase/app';
    import type { Unsubscribe } from 'firebase/auth';
    import { collection, onSnapshot, query, where } from 'firebase/firestore';
    import { setContext } from 'svelte';

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
    <PageHeader />
    {@render children()}
</Writing>
