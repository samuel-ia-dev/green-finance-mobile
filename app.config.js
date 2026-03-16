const baseConfig = require("./app.json");

module.exports = () => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const owner = process.env.EXPO_OWNER;
  const plugins = [...(baseConfig.expo.plugins ?? [])];

  if (!plugins.includes("expo-secure-store")) {
    plugins.push("expo-secure-store");
  }

  if (!plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === "expo-local-authentication")) {
    plugins.push([
      "expo-local-authentication",
      {
        faceIDPermission: "Permita usar sua biometria para entrar no Green Finance."
      }
    ]);
  }

  const expo = {
    ...baseConfig.expo,
    plugins,
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      ...(baseConfig.expo.updates ?? {}),
      fallbackToCacheTimeout: 0,
    },
  };

  if (owner) {
    expo.owner = owner;
  }

  if (projectId) {
    expo.updates.url = `https://u.expo.dev/${projectId}`;
    expo.extra = {
      ...(baseConfig.expo.extra ?? {}),
      eas: {
        ...(baseConfig.expo.extra?.eas ?? {}),
        projectId,
      },
    };
  } else if (baseConfig.expo.extra) {
    expo.extra = baseConfig.expo.extra;
  }

  return { expo };
};
