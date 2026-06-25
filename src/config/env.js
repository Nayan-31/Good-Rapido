import dotenv from 'dotenv'
dotenv.config()
import z from 'zod'
import appConstant from '../constant/app.constant'

const envSchema = z.object({
    PORT: z.coerce.number().default(appConstant.PORT),
    MONGO_URL: z.string().default(appConstant.MONGO_URL),
    NODE_ENV: z.string().default(appConstant.NODE_ENV),
    LOGGER_LEVEL: z.string().default(appConstant.LOGGER_LEVEL),
    RATELIMIT_WINDOWS: z.coerce.number().default(appConstant.RATE_LIMIT_WINDOW),
    RATELIMIT: z.coerce.number().default(appConstant.RATE_LIMIT),
    CORS_ORIGIN: z.string(),
    REFRESH_SECRET_TOKEN: z.string(),
    ACCESS_SECRET_TOKEN: z.string(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    console.log("Invalid environment variables", parsed)
}

export default parsed.data