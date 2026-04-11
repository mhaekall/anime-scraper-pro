export default function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-black pb-24 animate-pulse">
      {/* Hero skeleton */}
      <div className="w-full h-[280px] bg-[#1c1c1e]" />
      
      <div className="px-5 -mt-16 relative z-10 max-w-4xl mx-auto">
        <div className="flex gap-4 mb-6">
          {/* Cover */}
          <div className="w-[100px] aspect-[2/3] rounded-2xl bg-[#2c2c2e] shrink-0" />
          
          <div className="pt-10 flex-1 space-y-3">
            {/* Title */}
            <div className="h-8 w-3/4 bg-[#2c2c2e] rounded-xl" />
            <div className="h-4 w-1/2 bg-[#2c2c2e] rounded-lg" />
            {/* Buttons */}
            <div className="flex gap-2 mt-4">
              <div className="h-11 w-32 bg-[#2c2c2e] rounded-2xl" />
              <div className="h-11 w-12 bg-[#2c2c2e] rounded-2xl" />
            </div>
          </div>
        </div>
        
        {/* Episode list skeleton */}
        <div className="space-y-2 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-2.5 rounded-2xl bg-[#1c1c1e]/50">
              <div className="w-[110px] aspect-video rounded-xl bg-[#2c2c2e]" />
              <div className="flex-1 space-y-2 py-2">
                <div className="h-4 w-3/4 bg-[#2c2c2e] rounded" />
                <div className="h-3 w-1/3 bg-[#2c2c2e] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}