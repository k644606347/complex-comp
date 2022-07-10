export type IOption = {
    key?: string;
    label: string;
    value: string;
}

export function initKey(prefix?: string) {
    const key1 = String(Math.ceil(Math.random() * 1000000).toString(16)).padEnd(6, '0');
    const key2 = String(Math.ceil(Math.random() * 1000000).toString(16)).padEnd(6, '0');

    return String((prefix ?? '') + Date.now() + '_' + key1 + '_' + key2);
}