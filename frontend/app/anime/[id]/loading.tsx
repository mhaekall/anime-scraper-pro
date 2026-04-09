// Loading states for dynamic routes
export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-white/20 border-t-[var(--accent)] rounded-full anim-spin" />
    </div>
  );
}
