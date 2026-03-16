/**
 * User-Agent Generator
 * Generates realistic browser User-Agent strings at runtime
 */

// Chrome version range (major versions from 120 to current stable ~135)
const MIN_CHROME_VERSION = 120;
const MAX_CHROME_VERSION = 135;

// Windows versions
const WINDOWS_VERSIONS = [
  { platform: 'Windows NT 10.0; Win64; x64', version: '10.0' },
  { platform: 'Windows NT 10.0; WOW64', version: '10.0' },
];

// macOS versions (Intel and Apple Silicon)
const MACOS_VERSIONS = [
  { platform: 'Macintosh; Intel Mac OS X 10_15_7', version: '10_15_7' },
  { platform: 'Macintosh; Intel Mac OS X 10_15_6', version: '10_15_6' },
  { platform: 'Macintosh; Intel Mac OS X 10_14_6', version: '10_14_6' },
];

// Linux platforms
const LINUX_PLATFORMS = [
  'X11; Linux x86_64',
  'X11; Linux i686',
];

/**
 * Generate a random integer between min and max (inclusive)
 */
const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Pick a random element from an array
 */
const randomChoice = <T>(arr: T[]): T => {
  return arr[randomInt(0, arr.length - 1)];
};

/**
 * Generate a random Chrome version string (e.g., "131.0.0.0")
 */
const generateChromeVersion = (): string => {
  const major = randomInt(MIN_CHROME_VERSION, MAX_CHROME_VERSION);
  const minor = 0;
  const build = randomInt(0, 9999);
  const patch = 0;
  return `${major}.${minor}.${build}.${patch}`;
};

/**
 * Generate a random User-Agent string
 * Returns a Chrome browser UA with randomized OS and version
 */
export const generateUserAgent = (): string => {
  const chromeVersion = generateChromeVersion();
  const safariVersion = randomInt(537, 605);

  // Weight: 70% Windows, 25% macOS, 5% Linux
  const rand = Math.random();

  if (rand < 0.70) {
    // Windows
    const win = randomChoice(WINDOWS_VERSIONS);
    return `Mozilla/5.0 (${win.platform}) AppleWebKit/${safariVersion}.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${safariVersion}.36`;
  } else if (rand < 0.95) {
    // macOS
    const mac = randomChoice(MACOS_VERSIONS);
    return `Mozilla/5.0 (${mac.platform}) AppleWebKit/${safariVersion}.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${safariVersion}.36`;
  } else {
    // Linux
    const linux = randomChoice(LINUX_PLATFORMS);
    return `Mozilla/5.0 (${linux}) AppleWebKit/${safariVersion}.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${safariVersion}.36`;
  }
};

/**
 * Get a random User-Agent for xiaohongshu requests
 * This is the main export used by the extraction module
 */
export const getRandomUserAgent = (): string => generateUserAgent();
