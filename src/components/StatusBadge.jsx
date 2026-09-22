export default function StatusBadge({ status }) {
  const className = `status-pill status-${(status || 'Novo').replace(/\s+/g, '-')}`
  return <span className={className}>{status || 'Novo'}</span>
}
