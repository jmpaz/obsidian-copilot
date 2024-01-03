import * as React from "react";
import SettingsItem from "../../../components/SettingsItem";

export interface Settings {
  api_key: string;
  proxy_base_url: string;
}

export const parse_settings = (data: string | null): Settings => {
  if (data === null) {
    return { api_key: "", proxy_base_url: "" };
  }
  try {
    const settings = JSON.parse(data);
    // Ensure both api_key and proxy_base_url are strings
    if (typeof settings.api_key !== "string" || typeof settings.proxy_base_url !== "string") {
      return { api_key: "", proxy_base_url: "" };
    }
    return settings;
  } catch (e) {
    return { api_key: "", proxy_base_url: "" };
  }
};

export function SettingsUI({
  settings,
  saveSettings,
}: {
  settings: string | null;
  saveSettings: (settings: string) => void;
}) {
  const parsedSettings = parse_settings(settings);

  // Function to handle changes in the settings
  const handleSettingsChange = (newSettings: Partial<Settings>) => {
    saveSettings(JSON.stringify({ ...parsedSettings, ...newSettings }));
  };

  return (
    <>
      <SettingsItem
        name="API key"
        description={
          <>
            Your OpenAI{" "}
            <a href="https://platform.openai.com/account/api-keys">
              API key
            </a>
          </>
        }
      >
        <input
          type="text"
          value={parsedSettings.api_key}
          onChange={(e) => handleSettingsChange({ api_key: e.target.value })}
        />
      </SettingsItem>
      <SettingsItem
        name="Proxy Base URL"
        description="Your openai-cd2-proxy's base URL"
      >
        <input
          type="text"
          value={parsedSettings.proxy_base_url}
          onChange={(e) => handleSettingsChange({ proxy_base_url: e.target.value })}
        />
      </SettingsItem>
    </>
  );
}
