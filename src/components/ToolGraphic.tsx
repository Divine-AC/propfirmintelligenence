// Small, decorative diagrams. They describe each tool, not market performance.
export function ToolGraphic({ kind }: { kind: "match" | "history" | "compare" }) {
  return (
    <svg className="tool-graphic" viewBox="0 0 138 47" fill="none" aria-hidden="true">
      {kind === "match" && (
        <>
          <g stroke="currentColor" opacity=".2" strokeDasharray="2 3">
            <path d="M1 11h136M1 36h136M29 2v43M80 2v43M122 2v43" />
          </g>
          <path
            d="m2 37 17-4 10 4 14-15 13 4 14-11 10 4 17-13 12 5 13-7 14 2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {[
            [29, 37],
            [80, 19],
            [122, 4],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="2.5" fill="white" stroke="currentColor" strokeWidth="1.6" />
          ))}
        </>
      )}
      {kind === "history" && (
        <>
          <path d="M1 39h136M1 17h136" stroke="currentColor" opacity=".2" strokeDasharray="2 3" />
          {[
            [8, 28, 36],
            [20, 23, 32],
            [32, 20, 27],
            [44, 24, 31],
            [56, 16, 25],
            [68, 13, 21],
            [80, 17, 24],
            [92, 12, 19],
            [104, 8, 14],
            [116, 11, 18],
            [128, 6, 13],
          ].map(([x, top, bottom], i) => (
            <g key={x} stroke="currentColor" opacity={i % 3 === 0 ? 0.52 : 0.95}>
              <path d={`M${x} ${top - 5}v${bottom - top + 10}`} />
              <rect
                x={x - 2.7}
                y={top}
                width="5.4"
                height={bottom - top}
                rx=".5"
                fill={i % 3 === 0 ? "white" : "currentColor"}
              />
            </g>
          ))}
        </>
      )}
      {kind === "compare" && (
        <>
          <g stroke="currentColor" opacity=".2" strokeDasharray="2 3">
            <path d="M14 2v43M44 2v43M74 2v43M104 2v43M134 2v43" />
          </g>
          {[
            [6, 91],
            [18, 117],
            [30, 72],
          ].map(([y, w], i) => (
            <g key={y}>
              <rect
                x="14"
                y={y}
                width={w}
                height="6.5"
                rx="1.5"
                fill="currentColor"
                opacity={0.35 + i * 0.2}
              />
              <path d={`M${w + 17} ${y + 3}h8`} stroke="currentColor" opacity=".5" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
