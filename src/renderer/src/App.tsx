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

type TimelineEntry = {
  year: number;
  title: string;
  body: string;
  secondsToMidnight: number;
};

type TimelineData = {
  entries: TimelineEntry[];
  sourceName: string;
  sourceUrl: string;
  fetchState: ClockData["fetchState"];
};

const FALLBACK_TIMELINE_DATA: TimelineData = {
  entries: [],
  sourceName: "Bulletin of the Atomic Scientists",
  sourceUrl: "https://thebulletin.org/doomsday-clock/timeline/",
  fetchState: "fallback"
};

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

function getCountdownLabel(secondsToMidnight: number): string {
  if (secondsToMidnight >= 60 && secondsToMidnight % 60 === 0) {
    const minutes = secondsToMidnight / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"} to midnight`;
  }

  if (secondsToMidnight > 60) {
    const minutes = Math.floor(secondsToMidnight / 60);
    const seconds = secondsToMidnight % 60;
    return `${minutes}m ${seconds}s to midnight`;
  }

  return `${secondsToMidnight} seconds to midnight`;
}

export default function App() {
  const [clockData, setClockData] = useState<ClockData>(FALLBACK_CLOCK_DATA);
  const [timelineData, setTimelineData] = useState<TimelineData>(FALLBACK_TIMELINE_DATA);
  const [view, setView] = useState<"clock" | "timeline">("clock");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [isSwitchingView, setIsSwitchingView] = useState(false);
  const [chaosState, setChaosState] = useState<ChaosState | null>(null);
  const chaosIntervalRef = useRef<number | null>(null);
  const settlingTimeoutRef = useRef<number | null>(null);
  const viewTimeoutRef = useRef<number | null>(null);
  const appRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void refreshClockData();

    return () => {
      stopChaos();
      stopSettling();
      stopViewTransition();
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

  function stopViewTransition() {
    if (viewTimeoutRef.current !== null) {
      window.clearTimeout(viewTimeoutRef.current);
      viewTimeoutRef.current = null;
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

  async function loadTimelineData() {
    if (isTimelineLoading) {
      return;
    }

    setIsTimelineLoading(true);

    try {
      const data = await window.api.getDoomsdayTimeline();
      setTimelineData(data);
    } catch {
      setTimelineData(FALLBACK_TIMELINE_DATA);
    } finally {
      setIsTimelineLoading(false);
    }
  }

  function toggleTimelineView() {
    const nextView = view === "clock" ? "timeline" : "clock";

    if (nextView === "timeline" && timelineData.entries.length === 0) {
      void loadTimelineData();
    }

    stopViewTransition();
    setIsSwitchingView(true);

    viewTimeoutRef.current = window.setTimeout(() => {
      setView(nextView);

      appRef.current?.scrollTo({ top: 0, behavior: "auto" });

      viewTimeoutRef.current = window.setTimeout(() => {
        setIsSwitchingView(false);
        viewTimeoutRef.current = null;
      }, 560);
    }, 220);
  }

  const displayedDigitalTime =
    chaosState?.digitalTime ??
    getClockTimeFromSecondsToMidnight(clockData.secondsToMidnight);

  const displayedCountdown = chaosState?.countdown ?? clockData.secondsToMidnight;
  const { hourAngle, minuteAngle, secondAngle } =
    chaosState?.angles ?? getHandAngles(clockData.secondsToMidnight);

  return (
    <main ref={appRef} className={`app ${view === "timeline" ? "is-timeline" : ""}`}>
      <div className="red-glow" />

      <div className="action-buttons">
        {view === "clock" && (
          <button
            type="button"
            className={`action-button refresh-button ${isRefreshing ? "is-refreshing" : ""}`}
            onClick={() => void refreshClockData(true)}
            aria-label={isRefreshing ? "ticks..." : "refresh"}
            disabled={isRefreshing}
          >
            <img src={refreshIcon} alt="" className="refresh-button-icon" />
            <span className="action-button-tooltip">
              {isRefreshing ? "ticks..." : "refresh"}
            </span>
          </button>
        )}

        <button
          type="button"
          className={`action-button timeline-button ${view === "timeline" ? "is-clock-button" : ""} ${isSwitchingView ? "is-switching" : ""}`}
          onClick={toggleTimelineView}
          aria-label={view === "clock" ? "timeline" : "clock"}
          disabled={isSwitchingView}
        >
          {view === "clock" ? (
            <span className="timeline-button-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <span className="clock-button-icon" aria-hidden="true">
              <span className="clock-button-hour" />
              <span className="clock-button-minute" />
            </span>
          )}
          <span className="action-button-tooltip">
            {view === "clock" ? "timeline" : "clock"}
          </span>
        </button>
      </div>

      {view === "clock" ? (
        <section className={`clock-card ${isSwitchingView ? "is-switching-view" : ""}`}>
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
      ) : (
        <section className={`timeline-view ${isSwitchingView ? "is-switching-view" : ""}`}>
          <header className="watchmen-title timeline-title" aria-label="Doomsday Clock Timeline">
            <div className="watchmen-title-main">TIMELINE</div>
            <div className="watchmen-title-sub">CLOCK SHIFTS</div>
          </header>

          <div className="timeline-panel">
            {isTimelineLoading && timelineData.entries.length === 0 ? (
              <div className="timeline-loading">loading timeline...</div>
            ) : (
              timelineData.entries.map((entry) => (
                <article className="timeline-entry" key={entry.year}>
                  <div className="timeline-entry-header">
                    <span className="timeline-year">{entry.year}</span>
                    <span className="timeline-digital-time">
                      {getClockTimeFromSecondsToMidnight(entry.secondsToMidnight)}
                    </span>
                  </div>
                  <div className="timeline-countdown">
                    {getCountdownLabel(entry.secondsToMidnight)}
                  </div>
                  <h2>{entry.title}</h2>
                  <p>{entry.body}</p>
                </article>
              ))
            )}
          </div>

          <div className="source-row timeline-source-row">
            <a className="source" href={timelineData.sourceUrl} target="_blank" rel="noreferrer">
              Timeline: {timelineData.sourceName}
            </a>
            <span className={`source-status is-${timelineData.fetchState}`}>
              {getFetchStateLabel(timelineData.fetchState)}
            </span>
          </div>
        </section>
      )}
    </main>
  );
}
