"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

type Props = {
  onDeleteAll: () => void;
};

export function ActionsMenu({ onDeleteAll }: Props) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 hover:bg-white/[0.05] hover:text-white transition-all active:scale-95">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          align="end" 
          sideOffset={8}
          className="z-50 w-48 rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={() => {
              onDeleteAll();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Apagar todas
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
