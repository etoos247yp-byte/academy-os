import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', message = '로딩 중...' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className={`${sizeClasses[size]} text-[#00b6b2] animate-spin`} />
      {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
    </div>
  );
}

export function FullPageLoader({ message = '로딩 중...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}
