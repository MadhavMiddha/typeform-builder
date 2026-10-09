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
      <div className="w-full max-w-2xl text-center flex flex-col items-center justify-center my-auto py-8 gap-5">
        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) =>
            dispatch({
              type: "UPDATE_FORM_FIELD",
              payload: {
                field: "welcome_title",
                value: e.currentTarget.textContent?.trim() || "We'd love your feedback!",
              },
            })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="text-[36px] font-normal leading-tight text-[#262627] focus:outline-none hover:bg-neutral-100/70 rounded px-2 -mx-2 transition-colors cursor-text"
        >
          {form.welcome_title || "We'd love your feedback!"}
        </h1>

        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) =>
            dispatch({
              type: "UPDATE_FORM_FIELD",
              payload: {
                field: "welcome_description",
                value: e.currentTarget.textContent?.trim() || "",
              },
            })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          data-placeholder="Description (optional)"
          className="max-w-xl text-[18px] leading-relaxed text-neutral-500 focus:outline-none hover:bg-neutral-100/70 rounded px-2 -mx-2 transition-colors cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400"
        >
          {form.welcome_description}
        </p>

        <button className="mt-4 min-h-11 px-7 bg-[#262627] text-white rounded-lg font-medium text-sm pointer-events-none shadow-sm">
          {form.welcome_button_label || "Start Survey"}
        </button>
      </div>
    );
  } else if (state.selectedItem === "thank_you") {
    content = (
      <div className="w-full max-w-2xl text-center flex flex-col items-center justify-center my-auto py-8 gap-4">
        <h2
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) =>
            dispatch({
              type: "UPDATE_FORM_FIELD",
              payload: {
                field: "thank_you_title",
                value: e.currentTarget.textContent?.trim() || "Thank you for your feedback!",
              },
            })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="text-[36px] font-normal leading-tight text-[#262627] focus:outline-none hover:bg-neutral-100/70 rounded px-2 -mx-2 transition-colors cursor-text"
        >
          {form.thank_you_title || "Thank you for your feedback!"}
        </h2>

        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) =>
            dispatch({
              type: "UPDATE_FORM_FIELD",
              payload: {
                field: "thank_you_message",
                value: e.currentTarget.textContent?.trim() || "",
              },
            })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          data-placeholder="Description (optional)"
          className="max-w-xl text-[18px] leading-relaxed text-neutral-500 focus:outline-none hover:bg-neutral-100/70 rounded px-2 -mx-2 transition-colors cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400"
        >
          {form.thank_you_message}
        </p>
      </div>
    );
  } else {
    const question = form.questions.find((q) => q.id === state.selectedItem);
    if (question) {
      content = (
        <QuestionView
          question={question}
          value={undefined}
          onChange={() => {}}
          isBuilder={true}
          onUpdate={(updates) => {
            dispatch({ type: "UPDATE_QUESTION", payload: { id: question.id, updates } });
          }}
        />
      );
    } else {
      content = (
        <div className="text-center text-[#6B6B6B] my-auto">
          <p>Please select an item to edit.</p>
        </div>
      );
    }
  }

  return (
    <div className="w-full h-full min-h-0 bg-[#fafafa] border border-[#ececec] rounded-[16px] overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center px-8 lg:px-16 py-8">
        {content}
      </div>
    </div>
  );
}
