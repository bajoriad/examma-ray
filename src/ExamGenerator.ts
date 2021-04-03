import { writeFileSync, mkdirSync } from 'fs';
import json_stable_stringify from "json-stable-stringify";
import { Section, Question, Exam, AssignedExam, StudentInfo, RenderMode, AssignedQuestion, AssignedSection } from './exams';
import { createQuestionSkinRandomizer, createSectionChoiceRandomizer, createQuestionChoiceRandomizer, createSectionSkinRandomizer, Randomizer } from "./randomization";
import { v4 as uuidv4} from 'uuid';
import uuidv5 from 'uuid/v5';
import { assert, assertNever } from './util';
import { unparse } from 'papaparse';
import del from 'del';
import { ResponseKind } from './examma-ray';
import { QuestionSpecification, QuestionChooser, SectionChooser, SectionSpecification, chooseQuestions, chooseSections, CHOOSE_ALL } from './specification';
import { createCompositeSkin, QuestionSkin } from './skins';

type SectionStats = {
  section: Section,
  n: number
};

type QuestionStats = {
  question: Question,
  n: number
};

export type ExamGeneratorOptions = {
  student_ids: "uniqname" | "uuidv4" | "uuidv5",
  uuidv5_namespace?: string,
  students: readonly StudentInfo[],
  choose_all?: boolean
};

const DEFAULT_OPTIONS = {
  student_ids: "uniqname",
  students: []
};

function verifyOptions(options: Partial<ExamGeneratorOptions>) {
  assert(options.student_ids !== "uuidv5" || options.uuidv5_namespace, "If uuidv5 filenames are selected, a uuidv5_namespace option must be specified.");
  assert(!options.uuidv5_namespace || options.uuidv5_namespace.length >= 16, "uuidv5 namespace must be at least 16 characters.");
}

export class ExamGenerator {

  public readonly exam: Exam;
  public readonly assignedExams: AssignedExam[] = [];
  public readonly assignedExamsByUniqname: { [index: string]: AssignedExam | undefined; } = {};

  private sectionStatsMap: { [index: string]: SectionStats; } = {};
  private questionStatsMap: { [index: string]: QuestionStats; } = {};

  private options: ExamGeneratorOptions;

  public constructor(exam: Exam, options: Partial<ExamGeneratorOptions> = {}) {
    this.exam = exam;
    verifyOptions(options);
    this.options = Object.assign(DEFAULT_OPTIONS, options);
    this.options.students.forEach(s => this.assignRandomizedExam(s));
  }

  public assignRandomizedExam(student: StudentInfo) {

    let ae = this.createRandomizedExam(student);

    this.assignedExams.push(ae);
    this.assignedExamsByUniqname[student.uniqname] = ae;

    return ae;
  }

  public assignRandomizedExams(students: readonly StudentInfo[]) {
    students.forEach(s => this.assignRandomizedExam(s));
  }

  private createRandomizedExam(
    student: StudentInfo,
    rand: Randomizer = this.options.choose_all ? CHOOSE_ALL : createSectionChoiceRandomizer(student, this.exam))
  {
    let ae = new AssignedExam(
      this.createStudentUuid(student, this.exam.exam_id),
      this.exam,
      student,
      this.exam.sections
        .flatMap(chooser => chooseSections(chooser, this.exam, student, rand))
        .flatMap((s, sectionIndex) => this.createRandomizedSection(s, student, sectionIndex))
    );

    this.checkExam(ae);

    return ae;
  }

  private createRandomizedSection(
    section: Section,
    student: StudentInfo,
    sectionIndex: number,
    rand: Randomizer = this.options.choose_all ? CHOOSE_ALL : createQuestionChoiceRandomizer(student, this.exam, section),
    skinRand: Randomizer = this.options.choose_all ? CHOOSE_ALL : createSectionSkinRandomizer(student, this.exam, section))
  {
    let sectionSkins = section.skins.generate(this.exam, student, skinRand);
    return sectionSkins.map(sectionSkin => new AssignedSection(
      this.createStudentUuid(student, this.exam.exam_id + "-s-" + section.section_id),
      section,
      sectionIndex,
      sectionSkin,
      section.questions
        .flatMap(chooser => chooseQuestions(chooser, this.exam, student, rand))
        .flatMap((q, partIndex) => this.createRandomizedQuestion(q, student, sectionIndex, partIndex, sectionSkin))
    ));
  }

