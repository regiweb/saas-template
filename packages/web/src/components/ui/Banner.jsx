export function Banner({ type = 'err', children }) {
  return <div className={`banner banner-${type}`}>{children}</div>
}
