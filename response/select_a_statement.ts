import { encode } from "he";
import { assertFalse } from "../util";
import { BLANK_SUBMISSION, MALFORMED_SUBMISSION } from "./common";
import { isNumericArray } from "./util";

export type SASItem = {
  kind: "item",
  text: string,
  forced?: boolean
};

export type SASGroup = {
  kind: "group",
  title?: string,
  items: SASItem[]
};

export type SASResponse = {
  kind: "select_a_statement";
  code_language: string;
  choices: (SASGroup | SASItem)[]
};

export type SASSubmission = readonly number[] | typeof BLANK_SUBMISSION;

export function SAS_PARSER(rawSubmission: string | null | undefined) : SASSubmission | typeof MALFORMED_SUBMISSION {
  if (rawSubmission === undefined || rawSubmission === null || rawSubmission.trim() === "") {
    return BLANK_SUBMISSION;
  }

  let parsed = JSON.parse(rawSubmission);
  if (isNumericArray(parsed)) {
    return parsed.length > 0 ? parsed : BLANK_SUBMISSION;
  }
  else {
    return MALFORMED_SUBMISSION;
  }
}

export function SAS_RENDERER(response: SASResponse, question_id: string) {
  let item_index = 0;
  return `<pre><code class="language-${response.code_language}">${response.choices.map(
    group => group.kind === "item"
      ? renderSASItem(group, question_id, item_index++)
      : group.items.map(item => renderSASItem(item, question_id, item_index++)).join("\n")
  ).join("\n")}</code></pre>`;
}

function renderSASItem(item: SASItem, question_id: string, item_index: number) {
  return `<input type="checkbox" id="${question_id}-sas-choice-${item_index}" value="${item_index}" class="sas-select-input"></input> <label for="${question_id}-sas-choice-${item_index}" class="sas-select-label">${encode(item.text)}</label>`;
  // let highlightedText = hljs.highlight(code_language, item.text).value;
  // return highlightedText;
}

export function SAS_EXTRACTOR(responseElem: JQuery) {
  let chosen = responseElem.find("input:checked").map(function() {
    return parseInt(<string>$(this).val());
  }).get();
  return chosen.length > 0 ? chosen : BLANK_SUBMISSION;
}

export function SAS_FILLER(elem: JQuery, submission: SASSubmission) {
  
  // blank out all selections (note this will blank required selections
  // but it's presumed the input file will fill them in subsequently)
  let inputs = elem.find("input");
  inputs.prop("checked", false);

  if (submission !== BLANK_SUBMISSION) {
    let inputElems = inputs.get();
    submission.forEach(n => $(inputElems[n]).prop("checked", true));
  }
}

export const SAS_HANDLER = {
  parse: SAS_PARSER,
  render: SAS_RENDERER,
  extract: SAS_EXTRACTOR,
  fill: SAS_FILLER
};