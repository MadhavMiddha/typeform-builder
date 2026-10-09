"use client";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { Tooltip } from "@/components/ui/Tooltip";
import { QuestionType, QuestionRead } from "@/lib/types";
import { typeIcons } from "@/components/player/QuestionView";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReplaceLogic } from "@/lib/api/questions";
import { ComingSoon } from "@/components/ui/ComingSoon";

export function SettingsPanel() {
  const { state, dispatch } = useBuilderStore();
  const form = state.form;

  if (!form) return null;

  if (state.selectedItem === "welcome") {
    return <WelcomeEditor />;
  }

  if (state.selectedItem === "thank_you") {
    return (
      <div className="bg-[#f5f5f5] rounded-[16px] p-4 flex flex-col gap-3">
        <h3 className="text-[14px] font-semibold text-brand">Ending Screen</h3>
        <p className="text-xs text-neutral-500">Edit title and message inline on the canvas.</p>
      </div>
    );
  }

  const question = form.questions.find((q) => q.id === state.selectedItem);
  if (!question) return null;

  return <QuestionEditor question={question} formId={form.id} />;
}

function WelcomeEditor() {
  const { state, dispatch } = useBuilderStore();
  const currentButton = state.form?.welcome_button_label || "Start Survey";

  const handleUpdateButton = (value: string) => {
    if (value.length <= 24) {
      dispatch({ type: "UPDATE_FORM_FIELD", payload: { field: "welcome_button_label", value } });
    }
  };

  return (
    <div className="bg-[#f5f5f5] rounded-[16px] p-5 flex flex-col gap-5">
      <h3 className="text-[15px] font-semibold text-brand">Welcome Screen</h3>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-neutral-600">Button</label>
          <span className="text-[11px] text-neutral-400">
            {currentButton.length}/24
          </span>
        </div>
        <input
          type="text"
          maxLength={24}
          value={currentButton}
          onChange={(e) => handleUpdateButton(e.target.value)}
          className="h-9 w-full border border-neutral-200 rounded-lg px-3 text-xs bg-white text-brand focus:outline-none focus:border-[#262627]"
        />
      </div>
    </div>
  );
}

const typeDefinitions: { type: QuestionType; label: string; badgeBg: string; badgeText: string }[] = [
  { type: "short_text", label: "Short Text", badgeBg: "bg-[#e0f2fe]", badgeText: "text-[#0284c7]" },
  { type: "long_text", label: "Long Text", badgeBg: "bg-[#e0f2fe]", badgeText: "text-[#0284c7]" },
  { type: "email", label: "Email", badgeBg: "bg-[#fce7f3]", badgeText: "text-[#db2777]" },
  { type: "number", label: "Number", badgeBg: "bg-[#fef9c3]", badgeText: "text-[#ca8a04]" },
  { type: "multiple_choice", label: "Multiple Choice", badgeBg: "bg-[#ede9fe]", badgeText: "text-[#7c3aed]" },
  { type: "dropdown", label: "Dropdown", badgeBg: "bg-[#ede9fe]", badgeText: "text-[#7c3aed]" },
  { type: "yes_no", label: "Yes/No", badgeBg: "bg-[#ede9fe]", badgeText: "text-[#7c3aed]" },
  { type: "rating", label: "Rating", badgeBg: "bg-[#dcfce7]", badgeText: "text-[#16a34a]" },
];

