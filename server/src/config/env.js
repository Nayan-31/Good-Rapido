import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import z from 'zod'
import appConstant from '../shared/constant/app.constant.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const serverEnvPath = resolve(currentDir, '../../.env')
const rootEnvPath = resolve(currentDir, '../../../.env')
const quiet = process.env.NODE_ENV === 'test'
const runtimeEnv = { ...process.env }

dotenv.config({ path: rootEnvPath, quiet })
dotenv.config({ path: serverEnvPath, override: true, quiet })

Object.assign(process.env, runtimeEnv)

const envSchema = z.object({
    PORT: z.coerce.number().default(appConstant.PORT),
    MONGO_URL: z.string().default(appConstant.MONGO_URL),
    NODE_ENV: z.string().default(appConstant.NODE_ENV),
    LOGGER_LEVEL: z.string().default(appConstant.LOGGER_LEVEL),
    RATELIMIT_WINDOWS: z.coerce.number().default(appConstant.RATE_LIMIT_WINDOW),
    RATELIMIT: z.coerce.number().default(appConstant.RATE_LIMIT),
    CORS_ORIGIN: z.string().default(appConstant.CORS_ORIGIN),
    REFRESH_SECRET_TOKEN: z.string().default(appConstant.REFRESH_SECRET_TOKEN),
    ACCESS_SECRET_TOKEN: z.string().default(appConstant.ACCESS_SECRET_TOKEN),
    ACCESS_TOKEN_EXPIRES_IN: z.string().default(appConstant.ACCESS_TOKEN_EXPIRES_IN),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default(appConstant.REFRESH_TOKEN_EXPIRES_IN),
    PAYMENT_GATEWAY_PROVIDER: z.enum(['mock', 'razorpay', 'stripe']).default(appConstant.PAYMENT_GATEWAY_PROVIDER),
    RAZORPAY_KEY_ID: z.string().default(appConstant.RAZORPAY_KEY_ID),
    RAZORPAY_KEY_SECRET: z.string().default(appConstant.RAZORPAY_KEY_SECRET),
    STRIPE_SECRET_KEY: z.string().default(appConstant.STRIPE_SECRET_KEY),
    STRIPE_PUBLISHABLE_KEY: z.string().default(appConstant.STRIPE_PUBLISHABLE_KEY),
    GOOGLE_MAPS_API_KEY: z.string().default(appConstant.GOOGLE_MAPS_API_KEY),
    GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT: z.string().default(appConstant.GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT),
    GOOGLE_PLACES_DETAILS_ENDPOINT: z.string().default(appConstant.GOOGLE_PLACES_DETAILS_ENDPOINT),
    GOOGLE_MAPS_SEARCH_COUNTRY: z.string().default(appConstant.GOOGLE_MAPS_SEARCH_COUNTRY),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`)
}

export default parsed.data
