import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import appIcon from '../renderer/src/assets/icon.ico?asset'

const DOOMSDAY_CLOCK_URL = 'https://thebulletin.org/doomsday-clock/current-time/'
const DOOMSDAY_TIMELINE_URL = 'https://thebulletin.org/doomsday-clock/timeline/'

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

const FALLBACK_CLOCK_DATA: ClockData = {
  secondsToMidnight: 85,
  lastUpdated: '2026-01-27',
  sourceName: 'Bulletin of the Atomic Scientists',
  sourceUrl: DOOMSDAY_CLOCK_URL,
  fetchState: 'fallback'
}

const TIMELINE_SECONDS_BY_YEAR: Record<number, number> = {
  1947: 420,
  1949: 180,
  1953: 120,
  1960: 420,
  1963: 720,
  1968: 420,
  1969: 600,
  1972: 720,
  1974: 540,
  1980: 420,
  1981: 240,
  1984: 180,
  1988: 360,
  1990: 600,
  1991: 1020,
  1995: 840,
  1998: 540,
  2002: 420,
  2007: 300,
  2010: 360,
  2012: 300,
  2015: 180,
  2017: 150,
  2018: 120,
  2020: 100,
  2023: 90,
  2025: 89,
  2026: 85
}

const FALLBACK_TIMELINE_DATA: TimelineData = {
  sourceName: 'Bulletin of the Atomic Scientists',
  sourceUrl: DOOMSDAY_TIMELINE_URL,
  fetchState: 'fallback',
  entries: [
    {
      year: 1947,
      title: 'The Clock Starts Running',
      body: 'The Bulletin of the Atomic Scientists changes its format from a newsletter to a magazine. Its first cover features a clock, both conceptualized and designed by artist Martyl Langsdorf. This purely aesthetic design later becomes known as the Doomsday Clock.',
      secondsToMidnight: 420
    },
    {
      year: 1949,
      title: 'The Arms Race is On',
      body: 'The Soviet Union explodes a nuclear device, the United States shares the news with the public, and the nuclear arms race begins.',
      secondsToMidnight: 180
    },
    {
      year: 1953,
      title: 'The Horror of Hydrogen',
      body: 'The United States and the Soviet Union test thermonuclear weapons, moving the Clock closer to midnight.',
      secondsToMidnight: 120
    },
    {
      year: 1960,
      title: 'Cooperation, not Confrontation',
      body: 'The United States and the Soviet Union seek ways to avoid direct confrontation, and scientific exchanges help build trust.',
      secondsToMidnight: 420
    },
    {
      year: 1963,
      title: 'A Rest from Tests',
      body: 'After the Cuban Missile Crisis, the United States and Soviet Union sign the Partial Test Ban Treaty, ending atmospheric nuclear testing.',
      secondsToMidnight: 720
    },
    {
      year: 1968,
      title: 'The Eastern World Explodes',
      body: 'Regional wars, nuclear proliferation, and Cold War tensions push the Clock closer to midnight.',
      secondsToMidnight: 420
    },
    {
      year: 1969,
      title: 'A Landmark Agreement',
      body: 'Most nations sign the Nuclear Non-Proliferation Treaty, creating a framework to limit the spread of nuclear weapons.',
      secondsToMidnight: 600
    },
    {
      year: 1972,
      title: 'Passing the SALT',
      body: 'The United States and Soviet Union sign arms limitation treaties, slowing parts of the nuclear race.',
      secondsToMidnight: 720
    },
    {
      year: 1974,
      title: 'India Joins the Club',
      body: 'India tests its first nuclear device while US and Soviet nuclear modernization continues.',
      secondsToMidnight: 540
    },
    {
      year: 1980,
      title: 'Accelerating drift toward world disaster',
      body: 'Stalled arms control, resource crises, and political instability move the hands of the Clock forward.',
      secondsToMidnight: 420
    },
    {
      year: 1981,
      title: 'Reheating the Cold War',
      body: 'The Soviet invasion of Afghanistan and a hardened US nuclear posture worsen Cold War tensions.',
      secondsToMidnight: 240
    },
    {
      year: 1984,
      title: 'Stalemate and Star Wars',
      body: 'US-Soviet communication deteriorates and space-based missile defense plans threaten a new arms race.',
      secondsToMidnight: 180
    },
    {
      year: 1988,
      title: 'Protests Yield Progress',
      body: 'The Intermediate-Range Nuclear Forces Treaty bans a whole category of nuclear weapons.',
      secondsToMidnight: 360
    },
    {
      year: 1990,
      title: 'Lowering the Iron Curtain',
      body: 'The fall of the Berlin Wall and changes across Eastern Europe reduce the risk of all-out nuclear war.',
      secondsToMidnight: 600
    },
    {
      year: 1991,
      title: 'A Fresh START',
      body: 'The Cold War ends and the United States and Russia begin deep cuts to their nuclear arsenals.',
      secondsToMidnight: 1020
    },
    {
      year: 1995,
      title: 'A Close Call',
      body: 'A mistaken Russian warning and concerns over poorly secured nuclear materials raise new dangers.',
      secondsToMidnight: 840
    },
    {
      year: 1998,
      title: 'South Asia’s Nasty Surprise',
      body: 'India and Pakistan conduct nuclear tests, intensifying regional and global nuclear risks.',
      secondsToMidnight: 540
    },
    {
      year: 2002,
      title: 'New Worries, New Weapons',
      body: 'After September 11, nuclear terrorism, unsecured materials, and new weapons policies increase concern.',
      secondsToMidnight: 420
    },
    {
      year: 2007,
      title: 'North Korea Rising',
      body: 'North Korea conducts a nuclear test while Iran concerns and US-Russian launch readiness persist.',
      secondsToMidnight: 300
    },
    {
      year: 2010,
      title: 'Hope after Copenhagen',
      body: 'Climate talks and renewed US-Russian arms negotiations create cautious optimism.',
      secondsToMidnight: 360
    },
    {
      year: 2012,
      title: 'Desperately Seeking Solutions',
      body: 'Nuclear danger, climate disruption, and political failure remain complex and interconnected threats.',
      secondsToMidnight: 300
    },
    {
      year: 2015,
      title: 'Failures of Leadership',
      body: 'Unchecked climate change, nuclear modernization, and weak political action push the Clock forward.',
      secondsToMidnight: 180
    },
    {
      year: 2017,
      title: 'A half step toward Doomsday',
      body: 'The Clock moves to two and a half minutes to midnight amid heightened global danger.',
      secondsToMidnight: 150
    },
    {
      year: 2018,
      title: '2 Minutes to Midnight',
      body: 'Nuclear risk, climate change, and information warfare make the international security situation more dangerous.',
      secondsToMidnight: 120
    },
    {
      year: 2020,
      title: '100 Seconds to Midnight',
      body: 'Nuclear war, climate change, and cyber-enabled information warfare compound global risk.',
      secondsToMidnight: 100
    },
    {
      year: 2023,
      title: '90 Seconds to Midnight',
      body: 'The war in Ukraine and erosion of international norms move the Clock closer than ever before.',
      secondsToMidnight: 90
    },
    {
      year: 2025,
      title: '89 Seconds to Midnight',
      body: 'Humanity edges closer to catastrophe as leaders fail to change course.',
      secondsToMidnight: 89
    },
    {
      year: 2026,
      title: '85 Seconds to Midnight',
      body: 'Major countries become increasingly aggressive and adversarial, undermining cooperation critical to reducing existential risks.',
      secondsToMidnight: 85
    }
  ]
}

