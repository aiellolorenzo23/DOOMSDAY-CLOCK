import { ElectronAPI } from '@electron-toolkit/preload'

type ClockData = {
  secondsToMidnight: number
  lastUpdated: string
  sourceName: string
  sourceUrl: string
  fetchState: 'live' | 'cached' | 'fallback'
}

type TimelineEntry = {
  year: number
  title: string
  body: string
  secondsToMidnight: number
}

type TimelineData = {
  entries: TimelineEntry[]
  sourceName: string
  sourceUrl: string
  fetchState: 'live' | 'cached' | 'fallback'
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getDoomsdayClockData: () => Promise<ClockData>
      getDoomsdayTimeline: () => Promise<TimelineData>
    }
  }
}
