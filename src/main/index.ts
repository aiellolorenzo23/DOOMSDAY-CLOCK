import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import appIcon from '../renderer/src/assets/icon.ico?asset'

const DOOMSDAY_CLOCK_URL = 'https://thebulletin.org/doomsday-clock/current-time/'

type ClockData = {
  secondsToMidnight: number
  lastUpdated: string
  sourceName: string
  sourceUrl: string
}

const FALLBACK_CLOCK_DATA: ClockData = {
  secondsToMidnight: 85,
  lastUpdated: '2026-01-27',
  sourceName: 'Bulletin of the Atomic Scientists',
  sourceUrl: DOOMSDAY_CLOCK_URL
}

function getClockCachePath(): string {
  return join(app.getPath('userData'), 'doomsday-clock-data.json')
}

async function readCachedClockData(): Promise<ClockData | null> {
  try {
    const cachedData = await readFile(getClockCachePath(), 'utf8')
    const parsedData = JSON.parse(cachedData) as Partial<ClockData>

    if (
      typeof parsedData.secondsToMidnight !== 'number' ||
      typeof parsedData.lastUpdated !== 'string' ||
      typeof parsedData.sourceName !== 'string' ||
      typeof parsedData.sourceUrl !== 'string'
    ) {
      return null
    }

    return {
      secondsToMidnight: parsedData.secondsToMidnight,
      lastUpdated: parsedData.lastUpdated,
      sourceName: parsedData.sourceName,
      sourceUrl: parsedData.sourceUrl
    }
  } catch {
    return null
  }
}

async function writeCachedClockData(clockData: ClockData): Promise<void> {
  try {
    const cachePath = getClockCachePath()
    await mkdir(join(cachePath, '..'), { recursive: true })
    await writeFile(cachePath, JSON.stringify(clockData), 'utf8')
  } catch (error) {
    console.error('Failed to write Doomsday Clock cache:', error)
  }
}

function extractClockDataFromHtml(html: string): ClockData | null {
  const sanitizedHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

  const secondsMatch = sanitizedHtml.match(/It is now\s+(\d+)\s+seconds to midnight/i)
  const dateMatch = sanitizedHtml.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/
  )

  if (!secondsMatch || !dateMatch) {
    return null
  }

  const secondsToMidnight = Number.parseInt(secondsMatch[1], 10)
  const parsedDate = new Date(`${dateMatch[0]} UTC`)

  if (Number.isNaN(secondsToMidnight) || Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return {
    secondsToMidnight,
    lastUpdated: parsedDate.toISOString().slice(0, 10),
    sourceName: 'Bulletin of the Atomic Scientists',
    sourceUrl: DOOMSDAY_CLOCK_URL
  }
}

async function fetchClockData(): Promise<ClockData> {
  try {
    const response = await fetch(DOOMSDAY_CLOCK_URL, {
      headers: {
        'user-agent': `${app.getName()}/${app.getVersion()}`
      }
    })

    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status}`)
    }

    const html = await response.text()
    const clockData = extractClockDataFromHtml(html)

    if (!clockData) {
      throw new Error('Unable to parse Doomsday Clock data')
    }

    await writeCachedClockData(clockData)

    return clockData
  } catch (error) {
    console.error('Failed to fetch Doomsday Clock data:', error)
    const cachedClockData = await readCachedClockData()
    return cachedClockData ?? FALLBACK_CLOCK_DATA
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.handle('doomsday-clock:get-data', () => fetchClockData())

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
