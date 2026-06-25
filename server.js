import createApp from "./src/app";
import { connectDB } from "./src/db/db";

const app = createApp();

function startServer() {
    connectDB().then(() => {
        app.listen(3000, () => {
            console.log("server is running on port 3000")
        })
    }).catch((err) => {
        console.log(err, "err while server is running")
    })
}

startServer()