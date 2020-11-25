import { findAllTranslationFiles } from '../src/translation-file-finder';

jest.setTimeout(30000);

test("IO: finds all resource files correctly", async () => {
    const translationFiles = await findAllTranslationFiles('en');
    expect(translationFiles).toBeTruthy();
    expect(translationFiles.resx[0]).toMatch(/.resx/);
});