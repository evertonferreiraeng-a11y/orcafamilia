export function EmptyState({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12 text-center">
      <p className="text-sm text-gray-400">{mensagem}</p>
    </div>
  );
}
