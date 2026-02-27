interface ConnectionBannerProps {
  apiUrl: string
  error?: string
}

export function ConnectionBanner({ apiUrl, error }: ConnectionBannerProps): React.JSX.Element {
  const isError = Boolean(error)
  const isReconnecting = !isError
  const bannerClass = isError
    ? 'bg-error/20 border-error/40 text-error'
    : 'bg-warning/20 border-warning/40 text-warning'
  const iconClass = isError ? 'text-error' : 'text-warning animate-pulse'

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2 border-b text-sm shrink-0 transition-colors duration-[--duration-normal] ${bannerClass}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`w-4 h-4 shrink-0 ${iconClass}`}
        role="img"
        aria-label={isError ? 'Error' : 'Warning'}
      >
        <title>{isError ? 'Error' : 'Warning'}</title>
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <span className="min-w-0 flex-1 truncate transition-colors duration-[--duration-normal]">
        COS disconnected{apiUrl ? ` — cannot reach ${apiUrl}` : ''}
        {error ? `: ${error}` : ''}
      </span>
      <span
        className={`h-2 w-2 rounded-full ${isReconnecting ? 'bg-warning animate-pulse' : 'bg-error'}`}
        aria-hidden="true"
      />
    </div>
  )
}
