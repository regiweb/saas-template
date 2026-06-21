const DOT = {
  register: 'dot-reg',
  login:    'dot-login',
  error:    'dot-err',
  warn:     'dot-warn',
  pw:       'dot-pw',
  role:     'dot-role',
  block:    'dot-block',
}

export default function ActivityFeed({ items }) {
  return (
    <div className="feed-list">
      {items.map((item, i) => (
        <div key={i} className="feed-item">
          <div className={`feed-dot ${DOT[item.type] ?? 'dot-reg'}`} />
          <div className="feed-info">
            <div className="feed-event">
              {item.event
                ? item.event
                : (
                  <>
                    {item.prefix && <>{item.prefix} · </>}
                    <strong>{item.actor}</strong>
                    {item.verb && <> {item.verb}</>}
                  </>
                )
              }
            </div>
            <div className="feed-meta">{item.meta}</div>
          </div>
          <div className="feed-time">{item.time}</div>
        </div>
      ))}
    </div>
  )
}
