/**
 * Production Smoke Test Script
 *
 * Paste this into the browser console on your production site (or local preview)
 * to reproduce symptoms and collect exact network/console failure signatures.
 *
 * Usage:
 * 1. Open production URL (e.g. https://main.xxxxx.amplifyapp.com)
 * 2. Open DevTools → Console
 * 3. Paste this script and press Enter
 * 4. Follow the prompts to run each step
 * 5. Copy the final report
 */

(function () {
  const diag = window.__WARDROBE_DIAG__;
  if (!diag) {
    console.error(
      '[SmokeTest] __WARDROBE_DIAG__ not found. Ensure the app has loaded and diagnostics are enabled.'
    );
    return;
  }

  diag.clear();

  const report = {
    timestamp: new Date().toISOString(),
    origin: location.origin,
    protocol: location.protocol,
    hostname: location.hostname,
    steps: [],
    errors: [],
    networkFailures: [],
  };

  // Capture fetch/XHR failures
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    return originalFetch.apply(this, args).then(
      (r) => r,
      (err) => {
        report.networkFailures.push({
          type: 'fetch',
          url: args[0]?.url || args[0],
          error: err?.message || String(err),
        });
        throw err;
      }
    );
  };

  console.log(`
=== Wardrobe AI Production Smoke Test ===

Steps to reproduce:
1. LOGIN: Sign in with Google or email
2. WARDROBE LOAD: Wait for home/wardrobe to load (or infinite spinner)
3. POPULATE DEMO: Click "Populate Demo Data" if shown
4. ADD TO WARDROBE: Open scanner, capture/upload photo, tap "Add to Wardrobe"
5. INSIGHTS: Navigate to Insights and trigger AI insights

After each step (or when you see a failure), run:
  smokeTest.capture("step_name")

Example: smokeTest.capture("post_login")
Example: smokeTest.capture("add_to_wardrobe_failed")

When done, run: smokeTest.report()
`);

  window.smokeTest = {
    capture(label) {
      const summary = diag.getSummary();
      const lastError = diag.getLastError();
      report.steps.push({
        label,
        ts: new Date().toISOString(),
        eventCount: summary.total,
        errors: summary.errors,
        lastError: lastError
          ? { step: lastError.step, code: lastError.code, message: lastError.message }
          : null,
      });
      if (lastError) {
        report.errors.push({ step: label, ...lastError });
      }
      console.log(`[SmokeTest] Captured: ${label}`, summary);
    },

    report() {
      const summary = diag.getSummary();
      const fullReport = {
        ...report,
        diagnosticSummary: summary,
        allEvents: diag.events(),
      };
      console.log('=== Smoke Test Report (copy this) ===');
      console.log(JSON.stringify(fullReport, null, 2));
      return fullReport;
    },
  };
})();
