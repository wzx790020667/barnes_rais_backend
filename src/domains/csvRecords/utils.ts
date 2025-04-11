export const removeSlashes = (str: string) => {
    return str.replace(/\//g, "");
}

export const extractDigits = (str: string) => {
    return str.replace(/[^\d.,]/g, "");
}

