import { findAllResourceFiles } from '../src/resource-finder';

jest.setTimeout(10000);

test("IO: finds all resource files correctly", async () => {
    const resourceFiles = await findAllResourceFiles("**/*.en.resx");
    expect(resourceFiles).toBeTruthy();
    expect(resourceFiles[0]).toMatch(/.resx/);
});