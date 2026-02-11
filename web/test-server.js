import express from "express";

const app = express();
const PORT = 3000;

app.get("/", (req, res) => res.send("Hello World"));

const server = app.listen(PORT, () => console.log(`✅ Minimal server running at http://localhost:${PORT}`));

server.on("error", (err) => {
  console.error("❌ Server failed to start:", err.message);
});
