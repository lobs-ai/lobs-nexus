export default function GlassCard({ children, className = '', glow = false, onClick, style = {} }) {
  return (
    <div
      className={`glass-card p-6 ${glow ? 'glow' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ transition: 'all 0.25s', ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
