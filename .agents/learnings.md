# Learning Log

## 2026-06-20 — Building MoodFlow Glassmorphism App

### Prompt
User wanted to transform the Glassmorphism preview (Option 5) into a complete production-ready website, with thoughtful future-ready features.

### Skills/Tools Used
- **dynamic-ui-frontend-generator** - For UI direction and patterns
- **coding** - For implementation of components
- **Playwright MCP** - For testing and screenshots
- **localStorage** - For data persistence (no backend needed)

### What Worked
1. Creating a centralized hook (useMoodStore) for all state management made components clean
2. Separate UI components (GlassBackground, Navigation) allowed for reusable layout
3. Client-side sentiment analysis using keyword matching provided instant feedback without API calls
4. Multi-page structure with navigation gave a proper app feel
5. localStorage persistence meant no backend was needed for MVP

### What Didn't
1. canvas-confetti had SSR issues - solved with dynamic import
2. Math.random() in initial state caused hydration mismatch - solved by using deterministic values
3. Object keys with spaces needed explicit Record<string, number> type annotation

### For Next Time
- Always test SSR compatibility before adding client-side libraries
- Use deterministic values for animations instead of Math.random() in components
- For mood/emoji apps, client-side keyword analysis is sufficient for MVP - saves API complexity

### New Patterns
- Centralized store hook pattern for Next.js apps with localStorage
- GlassBackground component as reusable layout wrapper
- AI sentiment analysis via keyword matching (no API needed)
