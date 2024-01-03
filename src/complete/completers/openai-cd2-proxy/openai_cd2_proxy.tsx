import React from "react";
import { Notice } from "obsidian";
import { Completer, Model, Prompt } from "../../complete";
import available_models from "./models.json";
import {
  SettingsUI as ProviderSettingsUI,
  Settings,
  parse_settings,
} from "./provider_settings";
import SettingsItem from "../../../components/SettingsItem";
import { z } from "zod";

export const model_settings_schema = z.object({
  context_length: z.number().int().positive(),
});
export type ModelSettings = z.infer<typeof model_settings_schema>;
const parse_model_settings = (settings: string): ModelSettings => {
  try {
    return model_settings_schema.parse(JSON.parse(settings));
  } catch (e) {
    return {
      context_length: 8001,
    };
  }
};

export default class OpenAIModel implements Model {
  id: string;
  name: string;
  description: string;
  rate_limit_notice: Notice | null = null;
  rate_limit_notice_timeout: number | null = null;

  provider_settings: Settings;
  Settings = ({
    settings,
    saveSettings,
  }: {
    settings: string | null;
    saveSettings: (settings: string) => void;
  }) => (
    <SettingsItem
      name="Context length"
      description="In characters, how much context should the model get"
    >
      <input
        type="number"
        value={parse_model_settings(settings || "").context_length}
        onChange={(e) =>
          saveSettings(
            JSON.stringify({
              context_length: parseInt(e.target.value),
            })
          )
        }
      />
    </SettingsItem>
  );

  constructor(
    id: string,
    name: string,
    description: string,
    provider_settings: string
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.provider_settings = parse_settings(provider_settings);
  }

  async complete(prompt: Prompt, settings: string): Promise<string> {
    const parsed_settings = parse_model_settings(settings);

    // Get the base URL
    let baseUrl = this.provider_settings.proxy_base_url.trim();
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }

    // Construct the full URL
    let fullUrl;
    if (baseUrl.endsWith('/v1/')) {
      fullUrl = `${baseUrl}completions`;
    } else {
      fullUrl = `${baseUrl}v1/completions`;
    }

    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.provider_settings.api_key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt.prefix.slice(-parsed_settings.context_length),
        })
      });

      const data = await response.json();

      // Handle the response from the proxy
      return data.choices[0].text || "";
    } catch (e) {
      this.parse_api_error(e);
      throw e;
    }
  }


  create_rate_limit_notice() {
    if (this.rate_limit_notice) {
      window.clearTimeout(this.rate_limit_notice_timeout!);
      this.rate_limit_notice_timeout = window.setTimeout(() => {
        this.rate_limit_notice?.hide();
        this.rate_limit_notice = null;
        this.rate_limit_notice_timeout = null;
      }, 5000);
    } else {
      this.rate_limit_notice = new Notice(
        'Rate limit exceeded. Check the "Rate limits" section in the plugin settings for more information.',
        250000
      );
      this.rate_limit_notice_timeout = window.setTimeout(() => {
        this.rate_limit_notice?.hide();
        this.rate_limit_notice = null;
        this.rate_limit_notice_timeout = null;
      }, 5000);
    }
  }

  create_api_key_notice() {
    const notice: any = new Notice("", 5000);
    const notice_element = notice.noticeEl as HTMLElement;
    notice_element.createEl("span", {
      text: "API key appears to be invalid. Please double-check your API key and base URL in the plugin settings."
    });
  }

  parse_api_error(e: { status?: number }) {
    if (e.status === 429) {
      this.create_rate_limit_notice();
      throw new Error();
    } else if (e.status === 401) {
      this.create_api_key_notice();
      throw new Error();
    }
    throw e;
  }
}

export class OpenAICD2Complete implements Completer {
  id: string = "openai-cd2-proxy";
  name: string = "openai-cd2-proxy";
  description: string = "OpenAI Completion API (via openai-cd2-proxy)"

  async get_models(settings: string) {
    return available_models.map(
      (model) =>
        new OpenAIModel(
          model.id,
          model.name,
          model.description,
          settings
        )
    );
  }

  Settings = ProviderSettingsUI;
}
