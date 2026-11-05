import { cn } from "@/utils";

interface PoutamaProps {
  width?: number;
  height?: number;
  // Distance between one stairway and the next.
  spacing?: number;
  step?: number;
  className?: string;
}

function stairway(startX: number, height: number, step: number): string {
  let path = `M${startX} ${height}`;
  for (let y = height; y > 0; y -= step) path += `v-${step}h${step}`;
  return path;
}

// The poutama, the stepped pattern from tukutuku panels. Used as a structural
// line, never as a fill across a whole surface.
export function Poutama({ width = 240, height = 48, spacing = 24, step = 6, className }: PoutamaProps) {
  const starts: number[] = [];
  for (let x = -height; x < width; x += spacing) starts.push(x);

  return (
    <svg aria-hidden width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" className={cn("pattern block text-line-strong", className)}>
      {starts.map((x) => (
        <path key={x} d={stairway(x, height, step)} stroke="currentColor" strokeWidth="1" />
      ))}
    </svg>
  );
}
