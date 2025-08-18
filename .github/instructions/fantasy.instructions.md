# Copilot Instructions for Fantasy Tool

These are global rules that Copilot should always follow when generating or modifying code in this project.

---

## Layout & Spacing
- Always use the **Draftboard layout and spacing** style shown in the second screenshot the user provided (balanced columns, consistent padding, centered content).  
- Ensure tables and grids have **tabular-nums** styling so player stats align properly.  
- Maintain consistent spacing across all pages (Draftboard, Players, etc.).  

---

## Features Placement
- Keep the main navigation sidebar as the place for features:
  - Draft Recap
  - Trade Analyzer
  - Waiver Wire
  - Lineup Optimizer
- Do **not** place these as floating buttons inside the Draftboard.  
- Remove the **“Create New Team”** feature completely.  

---

## Tiers System
- Always use the **T1, T2, T3 tier system** for player rankings.  
- Do **not** replace tiers with labels like "Elite, Great, Good."  

---

## Tables & Headers
- Tables should keep **headers sticky** so they remain visible when scrolling player stats.  
- Ensure headers line up properly with their columns.  
- Use consistent font sizes and alignment across all tables.  

---

## Defaults & Behavior
- Default the Players page to the **current year (latest dataset available, e.g. 2025)**.  
- Favorites:
  - When a player is marked as a favorite, they must appear in the **Favorites tab** consistently.  
  - Ensure favorite state persists during navigation within the app.  

---

## General Rules
- Maintain a **dark theme aesthetic** across all pages with consistent styling.  
- Do not introduce features without explicit instruction.  
- Prioritize **clean UI and readability** over adding extra controls.  

---

## Bug Handling & Debugging
- API year defaults:
  - Always fetch the latest available year (e.g., 2025) for Players and Draftboard views.
  - If the year is not provided or causes errors, gracefully fall back to the latest year instead of hardcoding past years.
- Favorites:
  - If a favorite action fails, log the error clearly in the console with player ID and action attempted.
  - Favorites must stay in sync across Players and Favorites pages without requiring a reload.
- Error handling:
  - Log API errors with meaningful context (endpoint, status code, payload snippet).
  - Do not silently fail—always provide feedback for debugging.