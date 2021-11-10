import { FILE_DOWNLOAD, FILE_UPLOAD, FILE_CHECK } from "./icons";
import { QuestionGrader } from "../graders/QuestionGrader";
import { mk2html } from "./render";
import { ResponseKind, BLANK_SUBMISSION } from "../response/common";
import { ResponseSpecification, SubmissionType, render_response } from "../response/responses";
import { DEFAULT_SKIN, ExamComponentSkin } from "./skins";
import { ExamSpecification, isValidID, QuestionChooser, QuestionSpecification, realizeChooser, realizeQuestion, realizeSection, realizeSections, SectionChooser, SectionSpecification, SkinChooser, StudentInfo } from "./exam_specification";
import { asMutable, assert } from "./util";

export class Question<QT extends ResponseKind = ResponseKind> {

  // public readonly raw_description: string;
  // public readonly description: string;
  // public readonly section: Section;
  public readonly component_kind = "component";
  public readonly spec: QuestionSpecification<QT>;
  public readonly question_id: string;
  public readonly tags: readonly string[];
  public readonly mk_description: string;
  public readonly pointsPossible : number;
  public readonly kind: QT;
  public readonly response : ResponseSpecification<QT>;
  public readonly skin: ExamComponentSkin | SkinChooser;
  public readonly sampleSolution?: Exclude<SubmissionType<QT>, typeof BLANK_SUBMISSION>;
  public readonly defaultGrader?: QuestionGrader<QT>;
  public readonly media_dir?: string;

  private readonly descriptionCache: {
    [index:string] : string | undefined
  } = {};

  private static instances = new WeakMap<QuestionSpecification, Question>();

  public static create<QT extends ResponseKind>(spec: QuestionSpecification<QT> | Question<QT>) : Question<QT> {
    // If an already created question was passed in, do nothing and return it
    if (spec.component_kind === "component") {
      return spec;
    }

    if (this.instances.has(spec)) {
      return <Question<QT>>this.instances.get(spec)!;
    }
    else {
      let newInstance = new Question(spec);
      this.instances.set(spec, newInstance);
      return newInstance;
    }
  }

  private constructor (spec: QuestionSpecification<QT>) {
    this.spec = spec;
    assert(isValidID(spec.question_id), `Invalid question ID: ${spec.question_id}`);
    this.question_id = spec.question_id;
    this.tags = spec.tags ?? [];
    this.mk_description = spec.mk_description;
    this.pointsPossible = spec.points;
    this.kind = <QT>spec.response.kind;
    this.response = spec.response;
    this.skin = spec.skin ? (
      spec.skin.component_kind === "chooser_specification"
        ? realizeChooser(spec.skin)
        : spec.skin
    ) : DEFAULT_SKIN;
    this.sampleSolution = <Exclude<SubmissionType<QT>, typeof BLANK_SUBMISSION>>spec.response.sample_solution;
    this.defaultGrader = <QuestionGrader<QT>>spec.response.default_grader;
    this.media_dir = spec.media_dir;
  }

  public renderResponse(uuid: string, skin?: ExamComponentSkin) {
    return `<div class="examma-ray-question-response examma-ray-question-response-${this.kind}" data-response-kind="${this.kind}">${render_response(this.response, this.question_id, uuid, skin)}</div>`;
  }

  public renderDescription(skin: ExamComponentSkin) {
    return this.descriptionCache[skin.skin_id] ??= mk2html(this.mk_description, skin);
  }

  public isKind<RK extends QT>(kind: RK) : this is Question<RK> {
    return this.kind === kind;
  }
};





const DEFAULT_REFERENCE_WIDTH = 40;

export class Section {

  public readonly component_kind = "component";
  public readonly spec: SectionSpecification;
  public readonly section_id: string;
  public readonly title: string;
  public readonly mk_description: string;
  public readonly mk_reference?: string;
  public readonly questions: readonly (Question | QuestionChooser)[];
  public readonly skin: ExamComponentSkin | SkinChooser;

  /**
   * Desired width of reference material as a percent (e.g. 40 means 40%).
   * Guaranteed to be an integral value.
   */
  public readonly reference_width: number;
  public readonly media_dir?: string;

  private readonly descriptionCache: {
    [index:string] : string | undefined
  } = {};

  private readonly referenceCache: {
    [index:string] : string | undefined
  } = {};

  private static instances = new WeakMap<SectionSpecification, Section>();

  public static create(spec: SectionSpecification | Section) {
    // If an already created section was passed in, do nothing and return it
    if (spec.component_kind === "component") {
      return spec;
    }

    if (this.instances.has(spec)) {
      return this.instances.get(spec)!;
    }
    else {
      let newInstance = new Section(spec);
      this.instances.set(spec, newInstance);
      return newInstance;
    }
  }

