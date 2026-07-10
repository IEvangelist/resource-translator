import { Inputs } from "../action/inputs";
import { AwsTranslationProvider } from "../providers/aws/aws-translation-provider";
import { AzureTranslationProvider } from "../providers/azure/azure-translation-provider";
import { GoogleTranslationProvider } from "../providers/google/google-translation-provider";
import { TranslationProvider } from "../providers/translation-provider";

/**
 * Deterministically builds the {@link TranslationProvider} for the selected
 * vendor. This is the single seam where vendor selection happens — every other
 * part of the action talks only to the {@link TranslationProvider} interface,
 * so the delegation to a specific SDK is fully encapsulated here.
 *
 * Defaults to Azure for backward compatibility: existing workflows that only
 * set Azure inputs keep working unchanged.
 */
export const translationProviderFactory = (
  inputs: Inputs,
): TranslationProvider => {
  switch (inputs.provider) {
    case "aws":
      return new AwsTranslationProvider(inputs);
    case "google":
      return new GoogleTranslationProvider(inputs);
    case "azure":
    default:
      return new AzureTranslationProvider(inputs);
  }
};
