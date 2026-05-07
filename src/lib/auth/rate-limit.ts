import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (
    !url ||
    !token ||
    url === 'missing' ||
    token === 'missing' ||
    !url.startsWith('https://')
  ) {
    return null
  }

  try {
    return new Redis({ url, token })
  } catch {
    return null
  }
}

const redis = getRedis()

function createLimiter(params: {
  limiter: ReturnType<typeof Ratelimit.slidingWindow>
  prefix: string
}): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: params.limiter,
    prefix: params.prefix,
    analytics: true,
  })
}

export const oauthLimiter = createLimiter({
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'rl:oauth',
})

export const magicLinkLimiter = createLimiter({
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'rl:magic-link',
})
