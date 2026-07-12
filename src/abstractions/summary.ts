export class Summary {
  newFileCount: number = 0;
  newFileTranslations: number = 0;

  updatedFileCount: number = 0;
  updatedFileTranslations: number = 0;

  reusedTranslations: number = 0;
  preservedManualEdits: number = 0;
  noTranslateSkipped: number = 0;
  providerRequestCount: number = 0;
  providerRequestedTranslations: number = 0;
  structureOnlyFileCount: number = 0;
  snapshotBaselineTranslations: number = 0;
  stateUpdated: boolean = false;

  constructor(
    public sourceLocale: string,
    public toLocales: string[],
  ) {}

  get totalFileCount(): number {
    return this.newFileCount + this.updatedFileCount;
  }

  get totalTranslations(): number {
    return this.newFileTranslations + this.updatedFileTranslations;
  }

  get hasNewTranslations(): boolean {
    return (
      this.totalFileCount > 0 || this.totalTranslations > 0 || this.stateUpdated
    );
  }
}