function QuestionEditor({ question, formId }: { question: QuestionRead; formId: number }) {
  const { state, dispatch } = useBuilderStore();
  const replaceLogic = useReplaceLogic(formId);
  const laterQuestions = useBuilderStore().state.form?.questions
    .filter((candidate) => candidate.position > question.position) ?? [];
  const firstRule = question.logic_rules[0];
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [stepsDropdownOpen, setStepsDropdownOpen] = useState(false);

  const handleUpdate = (updates: Partial<QuestionRead>) => {
    dispatch({ type: "UPDATE_QUESTION", payload: { id: question.id, updates } });
  };

  const handleSettingsUpdate = (key: string, value: unknown) => {
    const settings = { ...question.settings, [key]: value };
    handleUpdate({ settings });
  };

  const currentTypeInfo =
    typeDefinitions.find((t) => t.type === question.type) || typeDefinitions[0];

  const handleTypeSelect = (nextType: QuestionType) => {
    setTypeDropdownOpen(false);
    if (nextType === question.type) return;
    const keepsOptions = nextType === "multiple_choice" || nextType === "dropdown";
    if (
      question.options.length &&
      !keepsOptions &&
      !window.confirm("Changing type will remove this question's options. Continue?")
    ) {
      return;
    }
    handleUpdate({ type: nextType, ...(keepsOptions ? {} : { options: [] }) });
  };

  // Toggles state for optional subfields
  const hasMaxChars = question.settings?.max_characters != null;
  const hasCustomPlaceholder = !!question.settings?.custom_placeholder;
  const hasMinNumber = question.settings?.number_min != null;
  const hasMaxNumber = question.settings?.number_max != null;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pr-0.5 custom-thin-scrollbar">
      {/* 1. Question Card */}
      <div className="bg-[#f5f5f5] rounded-[16px] p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-neutral-600">Question</h3>
        <div className="grid grid-cols-2 bg-neutral-200/60 p-1 rounded-lg text-xs font-medium">
          <button className="py-1.5 rounded-md bg-white text-brand shadow-sm text-center">
            Text
          </button>
          <Tooltip content="Coming soon">
            <button
              disabled
              className="py-1.5 rounded-md text-neutral-400 cursor-not-allowed text-center"
            >
              Video
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 2. Answer Card */}
      <div className="bg-[#f5f5f5] rounded-[16px] p-4 flex flex-col gap-4">
        <h3 className="text-xs font-semibold text-neutral-600">Answer</h3>

        {/* Custom Type Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
            className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-lg flex items-center justify-between hover:border-neutral-300 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0",
                  currentTypeInfo.badgeBg,
                  currentTypeInfo.badgeText
                )}
              >
                {typeIcons[question.type]}
              </span>
              <span className="text-xs font-medium text-brand">{currentTypeInfo.label}</span>
            </div>
            <ChevronDown size={14} className="text-neutral-400" />
          </button>

          {typeDropdownOpen && (
            <div className="absolute left-0 right-0 top-11 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg p-1 flex flex-col gap-0.5">
              {typeDefinitions.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleTypeSelect(item.type)}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-md flex items-center gap-2.5 text-xs text-left hover:bg-neutral-100 transition-colors",
                    item.type === question.type ? "bg-neutral-50 font-semibold" : "font-normal"
                  )}
                >
                  <span
                    className={cn(
                      "w-5 h-5 rounded-[4px] flex items-center justify-center shrink-0",
                      item.badgeBg,
                      item.badgeText
                    )}
                  >
                    {typeIcons[item.type]}
                  </span>
                  <span className="text-brand">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-neutral-200/80 my-1" />

        {/* Settings Rows with Toggles */}
        <div className="flex flex-col gap-3.5">
          {/* Required toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-brand">Required</span>
            <Switch
              checked={question.required}
              onCheckedChange={(c) => handleUpdate({ required: c })}
            />
          </div>

          {/* Short Text & Long Text settings */}
          {(question.type === "short_text" || question.type === "long_text") && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-brand">Max characters</span>
                <Switch
                  checked={hasMaxChars}
                  onCheckedChange={(c) =>
                    handleSettingsUpdate("max_characters", c ? 255 : null)
                  }
                />
              </div>
              {hasMaxChars && (
                <input
                  type="number"
                  value={(question.settings?.max_characters as number) || ""}
                  onChange={(e) =>
                    handleSettingsUpdate(
                      "max_characters",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="h-8 border border-neutral-200 rounded-lg px-2 text-xs bg-white focus:outline-none focus:border-[#262627]"
                  placeholder="e.g. 255"
                />
              )}
            </>
          )}

          {/* Custom placeholder text toggle */}
          {["short_text", "long_text", "email", "number"].includes(question.type) && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-brand">Custom placeholder text</span>
                <Switch
                  checked={hasCustomPlaceholder}
                  onCheckedChange={(c) => {
                    handleSettingsUpdate("custom_placeholder", c);
                    if (!c) handleSettingsUpdate("placeholder", null);
                  }}
                />
              </div>
              {hasCustomPlaceholder && (
                <input
                  type="text"
                  value={(question.settings?.placeholder as string) || ""}
                  onChange={(e) => handleSettingsUpdate("placeholder", e.target.value)}
                  placeholder="Type a custom placeholder..."
                  className="h-8 border border-neutral-200 rounded-lg px-2 text-xs bg-white focus:outline-none focus:border-[#262627]"
                />
              )}
            </>
          )}

          {/* Number specific settings */}
          {question.type === "number" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-brand">Min number</span>
                <Switch
                  checked={hasMinNumber}
                  onCheckedChange={(c) => handleSettingsUpdate("number_min", c ? 0 : null)}
                />
              </div>
              {hasMinNumber && (
                <input
                  type="number"
                  value={question.settings?.number_min ?? ""}
                  onChange={(e) =>
                    handleSettingsUpdate(
                      "number_min",
                      e.target.value !== "" ? Number(e.target.value) : null
                    )
                  }
                  className="h-8 border border-neutral-200 rounded-lg px-2 text-xs bg-white focus:outline-none focus:border-[#262627]"
                  placeholder="Minimum value"
                />
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-brand">Max number</span>
                <Switch
                  checked={hasMaxNumber}
                  onCheckedChange={(c) => handleSettingsUpdate("number_max", c ? 100 : null)}
                />
              </div>
              {hasMaxNumber && (
                <input
                  type="number"
                  value={question.settings?.number_max ?? ""}
                  onChange={(e) =>
                    handleSettingsUpdate(
                      "number_max",
                      e.target.value !== "" ? Number(e.target.value) : null
                    )
                  }
                  className="h-8 border border-neutral-200 rounded-lg px-2 text-xs bg-white focus:outline-none focus:border-[#262627]"
                  placeholder="Maximum value"
                />
              )}
            </>
          )}

          {/* Multiple choice settings */}
          {question.type === "multiple_choice" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-brand">Multiple selection</span>
                <Switch
                  checked={!!question.settings?.allow_multiple}
                  onCheckedChange={(c) => handleSettingsUpdate("allow_multiple", c)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-brand">Randomize</span>
                <Switch
                  checked={!!question.settings?.randomize}
                  onCheckedChange={(c) => handleSettingsUpdate("randomize", c)}
                />
              </div>
            </>
          )}

          {/* Dropdown settings */}
          {question.type === "dropdown" && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-brand">Randomize</span>
              <Switch
                checked={!!question.settings?.randomize}
                onCheckedChange={(c) => handleSettingsUpdate("randomize", c)}
              />
            </div>
          )}

          {/* Rating Steps custom dropdown */}
          {question.type === "rating" && (
            <div className="flex items-center justify-between relative">
              <span className="text-xs font-medium text-brand">Steps</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStepsDropdownOpen(!stepsDropdownOpen)}
                  className="h-8 px-3 border border-neutral-200 rounded-lg bg-white text-xs font-medium text-brand flex items-center gap-2 hover:border-neutral-300"
                >
                  <span>{(question.settings?.rating_max as number) || 5}</span>
                  <ChevronDown size={13} className="text-neutral-400" />
                </button>

                {stepsDropdownOpen && (
                  <div className="absolute right-0 top-9 z-50 bg-white border border-neutral-200 rounded-lg shadow-md p-1 grid grid-cols-2 gap-1 w-24">
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          handleSettingsUpdate("rating_max", num);
                          setStepsDropdownOpen(false);
                        }}
                        className={cn(
                          "py-1 text-center text-xs rounded hover:bg-neutral-100",
                          ((question.settings?.rating_max as number) || 5) === num
                            ? "bg-neutral-100 font-bold"
                            : ""
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Logic Card */}
      <div className="bg-[#f5f5f5] rounded-[16px] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-600">Logic</span>
          <button
            type="button"
            className="text-xs text-brand hover:underline disabled:text-neutral-400"
            disabled={replaceLogic.isPending || laterQuestions.length === 0}
            onClick={() => {
              const destination = laterQuestions[0];
              if (!destination) return;
              const rule = { operator: "equals", value: "", jump_to_question_id: destination.id, jump_to_end: false };
              replaceLogic.mutate({ qid: question.id, rules: [...question.logic_rules.map(({ operator, value, jump_to_question_id, jump_to_end }) => ({ operator, value, jump_to_question_id, jump_to_end })), rule] }, {
                onSuccess: (updated) => dispatch({ type: "UPDATE_QUESTION", payload: { id: question.id, updates: updated } }),
              });
            }}
          >Add rule</button>
        </div>
        {firstRule ? (
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <select
              value={firstRule.operator}
              onChange={(event) => replaceLogic.mutate({
                qid: question.id,
                rules: [{ operator: event.target.value, value: firstRule.value, jump_to_question_id: firstRule.jump_to_question_id, jump_to_end: firstRule.jump_to_end }],
              })}
              className="h-8 rounded border border-neutral-200 bg-white px-2 text-xs"
            >
              {["equals", "not_equals", "contains", "greater_than", "less_than"].map((operator) => <option key={operator} value={operator}>{operator.replace("_", " ")}</option>)}
            </select>
            <input
              value={firstRule.value ?? ""}
              onChange={(event) => replaceLogic.mutate({ qid: question.id, rules: [{ operator: firstRule.operator, value: event.target.value, jump_to_question_id: firstRule.jump_to_question_id, jump_to_end: firstRule.jump_to_end }] })}
              placeholder="value"
              className="h-8 rounded border border-neutral-200 bg-white px-2 text-xs"
            />
            <span className="col-span-2 text-[11px] text-neutral-500">Otherwise go to the next question.</span>
          </div>
        ) : (
          <p className="text-[11px] text-neutral-500">If answer matches a rule, jump to a later question or the end of the form.</p>
        )}
      </div>
      <ThemeEditor
        theme={state.form?.theme ?? null}
        onChange={(theme) => dispatch({ type: "UPDATE_FORM_FIELD", payload: { field: "theme", value: theme } })}
      />
      <ComingSoon disabled>Advanced logic, integrations and team sharing</ComingSoon>
    </div>
  );
}

