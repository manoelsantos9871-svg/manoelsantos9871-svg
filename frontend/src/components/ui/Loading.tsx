import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ className = 'h-6 w-6' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-primary-500 ${className}`} />;
}

export function LoadingPage() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center space-y-3">
        <LoadingSpinner className="h-8 w-8 mx-auto" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-950/80">
      <LoadingSpinner className="h-10 w-10" />
    </div>
  );
}
