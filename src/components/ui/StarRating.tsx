interface Props { stars: number; max?: number; size?: number }

export default function StarRating({ stars, max = 3, size = 28 }: Props) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < stars ? 'star-pop' : ''}
          style={{ fontSize: size, filter: i < stars ? 'none' : 'grayscale(1) opacity(0.3)', animationDelay: `${i * 0.15}s` }}
        >
          ⭐
        </span>
      ))}
    </div>
  )
}
