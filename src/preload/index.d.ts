import { ElectronAPI } from '@electron-toolkit/preload'

type ClockData = {
  secondsToMidnight: number
  lastUpdated: string
  sourceName: string
  sourceUrl: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getDoomsdayClockData: () => Promise<ClockData>
    }
  }
}
