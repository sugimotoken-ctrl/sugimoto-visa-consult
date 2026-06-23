// Sugimoto Visa brand system. Used by both the web UI and the PPTX generator.
export const BRAND = {
  name: "Sugimoto Visa",
  website: "www.sugimotovisa.com",
  // Core palette pulled from the logo: navy wordmark + terracotta flame mark.
  colors: {
    navy: "1B2A4A", // primary / headings
    navyLight: "2E4470",
    orange: "DD6B3E", // accent / flame
    orangeLight: "E8895F",
    cream: "F7F4EF", // soft background
    ink: "22262E", // body text
    slate: "5B6470", // muted text
    border: "E6E1D8", // card borders
    white: "FFFFFF",
  },
  fonts: {
    heading: "Georgia", // serif, matches the engraved wordmark feel
    body: "Helvetica",
  },
} as const;

// Hex helpers for CSS (web) which want a leading '#'. PPTX wants raw hex.
export const css = (hex: string) => `#${hex}`;
