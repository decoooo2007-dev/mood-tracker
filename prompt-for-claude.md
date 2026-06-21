# COPY THIS PROMPT AND PASTE INTO A NEW CLAUDE CODE CHAT

---

I have a Next.js mood tracker app at: C:\Users\Admin\OneDrive\Desktop\test 1\mood-tracker

We are implementing features in groups of 4, from simple to complex. This is Group 1.

Read the plan file at: C:\Users\Admin\OneDrive\Desktop\test 1\mood-tracker\feature-plan.md

Implement these 4 features from Group 1:
1. Fix mobile UI - emoji rendering on Android, better touch targets
2. Create Arabic locale file structure for i18n
3. Add RTL CSS support
4. Add basic Arabic translations (just key words first)

After implementing, build and test. Report what you did.

---

# OR USE THIS LARGER PROMPT FOR BETTER RESULTS

---

I have a Next.js mood tracker app for emotional wellness. I want you to implement the first group of features.

**App Location:** C:\Users\Admin\OneDrive\Desktop\test 1\mood-tracker

**Read these files first:**
1. feature-plan.md in the project root
2. src/components/app/TodayPage.tsx (main page)
3. src/lib/moods.ts (mood utilities)

**Group 1 Tasks - Foundation:**

1. **Fix Mobile UI:**
   - Ensure mood emojis render well on Android browsers
   - Improve touch target sizes (min 48px)
   - Add proper spacing between mood buttons

2. **Create i18n Structure:**
   - Create src/lib/i18n/ folder
   - Create src/lib/i18n/translations.ts with English and Arabic
   - Export a simple `t(key: string)` function

3. **Add RTL Support:**
   - Add RTL CSS classes
   - Support dir="rtl" for Arabic

4. **Basic Arabic Translations:**
   - Translate: Today, History, Settings, Happy, Calm, Sad, Frustrated, Tired, Save, Delete, etc.

**After completing:**
1. Run `npm run build` to verify
2. Test on mobile browser
3. Report what files you created/modified

Do NOT commit or push to git yet - just implement and test locally.
