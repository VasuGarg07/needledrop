type IconProps = {
  size: number;
};

export function DoubleNoteIcon({ size }: IconProps) {
  return (
    <svg className="line-icon" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 17.4V6.2L21 3.5v11.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 6.2 21 3.5v3.2L9 9.4z" />
      <ellipse cx="6.4" cy="17.6" rx="3" ry="2.3" transform="rotate(-20 6.4 17.6)" />
      <ellipse cx="18.4" cy="15.3" rx="3" ry="2.3" transform="rotate(-20 18.4 15.3)" />
    </svg>
  );
}

export function StudioMicIcon({ size }: IconProps) {
  return (
    <svg
      className="line-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <rect x="8.5" y="2" width="7" height="11.5" rx="3.5" fill="currentColor" fillOpacity="0.3" />
      <path d="M10 5.5h4M10 8h4M10 10.5h4" strokeWidth="1.1" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21M8.5 21.5h7" />
    </svg>
  );
}
