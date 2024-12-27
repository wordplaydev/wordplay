export const PasswordLength = 10;

export default function isValidPassword(pass: string) {
    return pass.length >= PasswordLength;
}
