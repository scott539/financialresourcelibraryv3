<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/527a1e90-ea47-44b1-bba8-45f2f45dedee

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Testing the email signup

The library remembers a visitor who signed up (or tapped "No thanks") in the browser's local storage and skips the email form for them from then on. Before testing a signup, clear the data for the address you are testing (the preview's vercel.app address, or biggerpocketsmoney.com when testing the embed on /resources/). In Chrome that is the icon at the left of the address bar, then Site settings, then Delete data. A fresh private window works too. Otherwise the form never appears. A signup Kit holds for its spam check is kept as pending, which only prefills the form next time.
