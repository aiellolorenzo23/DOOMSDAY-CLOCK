import { ElectronAPI } from '@electron-toolkit/preload'

type ClockData = {
  secondsToMidnight: number
  lastUpdated: string
  sourceName: string
  sourceUrl: string
  fetchState: 'live' | 'cached' | 'fallback'
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getDoomsdayClockData: () => Promise<ClockData>
    }
  }
}