function getClockCachePath(): string {
  return join(app.getPath('userData'), 'doomsday-clock-data.json')
}

function getTimelineCachePath(): string {
  return join(app.getPath('userData'), 'doomsday-clock-timeline.json')
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
      sourceUrl: parsedData.sourceUrl,
      fetchState: 'cached'
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

async function readCachedTimelineData(): Promise<TimelineData | null> {
  try {
    const cachedData = await readFile(getTimelineCachePath(), 'utf8')
    const parsedData = JSON.parse(cachedData) as Partial<TimelineData>

    if (!Array.isArray(parsedData.entries) || parsedData.entries.length === 0) {
      return null
    }

    const entries = parsedData.entries.filter(
      (entry): entry is TimelineEntry =>
        typeof entry?.year === 'number' &&
        typeof entry.title === 'string' &&
        typeof entry.body === 'string' &&
        typeof entry.secondsToMidnight === 'number'
    )

    if (entries.length === 0) {
      return null
    }

    return {
      entries,
      sourceName: 'Bulletin of the Atomic Scientists',
      sourceUrl: DOOMSDAY_TIMELINE_URL,
      fetchState: 'cached'
    }
  } catch {
    return null
  }
}

async function writeCachedTimelineData(timelineData: TimelineData): Promise<void> {
  try {
    const cachePath = getTimelineCachePath()
    await mkdir(join(cachePath, '..'), { recursive: true })
    await writeFile(cachePath, JSON.stringify(timelineData), 'utf8')
  } catch (error) {
    console.error('Failed to write Doomsday Clock timeline cache:', error)
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    )
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#8220;|&ldquo;/gi, '"')
    .replace(/&#8221;|&rdquo;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&hellip;/gi, '...')
}

function stripTags(value: string): string {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
    sourceUrl: DOOMSDAY_CLOCK_URL,
    fetchState: 'live'
  }
}

function extractTimelineDataFromHtml(html: string): TimelineData | null {
  const scrollyStart = html.indexOf('id="scrolly1"')
  const scrollyEnd = html.indexOf('id="scrolly2"', scrollyStart)

  if (scrollyStart === -1 || scrollyEnd === -1) {
    return null
  }

  const timelineHtml = html.slice(scrollyStart, scrollyEnd)
  const slidePattern =
    /<div[^>]+data-scrollytelling-slide="(\d{4})"[^>]*>([\s\S]*?)(?=<div[^>]+data-scrollytelling-slide="|\s*<\/div>\s*<\/div>\s*<\/div>)/gi
  const entries: TimelineEntry[] = []
  let slideMatch: RegExpExecArray | null

  while ((slideMatch = slidePattern.exec(timelineHtml)) !== null) {
    const year = Number.parseInt(slideMatch[1], 10)
    const slideHtml = slideMatch[2]
    const titleMatch = slideHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    const paragraphMatches = [...slideHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]

    if (!titleMatch || paragraphMatches.length === 0 || !TIMELINE_SECONDS_BY_YEAR[year]) {
      continue
    }

    const body = paragraphMatches.map((match) => stripTags(match[1])).join(' ').trim()

    if (!body) {
      continue
    }

    entries.push({
      year,
      title: stripTags(titleMatch[1]),
      body,
      secondsToMidnight: TIMELINE_SECONDS_BY_YEAR[year]
    })
  }

  if (entries.length === 0) {
    return null
  }

  return {
    entries,
    sourceName: 'Bulletin of the Atomic Scientists',
    sourceUrl: DOOMSDAY_TIMELINE_URL,
    fetchState: 'live'
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

async function fetchTimelineData(): Promise<TimelineData> {
  try {
    const response = await fetch(DOOMSDAY_TIMELINE_URL, {
      headers: {
        'user-agent': `${app.getName()}/${app.getVersion()}`
      }
    })

    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status}`)
    }

    const html = await response.text()
    const timelineData = extractTimelineDataFromHtml(html)

    if (!timelineData) {
      throw new Error('Unable to parse Doomsday Clock timeline')
    }

    await writeCachedTimelineData(timelineData)

    return timelineData
  } catch (error) {
    console.error('Failed to fetch Doomsday Clock timeline:', error)
    const cachedTimelineData = await readCachedTimelineData()
    return cachedTimelineData ?? FALLBACK_TIMELINE_DATA
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
  ipcMain.handle('doomsday-clock:get-timeline', () => fetchTimelineData())

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
