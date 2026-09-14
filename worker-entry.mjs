/**
 * The Cloudflare Worker entry (wrangler.jsonc "main").
 *
 * OpenNext's generated worker only answers requests. This wrapper adds the
 * Cron Trigger handler that publishes the day's READY Daily Bread edition at
 * the 7am New York rollover (src/lib/daily-bread/scheduled.ts, SA-142 /
 * F-184). Everything else is OpenNext's handler, unchanged.
 */
import handler from './.open-next/worker.js'
import { DAILY_BREAD_PUBLISH_CRON, publishDueEdition } from './src/lib/daily-bread/scheduled.ts'

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js'

export default {
  fetch: handler.fetch,

  async scheduled(controller, env, ctx) {
    // Only the Daily Bread cron publishes; any other trigger added later
    // (e.g. the retention cleanup in wrangler.jsonc) needs its own branch.
    if (controller.cron !== DAILY_BREAD_PUBLISH_CRON) {
      console.log(JSON.stringify({ scope: 'worker', event: 'cron_unhandled', cron: controller.cron }))
      return
    }
    ctx.waitUntil(
      publishDueEdition({
        now: new Date(controller.scheduledTime),
        appUrl: env.NEXT_PUBLIC_APP_URL || 'https://euangelion.app',
        secret: env.INTERNAL_ROUTE_SECRET,
        // Straight into the app handler: no network hop, no public exposure.
        fetch: (request) => handler.fetch(request, env, ctx),
      }),
    )
  },
}
