export async function translate(xml: string) {
    const values = xml.root.data;
    const textToTranslate = [];
    for (let i = 0; i < values.length; i++) {
        const key = values[i].$.name;
        const value = values[i].value[0];

        textToTranslate.push(value);
    }
}