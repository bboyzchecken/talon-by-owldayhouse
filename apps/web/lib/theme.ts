export const THEME_KEY = "odh-theme";

/** Runs first in <body>, before first paint, so a saved dark theme never flashes white. */
export const themeInitScript = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
