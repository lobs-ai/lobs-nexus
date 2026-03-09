/** Subtle shimmer placeholder for AI loading states */
export default function Shimmer({ width = '100%', height = 16, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 6,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}
