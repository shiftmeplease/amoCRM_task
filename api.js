import axios from "axios";
import db from "./db.js";

// Found via website debugging, unclear documentation/nothing in notion instruction
// https://github.com/amocrm/amocrm-api-php/issues/21
// {"request":{"contacts":{"update":[{"id":65000425,"custom_fields":[{"id":"2165377","values":[{"enum":"4810477","value":"aa1@mail.com"}]}],"last_modified":1694455616}]}}}
// {"request":{"contacts":{"update":[{"id":65000425,"custom_fields":[{"id":"2165375","values":[{"enum":"4810465","value":"89882223311"}]}],"last_modified":1694455593}]}}}
//TODO replace all magicalId with field_code...
const magicalIds = {
  phone: 2165375,
  email: 2165377,
};

const instance = axios.create({
  baseURL: "https://shiftmeplease.amocrm.ru",
  timeout: 4000,
  headers: { Authorization: `Bearer ${db.data.access_token}` },
  validateStatus: () => true,
});

export async function createContact(info) {
  const { status, data } = await instance.post("/api/v4/contacts", [
    {
      name: info.name,
      custom_fields_values: ["phone", "email"].map((field) => {
        return {
          field_id: magicalIds[field],
          values: [
            {
              value: info[field],
            },
          ],
        };
      }),
    },
  ]);

  // {"request":{"contacts":{"update":[{"id":65000443,"custom_fields":[{"id":"2165375","values":[{"enum":"4810465","value":"1313131"}]}],"last_modified":1694455708}]}}}
  return { status, data };
}

export async function updateContact(current, prev) {
  const { name } = current;
  const { id } = prev;

  const reqQuery = ["phone", "email"].reduce(
    (accum, field) => {
      accum.custom_fields_values.push({
        field_id: magicalIds[field],
        values: [
          {
            value: current[field],
          },
        ],
      });
      return accum;
    },
    {
      id,
      name,
      custom_fields_values: [],
    },
  );

  const { status, data } = await instance.patch("/api/v4/contacts", [reqQuery]);
  return { status, data };
}

//TODO doesnt work somehow, even with single filter
export async function findContactWithFilter(phone, email) {
  const queryParams = [];

  //empty params are not rendered in URL
  queryParams[`filter[${magicalIds.phone}]`] = phone ? encodeURI(phone) : void 0;
  queryParams[`filter[${magicalIds.email}]`] = email ? encodeURI(email) : void 0;

  const result = await instance.get("/api/v4/contacts", {
    params: { ...queryParams },
  });

  const { status, data } = result;
  return { status, data };
}

export async function findContactWithQuery(query) {
  const result = await instance.get("/api/v4/contacts", {
    params: { query },
  });
  const { status, data } = result;
  //TODO not optimistic request
  return { status, data };
}

export async function invokeAccessTokenByCode({ integrationId, secret, code }) {
  const { data, status } = await instance.post("/oauth2/access_token", {
    client_id: integrationId,
    client_secret: secret,
    code,
    grant_type: "authorization_code", //refresh_token
    redirect_uri: "https://oamen.ru",
  });
  if (status != 200) {
    throw new Error({ data, status });
  }
  return { data, status };
}

export async function invokeAccessTokenByRefresh({ integrationId, secret, refresh_token }) {
  const { data, status } = await instance.post("/oauth2/access_token", {
    client_id: integrationId,
    client_secret: secret,
    refresh_token,
    grant_type: "refresh_token", //refresh_token
    redirect_uri: "https://oamen.ru",
  });
  if (status != 200) {
    throw new Error({ data, status });
  }
  return { data, status };
}
