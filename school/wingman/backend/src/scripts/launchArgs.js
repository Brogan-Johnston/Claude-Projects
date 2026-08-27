// Chromium's GPU process can crash the whole page on some Windows machines/driver
// combinations, especially in headed mode ("page.waitForTimeout: Page crashed" with no
// other explanation). Disabling GPU compositing avoids that path entirely - shared by every
// script/service that launches a browser (headed logins and the headless scraping context).
export const STABLE_LAUNCH_ARGS = ["--disable-gpu", "--disable-gpu-compositing", "--disable-software-rasterizer"];
