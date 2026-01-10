// =============================================================================
// CONFIRM DIALOG
// =============================================================================
// Reusable confirmation modal component.

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex justify-center items-center z-[1000]"
      onClick={onCancel}
    >
      <div
        className="bg-game-bg border-2 border-game-border rounded-lg p-6 max-w-sm w-[90%] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-game-error text-lg font-mono mb-4 m-0">{title}</h2>
        <p className="text-gray-400 text-sm font-mono leading-relaxed mb-6 m-0">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-game-panel border border-game-border rounded text-gray-400 text-sm font-mono cursor-pointer hover:text-white hover:border-white transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-game-error border border-red-400 rounded text-white text-sm font-mono cursor-pointer hover:bg-red-500 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
