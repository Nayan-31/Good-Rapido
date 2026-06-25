import createApp from "./src/app.js";
import { connectDB } from "./src/db/db.js";

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