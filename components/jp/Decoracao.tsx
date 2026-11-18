/* Ilustrações simples do tema do JP: pomba, cruz, raios dourados e ramos de folhas. */

export function Pomba({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 70" className={className} aria-hidden>
      <g fill="#ffffff" stroke="#9db4d3" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M60 38 C48 22 30 12 6 10 C18 18 24 24 28 30 C20 30 14 32 10 36 C24 38 40 40 52 44 Z" />
        <path d="M60 38 C72 22 90 12 114 10 C102 18 96 24 92 30 C100 30 106 32 110 36 C96 38 80 40 68 44 Z" />
        <path d="M52 44 C54 36 58 32 60 32 C62 32 66 36 68 44 C66 52 64 58 60 66 C56 58 54 52 52 44 Z" />
        <circle cx="60" cy="30" r="5" />
      </g>
      <circle cx="61.5" cy="29" r="0.9" fill="#4a6b99" />
      <path d="M64.5 30 L67 30.8 L64.5 31.6 Z" fill="#d8b25c" />
    </svg>
  );
}

export function Raios({ className }: { className?: string }) {
  const raios = Array.from({ length: 17 }, (_, i) => -80 + i * 10);
  return (
    <svg viewBox="-100 -100 200 100" className={className} aria-hidden>
      {raios.map((a) => {
        const r = (a * Math.PI) / 180;
        const l = a % 20 === 0 ? 92 : 70;
        return <line key={a} x1={Math.sin(r) * 18} y1={-Math.cos(r) * 18} x2={Math.sin(r) * l} y2={-Math.cos(r) * l} stroke="#e3c47c" strokeWidth="1" strokeLinecap="round" opacity="0.7" />;
      })}
    </svg>
  );
}

export function Cruz({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 28" className={className} aria-hidden>
      <path d="M8.5 0 h3 v8 h7 v3 h-7 v17 h-3 v-17 h-7 v-3 h7 Z" fill="#d8b25c" stroke="#b8913c" strokeWidth="0.6" />
    </svg>
  );
}

export function Brilho({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z" fill="#d8b25c" />
    </svg>
  );
}

/** Separador com linha fina e brilho dourado no meio. */
export function Separador({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#b9cbe3]" />
      <Brilho className="h-3 w-3" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#b9cbe3]" />
    </div>
  );
}

/** Ramo de folhas em aquarela azul (canto). Use rotate/flip via className. */
export function Ramo({ className }: { className?: string }) {
  const folhas: [number, number, number][] = [
    [30, 170, -40], [44, 150, 35], [40, 132, -45], [56, 116, 30], [50, 98, -50], [68, 84, 25],
    [62, 66, -55], [80, 54, 20], [76, 36, -60], [94, 26, 10], [22, 190, -30], [60, 140, 60], [74, 102, 55], [88, 70, 50],
  ];
  return (
    <svg viewBox="0 0 140 220" className={className} aria-hidden>
      <path d="M10 215 C30 170 50 120 100 10" fill="none" stroke="#8aa6cc" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M48 128 C64 122 76 116 90 100" fill="none" stroke="#8aa6cc" strokeWidth="1.1" strokeLinecap="round" />
      {folhas.map(([x, y, rot], i) => (
        <ellipse key={i} cx={x} cy={y} rx="11" ry="4.6" transform={`rotate(${rot} ${x} ${y})`} fill={i % 3 === 0 ? '#a9c0de' : i % 3 === 1 ? '#c4d5ea' : '#8fadd4'} opacity="0.85" />
      ))}
    </svg>
  );
}

/** Moldura de fundo creme com ramos nos cantos (usada na tela do JP e no link). */
export function MolduraJp({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#faf7f0] ${className ?? ''}`}>
      <Ramo className="pointer-events-none absolute -left-6 -top-4 h-44 w-28 opacity-70 sm:h-64 sm:w-40" />
      <Ramo className="pointer-events-none absolute -right-6 -top-4 h-44 w-28 -scale-x-100 opacity-70 sm:h-64 sm:w-40" />
      <Ramo className="pointer-events-none absolute -bottom-6 -left-6 h-44 w-28 -scale-y-100 opacity-60 sm:h-64 sm:w-40" />
      <Ramo className="pointer-events-none absolute -bottom-6 -right-6 h-44 w-28 -scale-100 opacity-60 sm:h-64 sm:w-40" />
      <div className="relative">{children}</div>
    </div>
  );
}
