import express from "express";
import { handleContact } from "./controllers.js";

const port = 3000;
const app = express();

app.get("/", async (req, res, next) => {
  const { query } = req;
  try {
    if (!query) throw new Error("No query params");
    const { name, email, phone } = query;
    if (!name) throw new Error("No name parameter");
    if (!email) throw new Error("No email parameter");
    if (!phone) throw new Error("No phone parameter");

    const result = await handleContact(query.name, query.phone, query.email);
    res.send(result);
  } catch (e) {
    return next(e);
  }
});

// app.get("/token", async (req, res, next) => {
//   try {
//     const result = await updateAccessToken();
//     res.send(result);
//   } catch (e) {
//     return next(e);
//   }
// });

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).send({ error: err.message });
});

app.listen(port, () => {
  console.log(`Express listening on ${port}`);
});
