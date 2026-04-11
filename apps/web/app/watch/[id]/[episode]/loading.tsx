export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[300]">
      <div className="w-10 h-10 border-3 border-white/20 border-t-[var(--accent)] rounded-full anim-spin" />
    </div>
  );
}
