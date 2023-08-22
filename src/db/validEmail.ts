const validateEmail = (text: string) => /^.+@.+\..+$/.test(text);

export default validateEmail;
