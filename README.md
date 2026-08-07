# Fleetgame — City Fleet Manager

A 3D municipal fleet management sim for the browser. You are the Fleet Manager for the City of
Palmetto Shores, a fictional South Florida city. Buy vehicles, keep them fueled and maintained,
meet department demand, survive hurricane season, and defend the yard from raccoons.

## Run it
Static files only. Serve the folder (or open via any static host) and load `index.html`.

## Push to GitHub
This repo was built offline. To publish:

    git remote add origin https://github.com/fortlauderdale-dot/Fleetgame.git
    git push -u origin main

## Optional: AI-generated textures
The game ships with procedural textures so it always works. To swap in gpt-image-2 textures:

    OPENAI_API_KEY=sk-... node scripts/gen-textures.mjs

PNGs land in `assets/textures/` and the game picks them up automatically on next load.