  private createRandomizedQuestion(
    question: Question,
    student: StudentInfo,
    sectionIndex: number,
    partIndex: number,
    sectionSkin: QuestionSkin,
    rand: Randomizer = createQuestionSkinRandomizer(student, this.exam, question)) {

    let questionSkins = question.skins.generate(this.exam, student, rand).map(qSkin => createCompositeSkin(sectionSkin, qSkin));
    return questionSkins.map(questionSkin => new AssignedQuestion(
      this.createStudentUuid(student, this.exam.exam_id + "-q-" + question.question_id),
      this.exam,
      student,
      question,
      questionSkin,
      sectionIndex,
      partIndex, "")
    );
  }

  private checkExam(ae: AssignedExam) {
    // Find all sections assigned to any exam
    let sections = ae.assignedSections.map(s => s.section);

    // Verify that every section with the same ID originated from the same specification
    // If there wasn't a previous stats entry for that section ID, add one
    sections.forEach(
      section => this.sectionStatsMap[section.section_id]
        ? ++this.sectionStatsMap[section.section_id].n && assert(section.spec === this.sectionStatsMap[section.section_id].section.spec, `Multiple sections from different specifications with the ID "${section.section_id}" were detected.`)
        : this.sectionStatsMap[section.section_id] = {
          section: section,
          n: 1
        }
    );

    // Find all questions assigned to any exam
    let questions = ae.assignedSections.flatMap(s => s.assignedQuestions.map(q => q.question));

    // Verify that every question with the same ID originated from the same specification
    questions.forEach(
      question => this.questionStatsMap[question.question_id]
        ? ++this.questionStatsMap[question.question_id].n && assert(question.spec === this.questionStatsMap[question.question_id].question.spec, `Multiple questions from different specifications with the ID "${question.question_id}" were detected.`)
        : this.questionStatsMap[question.question_id] = {
          question: question,
          n: 1
        }
    );

  }

  private writeStats() {
    // Create output directory
    mkdirSync(`data/${this.exam.exam_id}/assigned/`, { recursive: true });

    // Write to file. JSON.stringify removes the section/question objects
    writeFileSync(`data/${this.exam.exam_id}/assigned/stats.json`, json_stable_stringify({
      sections: this.sectionStatsMap,
      questions: this.questionStatsMap
    }, { replacer: (k, v) => k === "section" || k === "question" ? undefined : v, space: 2 }));

  }

  public writeAll() {

    const examDir = `data/${this.exam.exam_id}/assigned/exams`;
    const manifestDir = `data/${this.exam.exam_id}/assigned/manifests`;

    // Create output directories and clear previous contents
    mkdirSync(examDir, { recursive: true });
    del.sync(`${examDir}/*`);
    mkdirSync(manifestDir, { recursive: true });
    del.sync(`${manifestDir}/*`);

    this.writeStats();

    let filenames : string[][] = [];

    // Write out manifests and exams for all, sorted by uniqname
    this.assignedExams
      .sort((a, b) => a.student.uniqname.localeCompare(b.student.uniqname))
      .forEach((ex, i, arr) => {

        // Create filename, add to list
        let filenameBase = ex.student.uniqname + "-" + ex.uuid;
        filenames.push([ex.student.uniqname, filenameBase])

        console.log(`${i + 1}/${arr.length} Saving assigned exam manifest for ${ex.student.uniqname} to ${filenameBase}.json`);
        writeFileSync(`${manifestDir}/${filenameBase}.json`, JSON.stringify(ex.createManifest(), null, 2));
        console.log(`${i + 1}/${arr.length} Rendering assigned exam html for ${ex.student.uniqname} to ${filenameBase}.html`);
        writeFileSync(`${examDir}/${filenameBase}.html`, ex.renderAll(RenderMode.ORIGINAL), {encoding: "utf-8"});
      });

    writeFileSync(`data/${this.exam.exam_id}/assigned/student-ids.csv`, unparse({
      fields: ["uniqname", "filenameBase"],
      data: filenames 
    }));

  }

  /**
   * Takes an ID for an exam, section, or question and creates a uuid
   * for a particular student's instance of that entity. The uuid is
   * created based on the policy specified in the `ExamGenerator`'s
   * options when it is created.
   * @param student 
   * @param id 
   * @returns 
   */
  private createStudentUuid(student: StudentInfo, id: string) {
    if(this.options.student_ids === "uniqname") {
      return student.uniqname + "-" + id;
    }
    else if (this.options.student_ids === "uuidv4") {
      return uuidv4();
    }
    else if (this.options.student_ids === "uuidv5") {
      return uuidv5(student.uniqname + "-" + id, this.options.uuidv5_namespace!);
    }
    else {
      assertNever(this.options.student_ids);
    }
  }
}
