import { setFailed } from "@actions/core";
import { getInputs } from "./action/get-inputs";
import { start } from "./resource-translator";

const run = async (): Promise<void> => {
  try {
    await start(getInputs());
  } catch (error: unknown) {
    if (error) {
      setFailed(error.toString());
    }
  }
};

run();
