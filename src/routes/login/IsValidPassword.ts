export const PasswordLength = 6;

export default function isValidPassword(pass: string) {
    return pass.length >= PasswordLength;
}
