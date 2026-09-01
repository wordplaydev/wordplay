import type { SerializedMessage } from '@db/chats/ChatDatabase.svelte';

/** A conversation sorted into what is said in the room and what is said in a
 *  thread about one of those messages. */
export type Threads = {
    /** The messages the conversation shows, in their stored order. */
    roots: SerializedMessage[];
    /** Each root's replies, oldest first, for the roots that have any. */
    repliesByRoot: Map<string, SerializedMessage[]>;
};

/**
 * Sort a conversation into threads (#821).
 *
 * Threading is one level deep on purpose — the depth Slack and Teams settled
 * on, and the depth the co-design asked for. Two shapes that a stored message
 * can nevertheless have are normalized here rather than left to the view:
 *
 * A **reply to a reply** joins the thread it was written in, rather than
 * starting one of its own. Nesting is what makes a thread unreadable, and a
 * client that offered it would produce documents this one could not display.
 *
 * A reply whose parent is **missing** becomes a root. A chat trims its oldest
 * messages when it outgrows its budget, so a thread's beginning can genuinely
 * be gone; showing the replies in the room is a worse conversation than showing
 * them, but it is a conversation, where hiding them loses what people said.
 */
export function groupThreads(messages: SerializedMessage[]): Threads {
    const byID = new Map(messages.map((m) => [m.id, m]));

    /** The root of the thread this message belongs to, or undefined when it is
     *  itself a root. Walks up rather than reading `replyTo` once, so a reply
     *  to a reply lands on the thread rather than on another reply — and gives
     *  up on a cycle, which nothing writes but nothing checks either. */
    function rootOf(message: SerializedMessage): string | undefined {
        let parent = message.replyTo;
        const seen = new Set<string>([message.id]);
        while (parent !== undefined && !seen.has(parent)) {
            seen.add(parent);
            const next = byID.get(parent);
            // The parent is gone (trimmed, or never arrived): this message is a
            // root, since there is nothing left for it to be under.
            if (next === undefined) return undefined;
            if (next.replyTo === undefined) return next.id;
            parent = next.replyTo;
        }
        return undefined;
    }

    const roots: SerializedMessage[] = [];
    const repliesByRoot = new Map<string, SerializedMessage[]>();
    for (const message of messages) {
        const root = rootOf(message);
        if (root === undefined) roots.push(message);
        else {
            const replies = repliesByRoot.get(root);
            if (replies === undefined) repliesByRoot.set(root, [message]);
            else replies.push(message);
        }
    }

    for (const replies of repliesByRoot.values())
        replies.sort((a, b) => a.time - b.time);

    return { roots, repliesByRoot };
}

/** How many replies a thread has, for the "3 replies" control. */
export function replyCount(threads: Threads, rootID: string): number {
    return threads.repliesByRoot.get(rootID)?.length ?? 0;
}
