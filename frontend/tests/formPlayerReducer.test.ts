import { describe, expect, it } from "vitest";
import type { PublicFormPayload } from "@/lib/types";
import {
  formPlayerReducer,
  initialPlayerState,
} from "@/components/player/formPlayerReducer";

const form: PublicFormPayload = {
  public_id: "public123",
  title: "Survey",
  welcome_title: "Welcome",
  welcome_description: null,
  welcome_button_label: "Start",
  thank_you_title: "Thanks",
  thank_you_message: "Done",
  theme: null,
  questions: [
    { id: 1, position: 1, type: "short_text", title: "Name", description: null, required: true, settings: null, options: [], logic_rules: [{ id: 1, question_id: 1, operator: "equals", value: "skip", jump_to_question_id: 2, jump_to_end: false }] },
    { id: 2, position: 2, type: "email", title: "Email", description: null, required: false, settings: null, options: [], logic_rules: [] },
  ],
};

function initialized() {
  return formPlayerReducer(initialPlayerState(), { type: "INIT", form }, form);
}

describe("formPlayerReducer", () => {
  it("moves forward and backward while preserving direction", () => {
    const first = initialized();
    const next = formPlayerReducer(first, { type: "NEXT" }, form);
    expect(next.currentIndex).toBe(1);
    expect(next.direction).toBe(1);
    const previous = formPlayerReducer(next, { type: "PREV" }, form);
    expect(previous.currentIndex).toBe(0);
    expect(previous.direction).toBe(-1);
  });

  it("blocks next when a required answer is invalid", () => {
    const first = initialized();
    const blocked = formPlayerReducer(
      formPlayerReducer(first, { type: "NEXT" }, form),
      { type: "NEXT" },
      form,
    );
    expect(blocked.currentIndex).toBe(1);
    expect(blocked.errors[1]).toContain("Name");
  });

  it("clears a question error when its answer changes", () => {
    const first = initialized();
    const errored = formPlayerReducer(
      formPlayerReducer(first, { type: "NEXT" }, form),
      { type: "NEXT" },
      form,
    );
    const updated = formPlayerReducer(
      errored,
      { type: "SET_ANSWER", questionId: 1, value: "Ada" },
      form,
    );
    expect(updated.answers[1]).toBe("Ada");
    expect(updated.errors[1]).toBe("");
  });

  it("supports the Phase 6 jump extension point", () => {
    const state = initialized();
    const jumped = formPlayerReducer(state, { type: "JUMP_TO_QUESTION", questionId: 2 }, form);
    expect(jumped.currentIndex).toBe(2);
    expect(jumped.direction).toBe(1);
  });

  it("follows a matching jump and returns through visited history", () => {
    const first = initialized();
    const question = formPlayerReducer(first, { type: "NEXT" }, form);
    const answered = formPlayerReducer(question, { type: "SET_ANSWER", questionId: 1, value: "skip" }, form);
    const jumped = formPlayerReducer(answered, { type: "NEXT" }, form);
    expect(jumped.currentIndex).toBe(2);
    const back = formPlayerReducer(jumped, { type: "PREV" }, form);
    expect(back.currentIndex).toBe(1);
  });
});
