interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6 text-base', text: 'text-sm' },
    md: { icon: 'w-8 h-8 text-xl', text: 'text-lg' },
    lg: { icon: 'w-12 h-12 text-3xl', text: 'text-2xl' },
  };

  const { icon: iconSize, text: textSize } = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* K Logo Icon - Modified K using CSS */}
      <div
        className={`${iconSize} bg-black rounded-lg flex items-center justify-center font-bold text-white relative overflow-hidden`}
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <span className="relative z-10">k</span>
        {/* Decorative diagonal line through K */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-0.5 bg-white/20 rotate-45 transform scale-150" />
        </div>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold tracking-tight ${textSize}`}>kidkazz</span>
          <span className="text-[10px] text-muted-foreground leading-tight">admin</span>
        </div>
      )}
    </div>
  );
}

// Simple K icon only version
export function LogoIcon({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-8 h-8 bg-black rounded-lg flex items-center justify-center font-bold text-white text-xl relative overflow-hidden ${className}`}
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <span className="relative z-10">k</span>
      {/* Decorative diagonal line */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-0.5 bg-white/20 rotate-45 transform scale-150" />
      </div>
    </div>
  );
}
