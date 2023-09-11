import axios from "axios";
import db from "./db.js";

// Found via website debugging, unclear documentation/nothing in notion instruction
// https://github.com/amocrm/amocrm-api-php/issues/21

const magicalIds = {
  phone: 2165375,
  email: 2165377,
};

const instance = axios.create({
  baseURL: "https://shiftmeplease.amocrm.ru",
  timeout: 4000,
  headers: { Authorization: `Bearer ${db.data.access_token}` },
  validateStatus: function (status) {
    return true;
  },
});

export async function getContacts() {
  const { status, data } = await instance.get("/api/v4/contacts");
  return { status, data };
}

export async function createContact(name, phone, email) {
  const { status, data } = await instance.post("/api/v4/contacts", [
    {
      name,
      custom_fields_values: [
        {
          field_id: magicalIds.phone,
          values: [
            {
              value: phone,
            },
          ],
        },
        {
          field_id: magicalIds.email,
          values: [
            {
              value: email,
            },
          ],
        },
      ],
    },
  ]);

  // {"request":{"contacts":{"update":[{"id":65000425,"custom_fields":[{"id":"2165377","values":[{"enum":"4810477","value":"aa1@mail.com"}]}],"last_modified":1694455616}]}}}
  // {"request":{"contacts":{"update":[{"id":65000425,"custom_fields":[{"id":"2165375","values":[{"enum":"4810465","value":"89882223311"}]}],"last_modified":1694455593}]}}}
  // {"request":{"contacts":{"update":[{"id":65000443,"custom_fields":[{"id":"2165375","values":[{"enum":"4810465","value":"1313131"}]}],"last_modified":1694455708}]}}}
  return { status, data };
}

export async function updateContact(current, prev) {
  const { email, name, phone } = current;
  const { id } = prev;

  const reqQuery = { id, custom_fields_values: [] };
  if (prev.name !== name) {
    reqQuery.name = name;
  }

  if (prev.phone !== phone) {
    reqQuery.custom_fields_values.push({
      field_id: magicalIds.phone,
      values: [
        {
          value: phone,
        },
      ],
    });
  }

  if (prev.email !== email) {
    reqQuery.custom_fields_values.push({
      field_id: magicalIds.email,
      values: [
        {
          value: email,
        },
      ],
    });
  }

  const { status, data } = await instance.patch("/api/v4/contacts", [reqQuery]);
  console.log(data);
  // {"request":{"contacts":{"update":[{"id":65000425,"custom_fields":[{"id":"2165377","values":[{"enum":"4810477","value":"aa1@mail.com"}]}],"last_modified":1694455616}]}}}
  // {"request":{"contacts":{"update":[{"id":65000425,"custom_fields":[{"id":"2165375","values":[{"enum":"4810465","value":"89882223311"}]}],"last_modified":1694455593}]}}}
  // {"request":{"contacts":{"update":[{"id":65000443,"custom_fields":[{"id":"2165375","values":[{"enum":"4810465","value":"1313131"}]}],"last_modified":1694455708}]}}}
  return { status, data };
}

export async function findContactWithFilter(phone, email) {
  const queryParams = [];

  //empty params are not rendered in URL
  queryParams[`filter[${magicalIds.phone}]`] = phone ? encodeURI(phone) : void 0;
  queryParams[`filter[${magicalIds.email}]`] = email ? encodeURI(email) : void 0;

  const result = await instance.get("/api/v4/contacts", {
    params: { ...queryParams },
  });
  console.log(result);
  const { status, data } = result;
  return { status, data };
}

