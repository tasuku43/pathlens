export type MermaidPreviewTheme = "light" | "dark";

export function viviMermaidThemeVariables(theme: MermaidPreviewTheme) {
  if (theme === "light") {
    return {
      background: "#f4f7f8",
      mainBkg: "#ffffff",
      primaryColor: "#ffffff",
      primaryBorderColor: "#2f8fa5",
      primaryTextColor: "#17242a",
      secondaryColor: "#f7ead3",
      tertiaryColor: "#e7f3f6",
      lineColor: "#2f8fa5",
      textColor: "#17242a",
      clusterBkg: "#e9f0f3",
      clusterBorder: "#cfdee5",
      noteBkgColor: "#f7ead3",
      noteTextColor: "#17242a",
      actorBkg: "#ffffff",
      actorBorder: "#2f8fa5",
      actorTextColor: "#17242a",
      signalColor: "#2f8fa5",
      labelBoxBkgColor: "#ffffff",
      labelBoxBorderColor: "#cfdee5",
      labelTextColor: "#17242a",
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    };
  }

  return {
    background: "#0b1218",
    mainBkg: "#111a21",
    primaryColor: "#111a21",
    primaryBorderColor: "#67b8c7",
    primaryTextColor: "#eef4f4",
    secondaryColor: "#2f2a1b",
    tertiaryColor: "#16212a",
    lineColor: "#67b8c7",
    textColor: "#eef4f4",
    clusterBkg: "#16212a",
    clusterBorder: "#273944",
    noteBkgColor: "#2f2a1b",
    noteTextColor: "#f2dc9a",
    actorBkg: "#111a21",
    actorBorder: "#67b8c7",
    actorTextColor: "#eef4f4",
    signalColor: "#67b8c7",
    labelBoxBkgColor: "#111a21",
    labelBoxBorderColor: "#273944",
    labelTextColor: "#eef4f4",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };
}
