import db from "./db.js";
import {
  invokeAccessTokenByCode,
  invokeAccessTokenByRefresh,
  findContactWithQuery,
  updateContact,
  createContact,
} from "./api.js";
export async function updateAccessToken() {
  await db.read();
  let response;
  let method = "refresh_token";

  if (db.data.refresh_token) {
    let timestamp = +new Date();
    if (db.data.expiresAt - 600 > timestamp) {
      return {
        message: `Unneccesary update of access_token, which will last till ${new Date(
          db.data.expiresAt,
        ).toISOString()} UTC`, // (MSK is +3)
      };
    }
    response = await invokeAccessTokenByRefresh(db.data);
  } else {
    if (!db.data.code) throw new Error("Not found refresh_token or code(auth code)");
    response = await invokeAccessTokenByCode(db.data);
    db.data.code = void 0;
    method = "authorization_code";
  }

  db.data.refresh_token = response.data.refresh_token;
  db.data.access_token = response.data.access_token;
  db.data.expiresAt = +new Date() + response.data.expires_in * 1000; // expires_in is seconds
  await db.write();
  return { message: "Access token updated", method, expiresAt: db.data.expiresAt };
}

export async function findContact(phone, email) {
  let found = {};
  if (phone) {
    const { data, status } = await findContactWithQuery(phone);
    if (!status !== 204) found.phone = data;
  }
  if (email) {
    const { data, status } = await findContactWithQuery(email);
    if (status !== 204) found.email = data;
  }
  if (found.phone?._embedded?.contacts.length > 0 && found.email?._embedded?.contacts.length > 0) {
    const phoneIds = new Set(found.phone._embedded.contacts.map((obj) => obj.id));
    const intersection = found.email._embedded.contacts.filter((obj) => phoneIds.has(obj.id));
    return intersection[0];
  }
  if (found.phone?._embedded?.contacts.length > 0) return found.phone._embedded.contacts[0];
  if (found.email?._embedded?.contacts.length > 0) return found.email._embedded.contacts[0];
  return {};
}

export async function handleContact(name, phone, email) {
  await updateAccessToken();
  const prev = await findContact(phone, email);
  let action = "";
  let response = {};
  if (prev?.id) {
    action = "update";
    response = await updateContact({ name, phone, email }, prev);
  } else {
    action = "create";
    response = await createContact(name, phone, email);
  }
  return { response, action };
  //update if so
  //create
}