export async function findContactWithQuery(queryData) {
  const result = await instance.get("/api/v4/contacts", {
    params: { query: queryData },
  });
  const { status, data } = result;
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


// {
//   token_type: 'Bearer',
//   expires_in: 86400,
//   access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjZlMzJhNDNlZTE4OTE5NGJkYTkzZjY4NGMxNTQzNDlhMDdlMGE2YjY3ODZjZGMwYjMyNmJjZDdiNTY5MTc5MzA3ZGVhNjc1YmI2NzE4YzNlIn0.eyJhdWQiOiI4ZWY3ZGEzNC1hNGRlLTRjM2UtYTYyMC1lZjM0NjQ3ZWNjYjMiLCJqdGkiOiI2ZTMyYTQzZWUxODkxOTRiZGE5M2Y2ODRjMTU0MzQ5YTA3ZTBhNmI2Nzg2Y2RjMGIzMjZiY2Q3YjU2OTE3OTMwN2RlYTY3NWJiNjcxOGMzZSIsImlhdCI6MTY5NDQ0OTE2OSwibmJmIjoxNjk0NDQ5MTY5LCJleHAiOjE2OTQ1MzU1NjksInN1YiI6IjEwMDcyNzcwIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxMjg4MjgyLCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOiJ2MiIsInNjb3BlcyI6WyJjcm0iXX0.mhvMOQnU-xkJzNyeKdPxfrIy-uCF8Os07j-FgbyCmytT-bh-8kFz86U0NYuBOyCJstJ3wAVXmy9Wit0Jk9Rpwh-E7G2lqZIOIOpzUUwA07iA4CrMddQKDuxmtU7QFIN09MrQHM8_h7razDRNB8l6bGj-k1hHtEAkaWUkDAQjZ0hVwm8c-MecpUFZlsxOhvP4BBiK9lZDNKBo2Wc-E2GyFW1GH53CUUqBlFhp8fogy4HC3_KMFvDy56qBHV4XdZC-eUfL9FNYFG-vQ-rBmBeJP-R7yD7UD21sse7Sdlw1hd7454TiHXSTXnqJFsjrTgJKTJbVdLNqtjDG4tPvlNNG2g',
//   refresh_token: 'def50200a046f6058ab260c4c679789a864ed88e43c5b0c4a7bed997c99e34485aeefec462221edbf90a7c91cc1e87e2bbf29153ca04392dd227648634460cf9ef08b4a05801f59040f30377ac80c5191381cdfa790f96e6cae40742fce05e0e9dd7ede288b3f4b6a6ecf2238e872b149b0d03c955aaa8c50047a8833a59548b5823825aea593d037204eb7cb24310745777923f0430fcc5a2aca7bf72f666cbb825d169c567d4ed7cfd77a275024eff01b25551a68fea07611c8efe15e953161131bb23ddce0c566ff56ac25961a8432b48e24ac6bdb11858af32ef7de05cfcbec63a374652c0af3cc70ee35a81441c72a000d361d4c85dccc6fd6c4485d4a4980074facd777933b7b686c2ba4c371d72d98a8261f4ecb051a34921c8553e23d014ff0527b806488a0cff92c9118728e2fc8fe0e4c37311832591fd85611d69b70b47f3e8d284c0b86c286a862a7af0bf75c0ea319530c16080ae51b28e51e3abcb1d68861706d2678dd9215781b28374ec7d19ee85a580be91b04753c8f06c615ce6935035b9b50716ba9b5d8d391db0e0ee9c13c337e623fab9c6cd9bff38d740c7b61e6175389fc13bdde1245d38806be53d8d'
// }

// const handleResponse({ status, data }){

// }

// $errors = [
//     400 => 'Bad request',
//     401 => 'Unauthorized',
//     403 => 'Forbidden',
//     404 => 'Not found',
//     500 => 'Internal server error',
//     502 => 'Bad gateway',
//     503 => 'Service unavailable',
// ];

// try
// {
//     /** Если код ответа не успешный - возвращаем сообщение об ошибке  */
//     if ($code < 200 || $code > 204) {
//         throw new Exception(isset($errors[$code]) ? $errors[$code] : 'Undefined error', $code);
//     }
// } catch(\Exception $e)
// {
//     die('Ошибка: ' . $e->getMessage() . PHP_EOL . 'Код ошибки: ' . $e->getCode());
// }
