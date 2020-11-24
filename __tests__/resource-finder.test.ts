import { findAllTranslationFiles } from '../src/translation-file-finder';

jest.setTimeout(30000);

test("IO: finds all resource files correctly", async () => {
    const resourceFiles = await findAllTranslationFiles("**/*.en.resx");
    expect(resourceFiles).toBeTruthy();
    expect(resourceFiles[0]).toMatch(/.resx/);
});