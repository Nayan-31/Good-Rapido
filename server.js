import createApp from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import env from "./src/config/env.js";
import logger from "./src/config/logger.js";

const app = createApp();

function startServer() {
    connectDB().then(() => {
        app.listen(env.PORT, () => {
            logger.info(`server is running on port ${env.PORT}`)
        })
    }).catch((err) => {
        logger.error({ err }, "err while server is running")
    })
}

startServer()
