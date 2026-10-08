"use client";

import { FormListItem } from "@/lib/types";
import { relativeTime, publicFormUrl } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/DropdownMenu";
import { MoreHorizontal, Edit2, Copy, Eye, EyeOff, Link as LinkIcon, Trash2, Blocks } from "lucide-react";
import { useDuplicateForm, usePublishForm, useUnpublishForm, useDeleteForm, useRenameForm } from "@/lib/api/forms";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function FormList({ forms, view }: { forms: FormListItem[], view: "list" | "grid" }) {
  if (view === "grid") {
    return (
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6">
        {forms.map(form => <FormCard key={form.id} form={form} view="grid" />)}
      </div>
    );
  }
  
  return (
    <div className="bg-white min-w-0">
      <div className="hidden sm:grid grid-cols-[1fr_100px_100px_120px_100px_40px] gap-4 px-4 py-2 text-xs font-medium text-[#9B9B9B] border-b border-[#F5F5F5]">
        <div className="opacity-0">Title</div>
        <div className="text-right">Responses</div>
        <div className="text-right">Completed</div>
        <div>Updated</div>
        <div>Integrations</div>
        <div></div>
      </div>
      <div className="flex flex-col gap-2 sm:gap-1 mt-2">
        {forms.map(form => <FormCard key={form.id} form={form} view="list" />)}
      </div>
    </div>
  );
}

function FormCard({ form, view }: { form: FormListItem, view: "list" | "grid" }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(form.title);
  
  const duplicateForm = useDuplicateForm();
  const publishForm = usePublishForm();
  const unpublishForm = useUnpublishForm();
  const deleteForm = useDeleteForm();
  const renameForm = useRenameForm();

  const isPublished = form.status === "published";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicFormUrl(form.public_id));
    toast.success("Link copied");
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    renameForm.mutate({ id: form.id, title: newName }, {
      onSuccess: () => setRenameOpen(false)
    });
  };

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 rounded-md hover:bg-[#E5E5E5] text-[#262627] outline-none" onClick={e => e.stopPropagation()}>
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
          <Edit2 size={16} /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => duplicateForm.mutate(form.id)}>
          <Copy size={16} /> Duplicate
        </DropdownMenuItem>
        
        {isPublished ? (
          <>
            <DropdownMenuItem onSelect={() => unpublishForm.mutate(form.id)}>
              <EyeOff size={16} /> Unpublish
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleCopyLink}>
              <LinkIcon size={16} /> Copy link
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onSelect={() => publishForm.mutate(form.id)}>
            <Eye size={16} /> Publish
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>
          <Trash2 size={16} /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const handleClick = () => {
    router.push(`/forms/${form.id}/edit`);
  };

  if (view === "grid") {
    return (
      <>
        <div 
          onClick={handleClick}
          className="bg-white rounded-[16px] border border-[#E5E5E5] p-5 flex flex-col cursor-pointer hover:shadow-sm transition-shadow group h-[160px] w-full sm:w-[260px]"
        >
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium text-[#262627] text-[15px] truncate pr-2 flex-1">{form.title}</h3>
            <div className="-mt-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
              {menu}
            </div>
          </div>
          <div className="flex items-center text-[13px] text-[#6B6B6B] mb-auto">
            <span>{form.response_count} response{form.response_count !== 1 ? 's' : ''}</span>
            <span className="mx-2">•</span>
            <span className={isPublished ? "text-[#0EC290] font-medium" : "text-[#9B9B9B]"}>{isPublished ? "Published" : "Draft"}</span>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div className="w-8 h-8 rounded border border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-center text-[#9B9B9B]">
              <Blocks size={16} />
            </div>
          </div>
        </div>
        <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} formTitle={form.title} onConfirm={() => deleteForm.mutate(form.id)} loading={deleteForm.isPending} />
        <RenameDialog open={renameOpen} onOpenChange={setRenameOpen} newName={newName} setNewName={setNewName} onConfirm={handleRename} loading={renameForm.isPending} />
      </>
    );
  }

  return (
    <>
      <div 
        onClick={handleClick}
        className="flex flex-col sm:grid sm:grid-cols-[1fr_100px_100px_120px_100px_40px] gap-2 sm:gap-4 p-4 sm:px-4 sm:py-2 sm:items-center hover:bg-[#FAFAFA] rounded-md cursor-pointer transition-colors group border sm:border-transparent border-[#F5F5F5] mb-2 sm:mb-0 relative"
      >
        <div className="flex items-center gap-3 sm:pr-4">
          <div className="w-8 h-8 rounded-md bg-[#E57373] shrink-0 overflow-hidden relative border border-[#E5E5E5]">
             {/* Thumbnail placeholder */}
          </div>
          <span className="font-medium text-sm text-[#262627] truncate pr-8 sm:pr-0">{form.title}</span>
        </div>
        
        <div className="absolute top-4 right-4 sm:static opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {menu}
        </div>

        <div className="flex items-center gap-4 text-[#9B9B9B] text-xs sm:hidden ml-11">
          <span>{form.response_count > 0 ? `${form.response_count} responses` : "No responses"}</span>
          <span>•</span>
          <span>{relativeTime(form.updated_at)}</span>
        </div>

        <div className="hidden sm:block text-right text-[#9B9B9B] text-sm">{form.response_count > 0 ? form.response_count : "-"}</div>
        <div className="hidden sm:block text-right text-[#9B9B9B] text-sm">-</div>
        <div className="hidden sm:block text-[#9B9B9B] text-sm">{relativeTime(form.updated_at)}</div>
        <div className="hidden sm:flex text-[#9B9B9B] gap-1 items-center">
           <Blocks size={14} />
           <span className="text-[10px]">+</span>
        </div>
      </div>
      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} formTitle={form.title} onConfirm={() => deleteForm.mutate(form.id)} loading={deleteForm.isPending} />
      <RenameDialog open={renameOpen} onOpenChange={setRenameOpen} newName={newName} setNewName={setNewName} onConfirm={handleRename} loading={renameForm.isPending} />
    </>
  );
}

function DeleteDialog({ open, onOpenChange, formTitle, onConfirm, loading }: { open: boolean, onOpenChange: (open: boolean) => void, formTitle: string, onConfirm: () => void, loading: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete form?</DialogTitle>
          <DialogDescription>
            You're about to delete "{formTitle}".<br/><br/>
            This will also:<br/>
            • Delete all responses collected by this form<br/><br/>
            This will permanently delete the form.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ open, onOpenChange, newName, setNewName, onConfirm, loading }: { open: boolean, onOpenChange: (open: boolean) => void, newName: string, setNewName: (name: string) => void, onConfirm: (e: React.FormEvent) => void, loading: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onConfirm}>
          <DialogHeader>
            <DialogTitle>Rename form</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              autoFocus 
              placeholder="Form title"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={loading} disabled={!newName.trim()}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
