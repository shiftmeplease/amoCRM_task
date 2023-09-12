import express from "express";
import { handleContact } from "./controllers.js";

const port = 3030;
const app = express();

app.use((err, req, res, next) => {
  const { ips, params, route } = req;
  console.log({ ips, params, route });
  res.status(500).send({ error: err.message });
});

app.get("/", async (req, res, next) => {
  const { query } = req;
  if (Object.keys(query).length === 0)
    return res.send("https://github.com/shiftmeplease/amoCRM_task");

  try {
    const { name, email, phone } = query;

    if (!name) throw new Error("No name parameter");
    if (!email) throw new Error("No email parameter");
    if (!phone) throw new Error("No phone parameter");

    const result = await handleContact(query.name, query.phone, query.email);
    res.status(200).send(result);
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
  //TODO fit status code to error type/message
  res.status(500).send({ error: err.message });
});

app.listen(port, () => {
  console.log(`Express listening on ${port}`);
});
