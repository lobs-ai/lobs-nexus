export default function GlassCard({ children, className = '', glow = false, onClick }) {
  return (
    <div
      className={`glass-card p-5 ${glow ? 'glow' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ transition: 'all 0.2s' }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
