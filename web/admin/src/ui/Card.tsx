export default function Card({ className = "", children }: any) {
  return (
    <div className={`bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 shadow ${className}`}>
      {children}
    </div>
  );
}
