export default function LoadingSkeleton() {
  return (
    <div className="w-full animate-fade-in-up">
      <div className="glass-card rounded-2xl overflow-hidden shadow-lg shadow-black/5">
        {/* Product info skeleton */}
        <div className="flex gap-4 p-4">
          {/* Image skeleton */}
          <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl animate-shimmer" />

          {/* Text skeleton */}
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-4 bg-gray-200 rounded-lg w-3/4 animate-shimmer" />
            <div className="h-3 bg-gray-200 rounded-lg w-full animate-shimmer" />
            <div className="h-3 bg-gray-200 rounded-lg w-1/2 animate-shimmer" />
            <div className="h-5 bg-gray-200 rounded-full w-16 animate-shimmer" />
          </div>
        </div>

        {/* Link skeleton */}
        <div className="mx-4 mb-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="h-3 bg-gray-200 rounded w-24 mb-2 animate-shimmer" />
            <div className="h-3 bg-gray-200 rounded w-full animate-shimmer" />
          </div>
        </div>

        {/* Buttons skeleton */}
        <div className="flex gap-2.5 px-4 pb-4">
          <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-shimmer" />
          <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