  private constructor (spec: SectionSpecification) {
    this.spec = spec;
    assert(isValidID(spec.section_id), `Invalid section ID: ${spec.section_id}`);
    this.section_id = spec.section_id;
    this.title = spec.title;
    this.mk_description = spec.mk_description;
    this.mk_reference = spec.mk_reference;
    this.questions = spec.questions.map(q => realizeQuestion(q));
    this.skin = spec.skin ? (
      spec.skin.component_kind === "chooser_specification"
        ? realizeChooser(spec.skin)
        : spec.skin
    ) : DEFAULT_SKIN;

    this.reference_width = spec.reference_width ?? DEFAULT_REFERENCE_WIDTH;
    this.media_dir = spec.media_dir;

    assert(
      Number.isInteger(this.reference_width) && 0 <= this.reference_width && this.reference_width <= 100,
      "Reference material width must be an integer between 0 and 100, inclusive."
    );
  }

  public renderDescription(skin: ExamComponentSkin) {
    return this.descriptionCache[skin.skin_id] ??= mk2html(this.mk_description, skin);
  }

  public renderReference(skin: ExamComponentSkin) {
    return this.mk_reference && (this.referenceCache[skin.skin_id] ??= mk2html(this.mk_reference, skin));
  }

}







export const MK_DEFAULT_SAVER_MESSAGE_CANVAS = 
`Click the button below to save a copy of your answers as a \`.json\`
file. You may save as many times as you like. You can also restore answers
from a previously saved file.

**Important!** You MUST submit your \`.json\` answers file to **Canvas**
BEFORE exam time is up. This webpage does not save your answers anywhere other than your local computer.
It is up to you to download your answer file and turn it in on **Canvas**.

**Note:** If you download multiple times, make sure to submit the most recent one. (The name of the file you submit to Canvas does not matter.)`;

export const MK_DEFAULT_QUESTIONS_MESSAGE = "";

export const MK_DEFAULT_DOWNLOAD_MESSAGE = "Download an answers file to submit separately.";

// export const MK_DEFAULT_BOTTOM_MESSAGE_CANVAS = 
// `You've reached the bottom of the exam! If you're done, make sure to
// click the **"Answers File"** button, download a **\`.json\`
// answers file**, and submit to **Canvas** before the end of the exam!`;

export const MK_DEFAULT_BOTTOM_MESSAGE = 
`You've reached the bottom of the exam! If you're done, make sure to
click the **"Answers File"** button, download a **\`.json\`
answers file**, and submit it before the end of the exam!`;


// const MK_DEFAULT_REGRADE_MESSAGE = 
// `Please note that you should only submit a regrade request
// if you belive a grading **mistake** was made. Do not submit
// regrade requests based on a disagreement with the rubric or
// point values/weighting for rubric items.`;



export class Exam {

  public readonly component_kind = "component";
  public readonly exam_id: string;
  public readonly title: string;

  public readonly html_instructions: string;
  public readonly html_announcements: readonly string[];
  public readonly mk_questions_message: string;
  public readonly mk_download_message: string;
  public readonly mk_bottom_message: string;
  public readonly mk_saver_message: string;
  public readonly media_dir?: string;

  public readonly sections: readonly (Section | SectionChooser)[];

  public readonly enable_regrades: boolean;

  private static instances = new WeakMap<ExamSpecification, Exam>();

  public readonly spec: ExamSpecification;

  public static create(spec: ExamSpecification | Exam) {
    // If an already created exam was passed in, do nothing and return it
    if (spec.component_kind === "component") {
      return spec;
    }

    if (this.instances.has(spec)) {
      return this.instances.get(spec)!;
    }
    else {
      let newInstance = new Exam(spec);
      this.instances.set(spec, newInstance);
      return newInstance;
    }
  }

  private constructor(spec: ExamSpecification) {
    assert(isValidID(spec.exam_id), `Invalid exam ID: ${spec.exam_id}`);
    this.exam_id = spec.exam_id;
    this.title = spec.title;
    this.html_instructions = mk2html(spec.mk_intructions);
    this.html_announcements = spec.mk_announcements?.map(a => mk2html(a)) ?? [];
    this.mk_questions_message = spec.mk_questions_message ?? MK_DEFAULT_QUESTIONS_MESSAGE;
    this.mk_download_message = spec.mk_download_message ?? MK_DEFAULT_DOWNLOAD_MESSAGE;
    this.mk_bottom_message = spec.mk_bottom_message ?? MK_DEFAULT_BOTTOM_MESSAGE;
    this.mk_saver_message = spec.mk_saver_message ?? MK_DEFAULT_SAVER_MESSAGE_CANVAS;
    this.sections = realizeSections(spec.sections);
    this.enable_regrades = !!spec.enable_regrades;
    this.media_dir = spec.media_dir;

    this.spec = spec;
  }

  public addAnnouncement(announcement_mk: string) {
    asMutable(this.html_announcements).push(mk2html(announcement_mk));
  }

}