function ThemeEditor({ theme, onChange }: { theme: import("@/lib/types").FormTheme | null; onChange: (theme: import("@/lib/types").FormTheme) => void }) {
  const value = theme ?? { background: "#ffffff", question_text: "#262627", answer_accent: "#6b5cff", button: "#262627", font_family: "Karla" };
  const presets: Record<string, import("@/lib/types").FormTheme> = {
    "Classic": { background: "#ffffff", question_text: "#262627", answer_accent: "#6b5cff", button: "#262627", font_family: "Karla" },
    "Midnight": { background: "#17171a", question_text: "#ffffff", answer_accent: "#9b87ff", button: "#ffffff", font_family: "Inter" },
    "Meadow": { background: "#effaf5", question_text: "#164e3b", answer_accent: "#0e9f6e", button: "#166534", font_family: "Open Sans" },
    "Sunset": { background: "#fff7ed", question_text: "#7c2d12", answer_accent: "#ea580c", button: "#9a3412", font_family: "Lato" },
  };
  const contrast = contrastRatio(value.question_text ?? "#262627", value.background ?? "#ffffff");
  return (
    <div className="bg-[#f5f5f5] rounded-[16px] p-4 flex flex-col gap-3">
      <span className="text-xs font-semibold text-neutral-600">Theme</span>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(presets).map(([name, preset]) => (
          <button key={name} type="button" onClick={() => onChange(preset)} className="rounded bg-white px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-100">{name}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["background", "question_text", "answer_accent", "button"] as const).map((key) => (
          <label key={key} className="text-[11px] text-neutral-500 flex items-center gap-2">
            <input type="color" value={value[key] ?? "#ffffff"} onChange={(event) => onChange({ ...value, [key]: event.target.value })} />
            {key.replace("_", " ")}
          </label>
        ))}
      </div>
      <select value={value.font_family ?? "Karla"} onChange={(event) => onChange({ ...value, font_family: event.target.value })} className="h-8 rounded border border-neutral-200 bg-white px-2 text-xs">
        {["Karla", "Inter", "Roboto", "Open Sans", "Lato"].map((font) => <option key={font}>{font}</option>)}
      </select>
      <input value={value.background_image ?? ""} onChange={(event) => onChange({ ...value, background_image: event.target.value || undefined })} placeholder="Optional background image URL" className="h-8 rounded border border-neutral-200 bg-white px-2 text-xs" />
      {contrast < 4.5 && <p role="alert" className="text-[11px] font-medium text-status-error">Text contrast is {contrast.toFixed(2)}:1. Choose colours with at least 4.5:1 contrast.</p>}
    </div>
  );
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const clean = hex.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(clean)) return 0;
    const channels = [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16) / 255);
    const linear = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}
