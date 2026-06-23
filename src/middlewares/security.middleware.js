import compression from "compression"
import hpp from "hpp"
import helmet from "helmet"
import cors from "cors"
import express from "express"
import cookieParser from "cookie-parser"

export default function securityMiddlewares(app) {

    app.use(cors({
        origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
        credentials: true
    }))


    app.use(cookieParser());
    app.use(helmet())
    app.use(hpp())
    app.use(compression())
    app.use(express.json({ limit: "3mb" }))
    app.use(express.urlencoded({ extended: true, limit: '3mb' }))

}