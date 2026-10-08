"use client";

import { useForms, useCreateForm } from "@/lib/api/forms";
import { Button } from "@/components/ui/Button";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { FormList } from "@/components/dashboard/FormList";
import { Search, LayoutGrid, List as ListIcon, Plus, X, ChevronDown, ChevronUp, Grip, CircleHelp, Blocks, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const router = useRouter();
  const { data: forms, isLoading, isError, refetch } = useForms();
  const createForm = useCreateForm();
  
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [showBanner, setShowBanner] = useState(true);

  const filteredForms = forms?.filter(f => 
    f.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    createForm.mutate({ title: "Untitled form" }, {
      onSuccess: (data) => {
        router.push(`/forms/${data.id}/edit`);
      }
    });
  };

  return (
    <div className="flex h-screen bg-[#FDFDFD] font-sans">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 md:mr-4 md:my-4 bg-white md:rounded-xl md:border border-[#E5E5E5] shadow-sm overflow-hidden">
        {/* Top Navbar */}
        <header className="h-[52px] border-b border-[#F5F5F5] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer hover:bg-[#F5F5F5] p-1.5 rounded-md transition-colors">
            <div className="w-6 h-6 rounded bg-[#E57373] text-white flex items-center justify-center text-xs font-semibold">M</div>
            <span className="font-medium text-sm text-[#262627]">middhamadhav</span>
            <ChevronDown size={14} className="text-[#6B6B6B]" />
          </div>
          
          <div className="flex items-center gap-4 text-sm font-medium text-[#262627]">
            <button className="hidden md:flex items-center gap-2 hover:bg-[#F5F5F5] px-2 py-1.5 rounded-md transition-colors">
              <Blocks size={16} className="text-[#6B6B6B]" />
              Integrations
            </button>
            <button className="hidden md:flex items-center gap-2 hover:bg-[#F5F5F5] px-2 py-1.5 rounded-md transition-colors">
              <Grip size={16} className="text-[#6B6B6B]" />
              Brand kit
            </button>
            <button className="text-[#6B6B6B] hover:bg-[#F5F5F5] p-1.5 rounded-full transition-colors">
              <CircleHelp size={18} />
            </button>
            <div className="w-7 h-7 rounded-full bg-[#FCE4E4] text-[#E57373] flex items-center justify-center text-xs font-semibold ml-2">
              MM
            </div>
          </div>
        </header>

        {/* Banner */}
        {showBanner && (
          <div className="m-4 bg-[#F0FDF9] border border-[#0EC290] rounded-md p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm relative gap-3 sm:gap-0">
             <div className="flex items-start sm:items-center gap-2 flex-1 text-sm text-[#262627] pr-6">
               <div className="w-5 h-5 flex items-center justify-center text-[#0EC290] shrink-0 mt-0.5 sm:mt-0">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 3L18 3L22 12L12 22L2 12L6 3Z"/></svg>
               </div>
               <span className="leading-relaxed">You can collect <strong>10 form responses</strong> this month for free.</span>
             </div>
             <button className="bg-[#026451] text-white px-3 py-1.5 rounded-md font-medium hover:bg-[#025040] transition-colors whitespace-nowrap self-stretch sm:self-auto text-center">Get more responses</button>
             <button onClick={() => setShowBanner(false)} className="text-[#6B6B6B] hover:text-[#262627] absolute right-3 top-3">
               <X size={16} />
             </button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 flex items-center gap-6 text-sm text-[#6B6B6B] border-b border-[#F5F5F5] overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
           <div className="py-3.5 border-b-2 border-[#262627] text-[#262627] font-medium cursor-pointer">Forms</div>
           <div className="py-3.5 hover:text-[#262627] cursor-pointer flex items-center gap-1">Contacts</div>
           <div className="py-3.5 hover:text-[#262627] cursor-pointer flex items-center gap-1">Automations</div>
           <div className="py-3.5 hover:text-[#262627] cursor-pointer flex items-center gap-1">Insights <div className="w-1.5 h-1.5 rounded-full bg-[#0EC290]"></div></div>
           <div className="py-3.5 hover:text-[#262627] cursor-pointer flex items-center gap-1">Pages <span className="text-[10px] bg-[#EAF2FF] text-[#2B6CB0] px-1.5 py-0.5 rounded font-semibold ml-1">Beta</span></div>
           <div className="py-3.5 hover:text-[#262627] cursor-pointer flex items-center gap-1">Research Flow</div>
        </div>

        {/* Main Workspace Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
           
           {/* Inner Left Nav */}
           <div className="w-full md:w-[240px] border-b md:border-b-0 md:border-r border-[#F5F5F5] flex-col bg-[#FAFAFA] hidden md:flex shrink-0">
              <div className="p-4 border-b border-[#F5F5F5]">
                 <button 
                   onClick={handleCreate}
                   disabled={createForm.isPending}
                   className="w-full bg-[#262627] hover:bg-[#1E1E1E] text-white rounded-md py-2.5 px-4 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                 >
                   <Plus size={16} /> Create form
                 </button>
              </div>
              
              <div className="p-4 border-b border-[#F5F5F5]">
                 <div className="relative">
                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9B9B9B]" size={14} />
                   <input 
                     type="text"
                     placeholder="Search"
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                     className="w-full text-sm bg-transparent border-none pl-8 pr-2 py-1 focus:outline-none placeholder:text-[#9B9B9B]"
                   />
                 </div>
              </div>

              <div className="flex-1 overflow-auto py-4">
                <div className="px-4 flex items-center justify-between text-sm font-medium text-[#6B6B6B] mb-2 cursor-pointer hover:text-[#262627]">
                  <div className="flex items-center gap-2"><LayoutGrid size={14}/> Workspaces</div>
                  <Plus size={14} />
                </div>
                
                <div className="px-4 flex items-center justify-between text-sm font-medium text-[#262627] mb-1 py-1.5">
                  Private
                  <ChevronUp size={14} className="text-[#6B6B6B]" />
                </div>
                
                <div className="mx-2 px-2 py-1.5 bg-[#F5F5F5] rounded-md flex items-center justify-between text-sm text-[#262627] font-medium cursor-pointer">
                  My workspace
                  <span className="text-[#9B9B9B] text-xs">1</span>
                </div>
              </div>

              <div className="p-4 border-t border-[#F5F5F5]">
                <div className="text-xs text-[#6B6B6B] mb-2 font-medium">Responses collected</div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0EC290] h-full w-0"></div>
                  </div>
                </div>
                <div className="text-xs font-semibold text-[#262627] mb-3">0 <span className="text-[#9B9B9B] font-normal">/ 10</span></div>
                <button className="w-full border border-[#D1D1D1] rounded-md py-1.5 text-xs font-medium text-[#262627] hover:bg-[#F5F5F5] transition-colors">
                  Increase response limit
                </button>
              </div>
           </div>

           {/* Form List area */}
           <div className="flex-1 overflow-auto bg-white flex flex-col min-w-0">
              {/* Mobile Actions */}
              <div className="md:hidden p-4 border-b border-[#F5F5F5] flex flex-col gap-3 bg-[#FAFAFA] shrink-0">
                 <button 
                   onClick={handleCreate}
                   disabled={createForm.isPending}
                   className="w-full bg-[#262627] hover:bg-[#1E1E1E] text-white rounded-md py-2.5 px-4 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                 >
                   <Plus size={16} /> Create form
                 </button>
                 <div className="relative">
                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9B9B9B]" size={14} />
                   <input 
                     type="text"
                     placeholder="Search"
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                     className="w-full text-sm bg-white border border-[#E5E5E5] rounded-md pl-8 pr-2 py-2 focus:outline-none placeholder:text-[#9B9B9B]"
                   />
                 </div>
              </div>

              <div className="p-4 sm:p-8 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4 sm:gap-0">
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
                    <h1 className="text-xl sm:text-2xl font-normal text-[#262627] truncate">My workspace</h1>
                    <button className="text-[#6B6B6B] hover:bg-[#F5F5F5] p-1 rounded transition-colors shrink-0"><MoreHorizontal size={18}/></button>
                    <button className="text-[#6B6B6B] hover:text-[#262627] text-sm font-medium flex items-center gap-1.5 ml-0 sm:ml-2 shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      <span className="hidden sm:inline">Invite</span>
                    </button>
                    <button className="text-[#0EC290] hover:bg-[#F0FDF9] p-1 rounded transition-colors ml-1 shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 3L18 3L22 12L12 22L2 12L6 3Z"/></svg>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full sm:w-auto shrink-0 pb-1 sm:pb-0">
                  <button className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262627] font-medium border border-[#D1D1D1] rounded-md px-3 py-1.5 hover:bg-[#F5F5F5] transition-colors shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Date created <ChevronDown size={14} />
                  </button>
                  <div className="flex border border-[#D1D1D1] rounded-md overflow-hidden bg-white shrink-0">
                    <button 
                      onClick={() => setView("list")}
                      className={`px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium ${view === "list" ? "bg-[#F5F5F5] text-[#262627]" : "text-[#6B6B6B] hover:bg-[#FAFAFA]"}`}
                    >
                      <ListIcon size={14} /> List
                    </button>
                    <div className="w-px bg-[#D1D1D1]"></div>
                    <button 
                      onClick={() => setView("grid")}
                      className={`px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium ${view === "grid" ? "bg-[#F5F5F5] text-[#262627]" : "text-[#6B6B6B] hover:bg-[#FAFAFA]"}`}
                    >
                      <LayoutGrid size={14} /> Grid
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-8 pb-8 flex-1">
                {isLoading ? (
                  <div className="space-y-4 mt-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : isError ? (
                  <div className="text-center py-12">
                    <p className="text-[#E53E3E] mb-4">Failed to load forms.</p>
                    <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
                  </div>
                ) : !filteredForms?.length ? (
                  <div className="text-center py-20 mt-8 bg-[#FAFAFA] rounded-xl border border-dashed border-[#D1D1D1]">
                    <h3 className="text-lg font-medium text-[#262627] mb-2">No forms found</h3>
                    <p className="text-[#6B6B6B] mb-6 max-w-sm mx-auto">
                      {search ? "Try adjusting your search terms." : "Create your first form to start collecting responses."}
                    </p>
                    {!search && (
                      <Button onClick={handleCreate} loading={createForm.isPending} className="bg-[#262627] text-white">
                        Create form
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <FormList forms={filteredForms} view={view} />
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
