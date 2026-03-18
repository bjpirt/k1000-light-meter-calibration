/* ── SVG circuit diagram of the Pentax K1000 galvanometer circuit ── */

const WIRE = { stroke: '#334155', strokeWidth: 1.5 } as const
const COMP = { fill: 'white', stroke: '#475569', strokeWidth: 1.5, rx: 3 } as const

function Wire({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} {...WIRE} />
}

function JunctionDot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3.5} fill="#334155" />
}

function Resistor({ cx, cy, label, sublabel }: { cx: number; cy: number; label: string; sublabel?: string }) {
  return (
    <g>
      <rect x={cx - 34} y={cy - 13} width={68} height={sublabel ? 28 : 24} {...COMP} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={500} fill="#0f172a">{label}</text>
      {sublabel && <text x={cx} y={cy + 17} textAnchor="middle" fontSize={9} fill="#64748b">{sublabel}</text>}
    </g>
  )
}

function PhotoResistor({ cx, cy, label }: { cx: number; cy: number; label: string }) {
  return (
    <g>
      <rect x={cx - 30} y={cy - 13} width={60} height={26} fill="#fef9c3" stroke="#475569" strokeWidth={1.5} rx={3} />
      <line x1={cx + 17} y1={cy - 19} x2={cx + 28} y2={cy - 8} stroke="#ca8a04" strokeWidth={1} />
      <polygon points={`${cx+28},${cy-8} ${cx+24},${cy-11} ${cx+23},${cy-5}`} fill="#ca8a04" />
      <line x1={cx + 21} y1={cy - 23} x2={cx + 32} y2={cy - 12} stroke="#ca8a04" strokeWidth={1} />
      <polygon points={`${cx+32},${cy-12} ${cx+28},${cy-15} ${cx+27},${cy-9}`} fill="#ca8a04" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={500} fill="#78350f">{label}</text>
    </g>
  )
}

/**
 * Single galvanometer box containing both coils.
 * Coil terminals are on the LEFT edge; input terminal is on the bottom.
 * The needle is horizontal (pointing right = balanced).
 */
function GalvanometerBox({
  x, y, width, height, coil1Y, coil2Y,
}: {
  x: number; y: number; width: number; height: number; coil1Y: number; coil2Y: number
}) {
  const cx = x + width / 2
  const meterCY = y + height / 2
  const r = 34   // meter circle radius
  const rTick1 = 30, rTick2 = 37

  // Tick angles in SVG coords (0=east/right, positive=clockwise/down)
  // Right semicircle from south (90°) through east (0°) to north (-90°)
  const tickAngles = [90, 45, 0, -45, -90].map(d => d * Math.PI / 180)

  return (
    <g>
      {/* Outer box */}
      <rect x={x} y={y} width={width} height={height} fill="#f0f9ff" stroke="#2563eb" strokeWidth={2} rx={8} />

      {/* Meter face circle */}
      <circle cx={cx} cy={meterCY} r={r} fill="white" stroke="#94a3b8" strokeWidth={1} />

      {/* Scale arc — right semicircle from south through east to north */}
      <path
        d={`M ${cx} ${meterCY + r} A ${r} ${r} 0 0 0 ${cx} ${meterCY - r}`}
        fill="none" stroke="#94a3b8" strokeWidth={1}
      />

      {/* Scale ticks */}
      {tickAngles.map((rad, i) => (
        <line
          key={i}
          x1={cx + rTick1 * Math.cos(rad)} y1={meterCY + rTick1 * Math.sin(rad)}
          x2={cx + rTick2 * Math.cos(rad)} y2={meterCY + rTick2 * Math.sin(rad)}
          stroke="#94a3b8" strokeWidth={i === 2 ? 1.5 : 1}
        />
      ))}

      {/* "0" label at east (center/balance mark) */}
      <text x={cx + r + 8} y={meterCY + 4} fontSize={9} fill="#64748b" fontWeight={600}>0</text>

      {/* Horizontal needle (pointing east = balanced) with small tail on left */}
      <line
        x1={cx - 10} y1={meterCY}
        x2={cx + r - 4} y2={meterCY}
        stroke="#ef4444" strokeWidth={2} strokeLinecap="round"
      />
      {/* Pivot dot */}
      <circle cx={cx} cy={meterCY} r={3} fill="#334155" />

      {/* Coil rows — dashed lines spanning full width of box */}
      <line x1={x} y1={coil1Y} x2={x + width} y2={coil1Y}
        stroke="#2563eb" strokeWidth={1} strokeDasharray="4,3" />
      <text x={x + 14} y={coil1Y - 4} fontSize={9} fill="#2563eb" fontWeight={600}>Coil 1</text>

      <line x1={x} y1={coil2Y} x2={x + width} y2={coil2Y}
        stroke="#2563eb" strokeWidth={1} strokeDasharray="4,3" />
      <text x={x + 14} y={coil2Y - 4} fontSize={9} fill="#2563eb" fontWeight={600}>Coil 2</text>

      {/* Terminal dots on LEFT edge (circuit inputs) */}
      <circle cx={x} cy={coil1Y} r={4} fill="white" stroke="#2563eb" strokeWidth={1.5} />
      <circle cx={x} cy={coil2Y} r={4} fill="white" stroke="#2563eb" strokeWidth={1.5} />

      {/* Terminal dots on RIGHT edge (connect to battery −) */}
      <circle cx={x + width} cy={coil1Y} r={4} fill="white" stroke="#334155" strokeWidth={1.5} />
      <circle cx={x + width} cy={coil2Y} r={4} fill="white" stroke="#334155" strokeWidth={1.5} />
    </g>
  )
}

