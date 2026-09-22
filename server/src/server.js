require("dotenv").config()

const app = require("./app");
require("./config/database.js")
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Hello from ${PORT}`);
})