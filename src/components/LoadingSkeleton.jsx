export default function LoadingSkeleton({ lines = 3, height = 20 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            borderRadius: 6,
            background: 'linear-gradient(90deg, rgba(99,179,237,0.05) 25%, rgba(99,179,237,0.1) 50%, rgba(99,179,237,0.05) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