/** Horizontal battery symbol from x1 to x2 at y. + is on the LEFT. */
function BatteryH({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const mid = (x1 + x2) / 2
  return (
    <g>
      <Wire x1={x1} y1={y} x2={mid - 26} y2={y} />
      <Wire x1={mid + 26} y1={y} x2={x2} y2={y} />
      {/* + plate (long) */}
      <line x1={mid - 26} y1={y - 13} x2={mid - 26} y2={y + 13} stroke="#334155" strokeWidth={3} />
      {/* − plate (short) */}
      <line x1={mid + 26} y1={y - 8} x2={mid + 26} y2={y + 8} stroke="#334155" strokeWidth={3} />
      <text x={mid - 38} y={y + 5} fontSize={13} fontWeight={700} fill="#166534">+</text>
      <text x={mid + 32} y={y + 5} fontSize={13} fontWeight={700} fill="#991b1b">−</text>
      <text x={mid} y={y - 18} textAnchor="middle" fontSize={10} fill="#64748b">Battery</text>
    </g>
  )
}

export function CircuitDiagram() {
  const W = 820
  const H = 455

  // Galvanometer box — RIGHT side
  const gx = 648, gy = 82, gw = 118, gh = 270
  const gLeft = gx              // left edge where coil terminals are

  // Coil terminal y positions (absolute in SVG)
  const coil1Y = 162
  const coil2Y = 297

  // Left rail x (circuit positive side)
  const leftX = 90

  // Top branch (Coil 1, y = coil1Y)
  const topSplitX = 185
  const topRejoinX = 490
  const topUpperY = coil1Y - 48   // ~114
  const topLowerY = coil1Y + 48   // ~210
  const trimR2X = 560             // Trim R₂ is after the parallel CdS section

  // Bottom branch (Coil 2, y = coil2Y)
  const botSplitX = 200
  const botRejoinX = 580
  const botUpperY = coil2Y - 44   // ~253
  const botLowerY = coil2Y + 44   // ~341

  // Battery at bottom
  const batY = 418

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: `${W}px`, display: 'block' }}
      aria-label="K1000 galvanometer circuit diagram"
    >
      <rect width={W} height={H} fill="#f8fafc" rx="8" />

      {/* ── Title ── */}
      <text x={W / 2} y={22} textAnchor="middle" fontSize={13} fontWeight={600} fill="#0f172a">
        K1000 Galvanometer Circuit
      </text>

      {/* ── Galvanometer (single box, two coils, on the RIGHT) ── */}
      <GalvanometerBox
        x={gx} y={gy} width={gw} height={gh}
        coil1Y={coil1Y} coil2Y={coil2Y}
      />

      {/* ─────── TOP BRANCH — Coil 1 / Light sensor circuit ─────── */}

      <rect x={(leftX + gLeft) / 2 - 62} y={coil1Y - 18} width={124} height={14} fill="#f8fafc" />
      <text x={(leftX + gLeft) / 2} y={coil1Y - 7} textAnchor="middle" fontSize={10} fill="#475569">
        Light sensor circuit
      </text>

      {/* Left rail → split */}
      <Wire x1={leftX} y1={coil1Y} x2={topSplitX} y2={coil1Y} />
      <JunctionDot x={topSplitX} y={coil1Y} />

      {/* Upper sub: CdS₁ → Trim R₁ */}
      <Wire x1={topSplitX} y1={coil1Y} x2={topSplitX} y2={topUpperY} />
      <Wire x1={topSplitX} y1={topUpperY} x2={topRejoinX} y2={topUpperY} />
      <PhotoResistor cx={292} cy={topUpperY} label="CdS₁" />
      <Resistor cx={400} cy={topUpperY} label="Trim R₁" sublabel="(CdS₁ trim)" />
      <Wire x1={topRejoinX} y1={topUpperY} x2={topRejoinX} y2={coil1Y} />

      {/* Lower sub: CdS₂ */}
      <Wire x1={topSplitX} y1={coil1Y} x2={topSplitX} y2={topLowerY} />
      <Wire x1={topSplitX} y1={topLowerY} x2={topRejoinX} y2={topLowerY} />
      <PhotoResistor cx={337} cy={topLowerY} label="CdS₂" />
      <Wire x1={topRejoinX} y1={topLowerY} x2={topRejoinX} y2={coil1Y} />

      {/* Rejoin → Trim R₂ → galvo */}
      <JunctionDot x={topRejoinX} y={coil1Y} />
      <Wire x1={topRejoinX} y1={coil1Y} x2={trimR2X - 34} y2={coil1Y} />
      <Resistor cx={trimR2X} cy={coil1Y} label="Trim R₂" sublabel="(series)" />
      <Wire x1={trimR2X + 34} y1={coil1Y} x2={gLeft} y2={coil1Y} />

      {/* ─────── BOTTOM BRANCH — Coil 2 / Exposure circuit ─────── */}

      <rect x={(leftX + gLeft) / 2 - 72} y={coil2Y - 18} width={144} height={14} fill="#f8fafc" />
      <text x={(leftX + gLeft) / 2} y={coil2Y - 7} textAnchor="middle" fontSize={10} fill="#475569">
        Exposure control circuit
      </text>

      {/* Left rail → split */}
      <Wire x1={leftX} y1={coil2Y} x2={botSplitX} y2={coil2Y} />
      <JunctionDot x={botSplitX} y={coil2Y} />

      {/* Upper sub: R_aperture */}
      <Wire x1={botSplitX} y1={coil2Y} x2={botSplitX} y2={botUpperY} />
      <Wire x1={botSplitX} y1={botUpperY} x2={botRejoinX} y2={botUpperY} />
      <Resistor cx={390} cy={botUpperY} label="R aperture" sublabel="(f-stop)" />
      <Wire x1={botRejoinX} y1={botUpperY} x2={botRejoinX} y2={coil2Y} />

      {/* Lower sub: R_shutter/ASA */}
      <Wire x1={botSplitX} y1={coil2Y} x2={botSplitX} y2={botLowerY} />
      <Wire x1={botSplitX} y1={botLowerY} x2={botRejoinX} y2={botLowerY} />
      <Resistor cx={390} cy={botLowerY} label="R shutter" sublabel="(speed/ASA)" />
      <Wire x1={botRejoinX} y1={botLowerY} x2={botRejoinX} y2={coil2Y} />

      {/* Rejoin → galvo */}
      <JunctionDot x={botRejoinX} y={coil2Y} />
      <Wire x1={botRejoinX} y1={coil2Y} x2={gLeft} y2={coil2Y} />

      {/* ── Left vertical rail (battery + side) ── */}
      <Wire x1={leftX} y1={coil1Y} x2={leftX} y2={coil2Y} />
      <JunctionDot x={leftX} y={coil1Y} />
      <JunctionDot x={leftX} y={coil2Y} />
      {/* Rail down to battery + */}
      <Wire x1={leftX} y1={coil2Y} x2={leftX} y2={batY} />

      {/* ── Right-edge negative rail: both coil exits → battery − ── */}
      {(() => { const gRight = gx + gw; const negX = gRight + 14; return (
        <>
          {/* Short horizontal stubs from each terminal to the vertical wire */}
          <Wire x1={gRight} y1={coil1Y} x2={negX} y2={coil1Y} />
          <Wire x1={gRight} y1={coil2Y} x2={negX} y2={coil2Y} />
          {/* Vertical wire joining both stubs and continuing to battery */}
          <Wire x1={negX} y1={coil1Y} x2={negX} y2={batY} />
          <JunctionDot x={negX} y={coil1Y} />
          <JunctionDot x={negX} y={coil2Y} />
        </>
      )})()}

      {/* ── Battery at bottom — + on left (circuit), − on right (galvo) ── */}
      <BatteryH x1={leftX} x2={gx + gw + 14} y={batY} />

      {/* ── Balance annotation ── */}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#64748b">
        Needle centres when I(Coil 1) = I(Coil 2) — i.e. R(light circuit) = R(aperture) ∥ R(shutter)
      </text>
    </svg>
  )
}
