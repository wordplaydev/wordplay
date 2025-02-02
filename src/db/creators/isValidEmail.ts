const isValidEmail = (text: string) =>
    /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(text);

export default isValidEmail;
