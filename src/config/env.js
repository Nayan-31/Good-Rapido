import dotenv from 'dotenv'
dotenv.config({ quiet: process.env.NODE_ENV === 'test' })
import z from 'zod'
import appConstant from '../shared/constant/app.constant.js'

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
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`)
}

export default parsed.data
