import { Sparkles, Send, X, ExternalLink } from "lucide-react";

export function DashboardSidebar() {
  return (
    <aside className="hidden md:flex w-[280px] h-[calc(100vh-32px)] my-4 ml-4 bg-white rounded-xl border border-[#E5E5E5] flex-col shrink-0 shadow-sm">
      <div className="p-4 flex items-center justify-between border-b border-[#F5F5F5]">
        <div className="flex items-center gap-2 font-medium text-[#262627]">
          <Sparkles className="text-purple-600" size={16} />
          Typeform AI <span className="text-[10px] bg-[#F5F5F5] px-1.5 py-0.5 rounded text-purple-600 font-semibold tracking-wide">Beta</span>
        </div>
        <button className="text-[#6B6B6B] hover:bg-[#F5F5F5] p-1 rounded-md">
          <ExternalLink size={16} />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6">
          <Sparkles size={24} />
        </div>
        <h3 className="text-xl font-semibold text-[#262627] mb-3">What do you want to<br/>achieve?</h3>
        <p className="text-sm text-[#6B6B6B] mb-8 leading-relaxed">
          Tell Typeform AI your business goal. It can help you build forms, manage contacts, and create automations to get you there.
        </p>
        <button className="border border-[#D1D1D1] rounded-md px-4 py-2 text-sm font-medium text-[#262627] hover:bg-[#F5F5F5] transition-colors">
          Help me get started
        </button>
      </div>
      <div className="p-4 border-t border-[#F5F5F5]">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Ask Typeform AI" 
            className="w-full text-sm border border-[#D1D1D1] rounded-md pl-3 pr-8 py-2.5 focus:outline-none focus:border-[#262627] placeholder:text-[#9B9B9B]" 
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 text-[#D1D1D1] hover:text-[#6B6B6B]">
            <Send size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
