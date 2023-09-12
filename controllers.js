import db from "./db.js";
import {
  invokeAccessTokenByCode,
  invokeAccessTokenByRefresh,
  findContactWithQuery,
  updateContact,
  createContact,
  createLead,
} from "./api.js";

//self-sufficient helper
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

//self-sufficient helper
export async function findContact(info) {
  //not neccessary to validate existance or value of arguments
  const found = {};

  let promiseArr = ["phone", "email"].map((field) => {
    const query = info[field];
    if (!query) return Promise.resolve([]);
    return findContactWithQuery(query).then(({ status, data }) => {
      if (!status !== 204) found[field] = data;
    });
  });

  //TODO not optimistic handler
  await Promise.all(promiseArr);

  if (found.phone?._embedded?.contacts.length > 0 && found.email?._embedded?.contacts.length > 0) {
    const phoneIds = new Set(found.phone._embedded.contacts.map((obj) => obj.id));
    const intersection = found.email._embedded.contacts.filter((obj) => phoneIds.has(obj.id));
    //TODO unclear TA, bulk update of same contacts or remove duplicates
    return intersection[0];
  }
  if (found.phone?._embedded?.contacts.length > 0) return found.phone._embedded.contacts[0];
  if (found.email?._embedded?.contacts.length > 0) return found.email._embedded.contacts[0];
  return {};
}

export async function handleContact(name, phone, email) {
  //TODO update token with cron, not on demand
  await updateAccessToken();
  const prev = await findContact({ phone, email });
  let action = "";
  let response = {};
  if (prev?.id) {
    const { custom_fields_values: prevFields } = prev;
    const prevInfo = prevFields.reduce(
      (accum, currVal) => {
        accum[currVal.field_code.toLowerCase()] = currVal.values[0].value;
        return accum;
      },
      { name: prev.name },
    );

    if (prevInfo.name === name && prevInfo.phone === phone && prevInfo.email === email) {
      action = "skip_update";
    } else {
      action = "update";
      response = await updateContact({ name, phone, email }, prev); //TODO investigate how api of update request works, will it remove undefined values?
    }
  } else {
    action = "create";
    response = await createContact({ name, phone, email });
  }

  const responseId = response.data?._embedded.contacts[0].id;
  const leadId = responseId ? responseId : prev.id;
  const leadResponse = await createLead(leadId);
  return { contact: { response, action }, lead: leadResponse };
}
