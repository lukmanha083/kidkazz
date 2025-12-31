interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, showTagline = false, className = '' }: LogoProps) {
  const sizes = {
    sm: { width: 24, height: 24, text: 'text-xl', tagline: 'text-[8px]' },
    md: { width: 32, height: 32, text: 'text-2xl', tagline: 'text-[9px]' },
    lg: { width: 48, height: 48, text: 'text-4xl', tagline: 'text-[10px]' },
    xl: { width: 80, height: 80, text: 'text-6xl', tagline: 'text-xs' },
  };

  const { width, height, text: textSize, tagline: taglineSize } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* K Logo SVG - No border, clean edges */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        style={{ display: 'block' }}
      >
        {/* Black background - no border */}
        <rect width="80" height="80" fill="#000000" rx="0"/>

        {/* Left vertical bar */}
        <rect x="8" y="8" width="11" height="64" fill="white"/>

        {/* Top arm */}
        <rect x="21" y="8" width="51" height="11" fill="white"/>

        {/* Middle connecting piece */}
        <rect x="21" y="31" width="20" height="11" fill="white"/>

        {/* Bottom arm lower part */}
        <rect x="43" y="61" width="29" height="11" fill="white"/>

        {/* Bottom arm upper part */}
        <rect x="43" y="43" width="20" height="16" fill="white"/>
      </svg>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold tracking-tight ${textSize}`}>kidkazz</span>
          {showTagline && (
            <span className={`text-muted-foreground font-medium uppercase tracking-wider ${taglineSize}`}>
              Best Price Excellent Service
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Simple K icon only version
export function LogoIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      {/* Black background - no border */}
      <rect width="80" height="80" fill="#000000" rx="0"/>

      {/* Left vertical bar */}
      <rect x="8" y="8" width="11" height="64" fill="white"/>

      {/* Top arm */}
      <rect x="21" y="8" width="51" height="11" fill="white"/>

      {/* Middle connecting piece */}
      <rect x="21" y="31" width="20" height="11" fill="white"/>

      {/* Bottom arm lower part */}
      <rect x="43" y="61" width="29" height="11" fill="white"/>

      {/* Bottom arm upper part */}
      <rect x="43" y="43" width="20" height="16" fill="white"/>
    </svg>
  );
}
