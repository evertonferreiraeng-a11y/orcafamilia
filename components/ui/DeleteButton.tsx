'use client';

import { useTransition } from 'react';
import { IconTrash } from '@/components/icons';

export function DeleteButton({
  action,
  confirmMessage = 'Tem certeza que deseja excluir?',
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(() => {
            action();
          });
        }
      }}
      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-negative disabled:opacity-50"
      aria-label="Excluir"
    >
      <IconTrash className="h-4 w-4" />
    </button>
  );
}
