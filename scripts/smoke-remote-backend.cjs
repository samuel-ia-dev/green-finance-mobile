const baseUrl = (process.argv[2] || "").replace(/\/+$/, "");

if (!baseUrl) {
  console.error("Usage: node scripts/smoke-remote-backend.cjs <base-url>");
  process.exit(1);
}

const email = `cf-smoke-${Date.now()}@example.com`;
const password = "123456";

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  return {
    ok: response.ok,
    payload,
    status: response.status
  };
}

async function main() {
  const register = await request("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  if (!register.ok || !register.payload?.token) {
    throw new Error(`register failed: ${register.status} ${JSON.stringify(register.payload)}`);
  }

  const login = await request("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  if (!login.ok || !login.payload?.token) {
    throw new Error(`login failed: ${login.status} ${JSON.stringify(login.payload)}`);
  }

  const bootstrap = await request("/bootstrap", {
    headers: {
      Authorization: `Bearer ${login.payload.token}`
    }
  });

  if (!bootstrap.ok) {
    throw new Error(`bootstrap failed: ${bootstrap.status} ${JSON.stringify(bootstrap.payload)}`);
  }

  console.log(
    JSON.stringify(
      {
        bootstrapStatus: bootstrap.status,
        email,
        loginStatus: login.status,
        registerStatus: register.status
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
