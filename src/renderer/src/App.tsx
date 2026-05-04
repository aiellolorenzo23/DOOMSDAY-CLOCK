import "./assets/main.css";

const CLOCK_DATA = {
  secondsToMidnight: 85,
  lastUpdated: "2026-01-27",
  sourceName: "Bulletin of the Atomic Scientists",
  sourceUrl: "https://thebulletin.org/doomsday-clock/"
};

function getClockTimeFromSecondsToMidnight(secondsToMidnight: number): string {
  const totalSecondsInDay = 24 * 60 * 60;
  const clockSeconds = totalSecondsInDay - secondsToMidnight;

  const hours = Math.floor(clockSeconds / 3600) % 24;
  const minutes = Math.floor((clockSeconds % 3600) / 60);
  const seconds = clockSeconds % 60;

  return [hours, minutes, seconds]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}

function getHandAngles(secondsToMidnight: number) {
  const totalSecondsInDay = 24 * 60 * 60;
  const clockSeconds = totalSecondsInDay - secondsToMidnight;

  const hours = Math.floor(clockSeconds / 3600) % 12;
  const minutes = Math.floor((clockSeconds % 3600) / 60);
  const seconds = clockSeconds % 60;

  return {
    hourAngle: hours * 30 + minutes * 0.5,
    minuteAngle: minutes * 6 + seconds * 0.1,
    secondAngle: seconds * 6
  };
}

export default function App() {
  const digitalTime = getClockTimeFromSecondsToMidnight(
    CLOCK_DATA.secondsToMidnight
  );

  const { hourAngle, minuteAngle, secondAngle } = getHandAngles(
    CLOCK_DATA.secondsToMidnight
  );

  return (
    <main className="app">
      <div className="red-glow" />

      <section className="clock-card">
        <div className="scanlines" />

        <header className="watchmen-title" aria-label="Doomsday Clock">
          <div className="watchmen-title-main">DOOMSDAY</div>
          <div className="watchmen-title-sub">CLOCK</div>
        </header>

        <svg width="360" height="360" viewBox="0 0 360 360" className="analog-clock">
          <circle cx="180" cy="180" r="160" fill="none" stroke="black" strokeWidth="10" />

          <circle
            cx="180"
            cy="180"
            r="148"
            fill="none"
            stroke="rgba(0, 0, 0, 0.25)"
            strokeWidth="2"
            strokeDasharray="4 8"
          />

          {[...Array(12)].map((_, index) => {
            const angle = index * 30
            const rad = ((angle - 90) * Math.PI) / 180
            const x = 180 + Math.cos(rad) * 128
            const y = 180 + Math.sin(rad) * 128
            const label = index === 0 ? 12 : index

            return (
              <text
                key={index}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="28"
                fontWeight="900"
                className="clock-number"
              >
                {label}
              </text>
            )
          })}

          <g transform={`rotate(${hourAngle} 180 180)`}>
            <g className="hand-wobble hour-wobble">
              <line
                x1="180"
                y1="188"
                x2="180"
                y2="95"
                stroke="black"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </g>
          </g>

          <g transform={`rotate(${minuteAngle} 180 180)`}>
            <g className="hand-wobble minute-wobble">
              <line
                x1="180"
                y1="190"
                x2="180"
                y2="55"
                stroke="black"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>
          </g>

          <g transform={`rotate(${secondAngle} 180 180)`}>
            <g className="hand-wobble second-wobble">
              <line
                x1="180"
                y1="200"
                x2="180"
                y2="42"
                stroke="#9e0000"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          </g>

          <circle cx="180" cy="180" r="10" fill="black" />
          <circle cx="180" cy="180" r="4" fill="#9e0000" />
        </svg>

        <div className="digital-time">{digitalTime}</div>

        <div className="countdown-label">{CLOCK_DATA.secondsToMidnight} seconds to midnight</div>

        <a className="source" href={CLOCK_DATA.sourceUrl} target="_blank" rel="noreferrer">
          Last update: {CLOCK_DATA.lastUpdated} · {CLOCK_DATA.sourceName}
        </a>
      </section>
    </main>
  )
}
