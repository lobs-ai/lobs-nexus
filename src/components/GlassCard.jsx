export default function GlassCard({ children, className = '', glow = false, onClick, style = {} }) {
  return (
    <div
      className={`glass-card ${glow ? 'glow' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ padding: '24px 24px', transition: 'all 0.25s', ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
