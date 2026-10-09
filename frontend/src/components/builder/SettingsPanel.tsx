"use client";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { Switch } from "@/components/ui/Switch";
import { QuestionType, QuestionRead } from "@/lib/types";
import { OptionsEditor } from "./OptionsEditor";

export function SettingsPanel() {
  const { state, dispatch } = useBuilderStore();
  const form = state.form;

  if (!form) return null;

  if (state.selectedItem === "welcome") {
    return <WelcomeEditor />;
  }

  if (state.selectedItem === "thank_you") {
    return <ThankYouEditor />;
  }

  const question = form.questions.find((q) => q.id === state.selectedItem);
  if (!question) return null;

  return <QuestionEditor question={question} formId={form.id} />;
}

function WelcomeEditor() {
  const { state, dispatch } = useBuilderStore();
  const handleUpdate = (field: "welcome_title" | "welcome_description" | "welcome_button_label", value: string) => {
    dispatch({ type: "UPDATE_FORM_FIELD", payload: { field, value } });
  };

  return (
    <div className="w-[320px] max-lg:absolute max-lg:right-0 max-lg:z-20 max-lg:h-full bg-builder-panel border-l border-builder-divider flex flex-col p-5 gap-5 overflow-y-auto">
      <h3 className="text-sm font-semibold text-brand">Welcome Screen</h3>
      
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Title</label>
        <input 
          type="text" 
          value={state.form?.welcome_title || ""} 
          onChange={(e) => handleUpdate("welcome_title", e.target.value)}
          className="h-10 w-full border border-builder-divider rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Description</label>
        <textarea 
          value={state.form?.welcome_description || ""} 
          onChange={(e) => handleUpdate("welcome_description", e.target.value)}
          className="w-full border border-builder-divider rounded-lg p-3 text-sm bg-white focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 min-h-[100px]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Button</label>
        <input 
          type="text" 
          value={state.form?.welcome_button_label || ""} 
          onChange={(e) => handleUpdate("welcome_button_label", e.target.value)}
          className="h-10 w-full border border-builder-divider rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        />
      </div>
    </div>
  );
}

function ThankYouEditor() {
  const { state, dispatch } = useBuilderStore();
  const handleUpdate = (field: "thank_you_title" | "thank_you_message", value: string) => {
    dispatch({ type: "UPDATE_FORM_FIELD", payload: { field, value } });
  };

  return (
    <div className="w-[320px] max-lg:absolute max-lg:right-0 max-lg:z-20 max-lg:h-full bg-builder-panel border-l border-builder-divider flex flex-col p-5 gap-5 overflow-y-auto">
      <h3 className="text-sm font-semibold text-brand">Ending Screen</h3>
      
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Title</label>
        <input 
          type="text" 
          value={state.form?.thank_you_title || ""} 
          onChange={(e) => handleUpdate("thank_you_title", e.target.value)}
          className="h-10 w-full border border-builder-divider rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Message</label>
        <textarea 
          value={state.form?.thank_you_message || ""} 
          onChange={(e) => handleUpdate("thank_you_message", e.target.value)}
          className="w-full border border-builder-divider rounded-lg p-3 text-sm bg-white focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 min-h-[100px]"
        />
      </div>
    </div>
  );
}

function QuestionEditor({ question, formId }: { question: QuestionRead, formId: number }) {
  const { dispatch } = useBuilderStore();
  const handleUpdate = (updates: Partial<QuestionRead>) => {
    dispatch({ type: "UPDATE_QUESTION", payload: { id: question.id, updates } });
  };

  const handleSettingsUpdate = (key: string, value: unknown) => {
    const settings = { ...question.settings, [key]: value };
    handleUpdate({ settings });
  };

  return (
    <div className="w-[320px] max-lg:absolute max-lg:right-0 max-lg:z-20 max-lg:h-full bg-builder-panel border-l border-builder-divider flex flex-col overflow-y-auto">
      <div className="p-5 border-b border-builder-divider">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Type</span>
        </div>
        <select
          aria-label="Question type"
          value={question.type}
          onChange={(e) => {
            const nextType = e.target.value as QuestionType;
            const keepsOptions = nextType === "multiple_choice" || nextType === "dropdown";
            if (question.options.length && !keepsOptions &&
              !window.confirm("Changing type will remove this question's options. Continue?")) return;
            handleUpdate({ type: nextType, ...(keepsOptions ? {} : { options: [] }) });
          }}
          className="w-full h-10 px-3 border border-builder-divider rounded-lg bg-white capitalize text-sm focus:outline-none focus:border-brand-accent"
        >
          {(["short_text", "long_text", "email", "number", "multiple_choice", "dropdown", "yes_no", "rating"] as QuestionType[]).map((type) => (
            <option key={type} value={type}>{type.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      <div className="p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-brand">Required</span>
          <Switch 
            checked={question.required} 
            onCheckedChange={(c) => handleUpdate({ required: c })} 
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Description</label>
          <textarea
            value={question.description || ""}
            onChange={(e) => handleUpdate({ description: e.target.value })}
            placeholder="Add an optional description"
            className="min-h-20 w-full border border-builder-divider rounded-lg bg-white p-3 text-sm focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          />
        </div>

        {["short_text", "long_text", "email", "number"].includes(question.type) && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Placeholder text</label>
            <input 
              type="text" 
              value={(question.settings?.placeholder as string) || ""} 
              onChange={(e) => handleSettingsUpdate("placeholder", e.target.value)}
              className="h-10 w-full border border-builder-divider rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
            />
          </div>
        )}

        {question.type === "number" && (
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Min</label>
              <input 
                type="number" 
                value={(question.settings?.number_min as number) || ""} 
                onChange={(e) => handleSettingsUpdate("number_min", e.target.value ? Number(e.target.value) : null)}
                className="h-10 w-full border border-builder-divider rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Max</label>
              <input 
                type="number" 
                value={(question.settings?.number_max as number) || ""} 
                onChange={(e) => handleSettingsUpdate("number_max", e.target.value ? Number(e.target.value) : null)}
                className="h-10 w-full border border-builder-divider rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              />
            </div>
          </div>
        )}

        {question.type === "rating" && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Steps</label>
            <select 
              value={(question.settings?.rating_max as number) || 5}
              onChange={(e) => handleSettingsUpdate("rating_max", Number(e.target.value))}
              className="h-10 w-full border border-builder-divider rounded-lg px-3 text-sm bg-white focus:outline-none focus:border-brand-accent"
            >
              {[3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}

        {(question.type === "multiple_choice" || question.type === "dropdown") && (
          <div className="flex flex-col gap-2">
             <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Options</label>
             <OptionsEditor question={question} formId={formId} />
             {question.type === "multiple_choice" && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm font-medium text-brand">Allow multiple selection</span>
                  <Switch 
                    checked={!!question.settings?.allow_multiple} 
                    onCheckedChange={(c) => handleSettingsUpdate("allow_multiple", c)} 
                  />
                </div>
             )}

          </div>
        )}

        <details className="border-t border-builder-divider pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Logic <span className="ml-1 text-[10px] font-normal text-neutral-400">Coming soon</span></summary>
          <p className="mt-2 rounded-lg bg-white p-3 text-xs leading-5 text-neutral-500">Conditional routing will be available in a future builder update.</p>
        </details>
        <details className="border-t border-builder-divider pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Theme</summary>
          <p className="mt-2 rounded-lg bg-white p-3 text-xs leading-5 text-neutral-500">Theme settings apply to the respondent view.</p>
        </details>
      </div>
    </div>
  );
}
