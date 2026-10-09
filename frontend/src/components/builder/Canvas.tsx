"use client";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { QuestionView } from "@/components/player/QuestionView";

export function Canvas() {
  const { state, dispatch } = useBuilderStore();
  const form = state.form;

  if (!form) return null;

  let content = null;

  if (state.selectedItem === "welcome") {
    content = (
      <div className="w-full max-w-2xl text-center flex flex-col items-center justify-center h-full gap-5">
        <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.03em] text-brand">
          {form.welcome_title || "Welcome to my form"}
        </h2>
        <p className="max-w-xl text-[17px] leading-7 text-neutral-500">
          {form.welcome_description || "Description (optional)"}
        </p>
        <button className="mt-4 min-h-12 px-7 bg-brand text-white rounded-lg font-semibold text-base pointer-events-none shadow-sm">
          {form.welcome_button_label || "Start"}
        </button>
      </div>
    );
  } else if (state.selectedItem === "thank_you") {
    content = (
      <div className="w-full max-w-2xl text-center flex flex-col items-center justify-center h-full gap-4">
        <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.03em] text-brand">
          {form.thank_you_title || "Thank you!"}
        </h2>
        <p className="max-w-xl text-[17px] leading-7 text-neutral-500">
          {form.thank_you_message || "Your response has been recorded."}
        </p>
      </div>
    );
  } else {
    const question = form.questions.find((q) => q.id === state.selectedItem);
    if (question) {
      content = (
        <div className="w-full max-w-3xl px-10 py-12 lg:px-16">
          <QuestionView 
            question={question} 
            value={undefined} 
            onChange={() => {}} 
            isBuilder={true} 
            onUpdate={(updates) => {
               dispatch({ type: "UPDATE_QUESTION", payload: { id: question.id, updates } });
               // Autosave would pick this up if we had it fully connected
            }}
          />
        </div>
      );
    } else {
      content = (
        <div className="text-center text-[#6B6B6B]">
          <p>Please select an item to edit.</p>
        </div>
      );
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-builder-workspace overflow-y-auto">
      <div className="flex-1 flex items-center justify-center p-5 lg:p-7">
        <div className="w-full min-h-full bg-white border border-builder-divider shadow-builder-canvas overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto flex items-center justify-center">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
