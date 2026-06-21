type AppLogoProps = {
  className?: string;
  title?: string;
};

export function AppLogo({ className, title = "DDL ERD Visualizer" }: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="currentColor"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <rect x="7" y="9" width="22" height="6" rx="1.5" />
      <rect x="7" y="17" width="22" height="9" rx="1.5" opacity=".45" />
      <path
        d="M29 23v6a5 5 0 0 0 5 5h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="38" cy="34" r="3.2" />
      <rect x="35" y="38" width="22" height="6" rx="1.5" />
      <rect x="35" y="46" width="22" height="9" rx="1.5" opacity=".45" />
    </svg>
  );
}
