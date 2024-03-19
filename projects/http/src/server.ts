import { createServer } from "http";
import cors from "cors";
import express from "express";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

export {
    server,
    app,
    express,
}