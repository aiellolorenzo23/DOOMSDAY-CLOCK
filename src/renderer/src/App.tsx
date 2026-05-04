import { useEffect, useRef, useState } from "react";
import refreshIcon from "./assets/icon.svg";
import "./assets/main.css";

const FALLBACK_CLOCK_DATA = {
  secondsToMidnight: 85,
  lastUpdated: "2026-01-27",
  sourceName: "Bulletin of the Atomic Scientists",
  sourceUrl: "https://thebulletin.org/doomsday-clock/current-time/",
  fetchState: "fallback"
};

type ClockData = typeof FALLBACK_CLOCK_DATA;

type ClockAngles = {
  hourAngle: number;
  minuteAngle: number;
  secondAngle: number;
};

type ChaosState = {
  digitalTime: string;
  countdown: number;
  angles: ClockAngles;
};

function getClockTimeFromSecondsToMidnight(secondsToMidnight: number): string {
  const totalSecondsInDay = 24 * 60 * 60;
  const clockSeconds = totalSecondsInDay - secondsToMidnight;

  const hours = Math.floor(clockSeconds / 3600) % 24;
  const minutes = Math.floor((clockSeconds % 3600) / 60);
  const seconds = clockSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function getHandAngles(secondsToMidnight: number): ClockAngles {
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

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function createChaosState(): ChaosState {
  const hours = String(getRandomInt(24)).padStart(2, "0");
  const minutes = String(getRandomInt(60)).padStart(2, "0");
  const seconds = String(getRandomInt(60)).padStart(2, "0");

  return {
    digitalTime: `${hours}:${minutes}:${seconds}`,
    countdown: getRandomInt(360),
    angles: {
      hourAngle: getRandomInt(360),
      minuteAngle: getRandomInt(360),
      secondAngle: getRandomInt(360)
    }
  };
}

function getFetchStateLabel(fetchState: ClockData["fetchState"]): string {
  if (fetchState === "live") {
    return "live";
  }

  if (fetchState === "cached") {
    return "cached";
  }

  return "fallback";
}

export default function App() {
  const [clockData, setClockData] = useState<ClockData>(FALLBACK_CLOCK_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [chaosState, setChaosState] = useState<ChaosState | null>(null);
  const chaosIntervalRef = useRef<number | null>(null);
  const settlingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    void refreshClockData();

    return () => {
      stopChaos();
      stopSettling();
    };
  }, []);

  function stopChaos() {
    if (chaosIntervalRef.current !== null) {
      window.clearInterval(chaosIntervalRef.current);
      chaosIntervalRef.current = null;
    }
  }

  function stopSettling() {
    if (settlingTimeoutRef.current !== null) {
      window.clearTimeout(settlingTimeoutRef.current);
      settlingTimeoutRef.current = null;
    }
  }

  function startChaos() {
    setChaosState(createChaosState());
    stopChaos();
    chaosIntervalRef.current = window.setInterval(() => {
      setChaosState(createChaosState());
    }, 70);
  }

  async function refreshClockData(withChaos = false) {
    if (isRefreshing) {
      return;
    }

    if (withChaos) {
      setIsRefreshing(true);
      startChaos();
    }

    try {
      const data = await window.api.getDoomsdayClockData();
      setClockData(data);
    } catch {
      setClockData(FALLBACK_CLOCK_DATA);
    } finally {
      if (withChaos) {
        stopChaos();
        setChaosState(null);
        setIsRefreshing(false);
        setIsSettling(true);
        stopSettling();
        settlingTimeoutRef.current = window.setTimeout(() => {
          setIsSettling(false);
          settlingTimeoutRef.current = null;
        }, 1100);
      }
    }
  }

  const displayedDigitalTime =
    chaosState?.digitalTime ??
    getClockTimeFromSecondsToMidnight(clockData.secondsToMidnight);

  const displayedCountdown = chaosState?.countdown ?? clockData.secondsToMidnight;
  const { hourAngle, minuteAngle, secondAngle } =
    chaosState?.angles ?? getHandAngles(clockData.secondsToMidnight);

  return (
    <main className="app">
      <div className="red-glow" />

      <button
        type="button"
        className={`refresh-button ${isRefreshing ? "is-refreshing" : ""}`}
        onClick={() => void refreshClockData(true)}
        aria-label={isRefreshing ? "ticks..." : "refresh"}
        disabled={isRefreshing}
      >
        <img src={refreshIcon} alt="" className="refresh-button-icon" />
        <span className="refresh-button-tooltip">
          {isRefreshing ? "ticks..." : "refresh"}
        </span>
      </button>

      <section className="clock-card">
        <div className="scanlines" />

        <header className="watchmen-title" aria-label="Doomsday Clock">
          <div className="watchmen-title-main">DOOMSDAY</div>
          <div className="watchmen-title-sub">CLOCK</div>
        </header>

        <svg
          width="360"
          height="360"
          viewBox="0 0 360 360"
          className={`analog-clock ${isRefreshing ? "is-refreshing" : ""}`}
        >
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
            const angle = index * 30;
            const rad = ((angle - 90) * Math.PI) / 180;
            const x = 180 + Math.cos(rad) * 128;
            const y = 180 + Math.sin(rad) * 128;
            const label = index === 0 ? 12 : index;

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
            );
          })}

          <g
            className={`hand-rotation hour-rotation ${isSettling ? "is-settling" : ""}`}
            style={{ transform: `rotate(${hourAngle}deg)` }}
          >
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

          <g
            className={`hand-rotation minute-rotation ${isSettling ? "is-settling" : ""}`}
            style={{ transform: `rotate(${minuteAngle}deg)` }}
          >
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

          <g
            className={`hand-rotation second-rotation ${isSettling ? "is-settling" : ""}`}
            style={{ transform: `rotate(${secondAngle}deg)` }}
          >
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

        <div className={`digital-time ${isRefreshing ? "is-refreshing" : ""}`}>
          {displayedDigitalTime}
        </div>

        <div className={`countdown-label ${isRefreshing ? "is-refreshing" : ""}`}>
          {displayedCountdown} seconds to midnight
        </div>

        <div className="source-row">
          <a className="source" href={clockData.sourceUrl} target="_blank" rel="noreferrer">
            Last update: {clockData.lastUpdated} · {clockData.sourceName}
          </a>
          <span className={`source-status is-${clockData.fetchState}`}>
            {getFetchStateLabel(clockData.fetchState)}
          </span>
        </div>
      </section>
    </main>
  );
}
