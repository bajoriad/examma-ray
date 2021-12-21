/**
 * ## Defining Graders
 * 
 * A question **grader** is responsible for two primary tasks:
 * 
 * 1. grading a submission to produce a "grading result"
 * 2. rendering a report of the "grading result" as HTML, e.g. a list of rubric items met or comparison with a sample solution
 * 
 * Generally, a grader for most questions should be defined via the `default_grader` property on
 * the `response` specification object within its [[QuestionSpecification]]. The reasoning is that
 * most questions should be graded the same way regardless of the exam they're ultimately included in.
 * 
 * For example, here's the grader for our sample MC question on tomato varieties. (The choice "Better Boy"
 * at index 1 is correct because it's a hybrid tomato, not an heirloom variety.)
 * 
 * ```typescript
 * export const Question_Sample_MC : QuestionSpecification = {
 *   question_id: "sample_mc",
 *   points: 2,
 *   mk_description:
 * `
 * This is a sample question. Which of the following is NOT an heirloom variety of tomato plant?
 * `,
 *   response: {
 *     kind: "multiple_choice",
 *     choices: ["Green Zebra","Better Boy","Black Krim","Mr. Stripey","Brandywine"],
 *     multiple: false,
 *     sample_solution: [1],
 *     default_grader: new SimpleMCGrader(1)
 *   }
 * }
 * ```
 * 
 * However, it's also possible to specify a mapping from question IDs to graders when creating an
 * [[`ExamGrader`]], either to provide graders for questions that don't have a default (though they
 * generally should) or to override the default to grade differently on a particular exam.
 * 
 * ## Grader Tasks
 * 
 * A "grader" is actually responsible for a number of tasks:
 *  - grading a submission to produce a "grading result" containing all information about how it was graded
 *  - determining the number of points earned for a parti
 * 
 * ## Autograders
 * 
 * Many questions can be graded fully automatically, and several pre-built graders are supported:
 * 
 * - [[`FreebieGrader`]] - Gives points to everyone (or, optionally, to all non-blank submissions)
 * - [[`SimpleMCGrader`]] - Grades an MC question with one right answer
 * - [[`SummationMCGrader`]] - Grades a multiple-select MC question where each selection is worth positive or negative points
 * - [[`StandardSLGrader`]] - Grades SL ("select-a-statement") questions based on which lines should/shouldn't be included
 * 
 * ## Semi-Autograders
 * 
 * Some autograders require a certain amount of manual effort to define the grading mechanism and sanity check results.
 * These graders generally provide an interface (via the question analysis page generated for the graded question)
 * to assist a manual grader in configuring the grader and/or reviewing the grading results.
 * 
 * For example, with an `FITBRegexGrader`, you define a set of regular expressions to match against student responses
 * for each blank in a fill-in-the-blank question. You can sanity check these using the question analysis page, which shows
 * all the unique responses for each blank and the number of points they earn under the current grader configuration.
 * 
 * - [[`graders/FITBRegexGrader`]] - Uses regular expressions to grade each blank in an FITB question. Also comes with an interface for human review of unique answers
 * 
 * ## Manual Graders
 * 
 * These graders pick up manual grading records generated by human graders and apply them to the corresponding question.
 * Generally, the manual grading process is supported by an interactive interface, but that is outside the specific concern
 * of the "grader" itself - it just loads and applies the human-generated grading.
 * 
 * - [[`CodeWritingGrader`]] - Uses regular expressions to grade each blank in an FITB question. Also comes with an interface for human review of unique answers
 * 
 * @module
 */

export {
  FITBRegexGrader,
  FITBRegexMatcher,
  FITBRegexRubricItem,
  FITBRegexGradingResult
} from "./graders/FITBRegexGrader";

export {
  FreebieGrader,
  FreebieGradingResult
} from "./graders/FreebieGrader";

export {
  SimpleMCGrader,
  SimpleMCGradingResult
} from "./graders/SimpleMCGrader";

export {
  StandardSLGrader
} from "./graders/StandardSLGrader";

export {
  SummationMCGrader,
  SummationMCGradingResult
} from "./graders/SummationMCGrader";

export {
  CodeWritingGrader,
  CodeWritingRubricItem,
  CodeWritingRubricResult as CodeWritingGradingResult
} from "./graders/CodeWritingGrader";

export {
  GradingAssignmentSpecification,
  QuestionGradingRecords,
  QuestionGradingRecord
} from "./grading_interface/common";