import { defineString } from 'firebase-functions/params';
import type {
    FirestoreEvent,
    QueryDocumentSnapshot,
} from 'firebase-functions/v2/firestore';
import nodemailer from 'nodemailer';

const emailPassword = defineString('SMTP_PASSWORD');

export default async function postFeedback(
    event: FirestoreEvent<
        QueryDocumentSnapshot | undefined,
        { id: string }
    >,
): Promise<unknown> {
    const feedback = event.data?.data();
    if (feedback === undefined) return;
    if (feedback.title === undefined || feedback.description === undefined)
        return;

    // When running inside the Functions emulator, skip the real SMTP call
    // (we don't have credentials, don't want to spam hi@, and don't want
    // tests to depend on outbound network). Print to the emulator console
    // instead so developers can see what *would* have been sent.
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log(
            `[emulator] postFeedback would send email:\n  Subject: New feedback\n  Title: ${feedback.title}\n  Description: ${feedback.description}`,
        );
        return;
    }

    const authData = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'hi@wordplay.dev',
            pass: emailPassword.value(),
        },
    });

    return authData.sendMail({
        from: 'hi@wordplay.dev',
        to: 'hi@wordplay.dev',
        subject: `New feedback`,
        text: `New feedback from the app:\n\n${feedback.title}\n\n${feedback.description}`,
        html: `<p>New feedback from the app!</p><h2>Title</h2><p>${feedback.title}</p><h2>Description</h2><p>${feedback.description}</p>`,
    });
}
