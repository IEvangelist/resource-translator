import { findAllTranslationFiles } from '../src/translation-file-finder';

jest.setTimeout(60000);

test("IO: finds all resource files correctly", async () => {
    let translationFiles = await findAllTranslationFiles('en');
    expect(translationFiles).toBeTruthy();
    expect(translationFiles.po![0]).toMatch(/.po/);
    expect(translationFiles.restext![0]).toMatch(/.restext/);
    expect(translationFiles.resx![0]).toMatch(/.resx/);
    expect(translationFiles.xliff!.length).toEqual(0);

    translationFiles = await findAllTranslationFiles('jp');
    expect(translationFiles.xliff![0]).toMatch(/.xliff/);
});