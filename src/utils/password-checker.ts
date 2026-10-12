// zxcvbn-ts set up with the English dictionaries. Only password.ts loads this
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import {
  adjacencyGraphs,
  dictionary as commonDictionary,
} from "@zxcvbn-ts/language-common";
import {
  dictionary as englishDictionary,
  translations,
} from "@zxcvbn-ts/language-en";

zxcvbnOptions.setOptions({
  translations,
  graphs: adjacencyGraphs,
  dictionary: { ...commonDictionary, ...englishDictionary },
});

export const scorePassword = zxcvbn;
