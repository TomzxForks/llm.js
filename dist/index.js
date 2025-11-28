var LLM = function() {
  "use strict";
  class LoggerManager {
    constructor() {
      this.loggers = /* @__PURE__ */ new Map();
      this.patterns = [];
      this.isNode = typeof process !== "undefined" && process.env;
      this.colors = [
        "#e6194b",
        "#3cb44b",
        "#ffe119",
        "#4363d8",
        "#f58231",
        "#911eb4",
        "#46f0f0",
        "#f032e6",
        "#bcf60c",
        "#fabebe",
        "#008080",
        "#e6beff",
        "#9a6324",
        "#fffac8",
        "#800000",
        "#aaffc3",
        "#808000",
        "#ffd8b1",
        "#000075",
        "#808080"
      ];
      this.updatePatterns();
    }
    updatePatterns() {
      let debugEnv = "";
      if (this.isNode) {
        debugEnv = typeof process !== "undefined" && process.env.DEBUG || "";
      } else {
        if (typeof localStorage !== "undefined") {
          debugEnv = localStorage.getItem("DEBUG") || "";
        }
        if (typeof globalThis !== "undefined" && globalThis.DEBUG) {
          debugEnv = globalThis.DEBUG;
        }
      }
      this.patterns = debugEnv.split(",").map((p) => p.trim()).filter(Boolean);
      for (const [namespace, config2] of this.loggers) {
        config2.enabled = this.isEnabled(namespace);
      }
    }
    isEnabled(namespace) {
      if (this.patterns.length === 0) return false;
      for (const pattern of this.patterns) {
        if (pattern.startsWith("-")) {
          const excludePattern = pattern.slice(1);
          if (this.matchPattern(namespace, excludePattern)) {
            return false;
          }
        } else {
          if (this.matchPattern(namespace, pattern)) {
            return true;
          }
        }
      }
      return false;
    }
    matchPattern(namespace, pattern) {
      if (pattern === "*") return true;
      if (pattern === namespace) return true;
      const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\+/g, "\\+").replace(/\[/g, "\\[").replace(/\]/g, "\\]").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\^/g, "\\^").replace(/\$/g, "\\$").replace(/\|/g, "\\|");
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(namespace);
    }
    getColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        const char = namespace.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return this.colors[Math.abs(hash) % this.colors.length];
    }
    formatMessage(namespace, level, message, args) {
      const now = Date.now();
      const config2 = this.loggers.get(namespace);
      let prefix = namespace;
      let timeDiff = "";
      if (config2.lastTime) {
        timeDiff = `+${now - config2.lastTime}ms`;
      }
      config2.lastTime = now;
      if (this.isNode) {
        const colorCode = this.getAnsiColor(config2.color);
        prefix = `\x1B[${colorCode}m${namespace}\x1B[0m`;
        if (timeDiff) {
          prefix += ` \x1B[90m${timeDiff}\x1B[0m`;
        }
      } else {
        if (timeDiff) {
          prefix += ` ${timeDiff}`;
        }
      }
      const levelPrefix = level !== "debug" ? `[${level.toUpperCase()}]` : "";
      return `${prefix}${levelPrefix ? " " + levelPrefix : ""} ${message}`;
    }
    getAnsiColor(hexColor) {
      const colorMap = {
        "#e6194b": "31",
        // red
        "#3cb44b": "32",
        // green  
        "#ffe119": "33",
        // yellow
        "#4363d8": "34",
        // blue
        "#f58231": "35",
        // magenta
        "#911eb4": "36"
        // cyan
      };
      return colorMap[hexColor] || "37";
    }
    log(namespace, level, message, ...args) {
      const config2 = this.loggers.get(namespace);
      if (!config2 || !config2.enabled) return;
      if (typeof message === "object" || Array.isArray(message)) {
        message = JSON.stringify(message);
      }
      for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === "object" || Array.isArray(args[i])) {
          args[i] = JSON.stringify(args[i]);
        }
      }
      const formattedMessage = this.formatMessage(namespace, level, message, args);
      if (this.isNode) {
        const output = level === "debug" ? process.stderr : process.stdout;
        output.write(formattedMessage + " ");
        if (args.length > 0) {
          output.write(args.map(
            (arg) => typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(" "));
        }
        output.write("\n");
      } else {
        const styles = `color: ${config2.color}; font-weight: bold;`;
        if (level === "warn") {
          console.warn(`%c${formattedMessage}`, styles, ...args);
        } else if (level === "error") {
          console.error(`%c${formattedMessage}`, styles, ...args);
        } else {
          console.log(`%c${formattedMessage}`, styles, ...args);
        }
      }
    }
    createLogger(namespace) {
      if (!this.loggers.has(namespace)) {
        this.loggers.set(namespace, {
          enabled: this.isEnabled(namespace),
          color: this.getColor(namespace)
        });
      }
      const config2 = this.loggers.get(namespace);
      const logger = (message, ...args) => {
        this.log(namespace, "debug", message, ...args);
      };
      logger.debug = (message, ...args) => {
        this.log(namespace, "debug", message, ...args);
      };
      logger.warn = (message, ...args) => {
        this.log(namespace, "warn", message, ...args);
      };
      logger.error = (message, ...args) => {
        this.log(namespace, "error", message, ...args);
      };
      logger.namespace = namespace;
      Object.defineProperty(logger, "enabled", {
        get: () => config2.enabled
      });
      return logger;
    }
    // Update patterns when environment changes
    refresh() {
      this.updatePatterns();
    }
  }
  const manager = new LoggerManager();
  function createLogger(namespace) {
    return manager.createLogger(namespace);
  }
  createLogger.refresh = () => manager.refresh();
  const sample_spec = { "max_tokens": "LEGACY parameter. set to max_output_tokens if provider specifies it. IF not set to max_input_tokens, if provider specifies it.", "max_input_tokens": "max input tokens, if the provider specifies it. if not default to max_tokens", "max_output_tokens": "max output tokens, if the provider specifies it. if not default to max_tokens", "input_cost_per_token": 0, "output_cost_per_token": 0, "output_cost_per_reasoning_token": 0, "litellm_provider": "one of https://docs.litellm.ai/docs/providers", "mode": "one of: chat, embedding, completion, image_generation, audio_transcription, audio_speech, image_generation, moderation, rerank", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_audio_input": true, "supports_audio_output": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_system_messages": true, "supports_reasoning": true, "supports_web_search": true, "search_context_cost_per_query": { "search_context_size_low": 0, "search_context_size_medium": 0, "search_context_size_high": 0 }, "supported_regions": ["global", "us-west-2", "eu-west-1", "ap-southeast-1", "ap-northeast-1"], "deprecation_date": "date when the model becomes deprecated in the format YYYY-MM-DD" };
  const o1 = { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "cache_read_input_token_cost": 75e-7, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true };
  const o3 = { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "cache_read_input_token_cost": 5e-7, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true, "supported_endpoints": ["/v1/responses", "/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"] };
  const multimodalembedding = { "max_tokens": 2048, "max_input_tokens": 2048, "output_vector_size": 768, "input_cost_per_character": 2e-7, "input_cost_per_image": 1e-4, "input_cost_per_video_per_second": 5e-4, "input_cost_per_video_per_second_above_8s_interval": 1e-3, "input_cost_per_video_per_second_above_15s_interval": 2e-3, "input_cost_per_token": 8e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "supported_endpoints": ["/v1/embeddings"], "supported_modalities": ["text", "image", "video"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models" };
  const command = { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 1e-6, "output_cost_per_token": 2e-6, "litellm_provider": "cohere", "mode": "completion" };
  const dolphin = { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 5e-7, "output_cost_per_token": 5e-7, "litellm_provider": "nlp_cloud", "mode": "completion" };
  const chatdolphin = { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 5e-7, "output_cost_per_token": 5e-7, "litellm_provider": "nlp_cloud", "mode": "chat" };
  const data = {
    sample_spec,
    "omni-moderation-latest": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 0, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "openai", "mode": "moderation" },
    "omni-moderation-latest-intents": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 0, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "openai", "mode": "moderation" },
    "omni-moderation-2024-09-26": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 0, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "openai", "mode": "moderation" },
    "gpt-4": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 3e-5, "output_cost_per_token": 6e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4.1": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "input_cost_per_token_batches": 1e-6, "output_cost_per_token_batches": 4e-6, "cache_read_input_token_cost": 5e-7, "litellm_provider": "openai", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true },
    "gpt-4.1-2025-04-14": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "input_cost_per_token_batches": 1e-6, "output_cost_per_token_batches": 4e-6, "cache_read_input_token_cost": 5e-7, "litellm_provider": "openai", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true },
    "gpt-4.1-mini": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 4e-7, "output_cost_per_token": 16e-7, "input_cost_per_token_batches": 2e-7, "output_cost_per_token_batches": 8e-7, "cache_read_input_token_cost": 1e-7, "litellm_provider": "openai", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true },
    "gpt-4.1-mini-2025-04-14": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 4e-7, "output_cost_per_token": 16e-7, "input_cost_per_token_batches": 2e-7, "output_cost_per_token_batches": 8e-7, "cache_read_input_token_cost": 1e-7, "litellm_provider": "openai", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true },
    "gpt-4.1-nano": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "input_cost_per_token_batches": 5e-8, "output_cost_per_token_batches": 2e-7, "cache_read_input_token_cost": 25e-9, "litellm_provider": "openai", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true },
    "gpt-4.1-nano-2025-04-14": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "input_cost_per_token_batches": 5e-8, "output_cost_per_token_batches": 2e-7, "cache_read_input_token_cost": 25e-9, "litellm_provider": "openai", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true },
    "gpt-4o": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "input_cost_per_token_batches": 125e-8, "output_cost_per_token_batches": 5e-6, "cache_read_input_token_cost": 125e-8, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "watsonx/ibm/granite-3-8b-instruct": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 2e-4, "output_cost_per_token": 2e-4, "litellm_provider": "watsonx", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_parallel_function_calling": false, "supports_vision": false, "supports_audio_input": false, "supports_audio_output": false, "supports_prompt_caching": true, "supports_response_schema": true, "supports_system_messages": true },
    "gpt-4o-search-preview-2025-03-11": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "input_cost_per_token_batches": 125e-8, "output_cost_per_token_batches": 5e-6, "cache_read_input_token_cost": 125e-8, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-search-preview": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "input_cost_per_token_batches": 125e-8, "output_cost_per_token_batches": 5e-6, "cache_read_input_token_cost": 125e-8, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_web_search": true, "search_context_cost_per_query": { "search_context_size_low": 0.03, "search_context_size_medium": 0.035, "search_context_size_high": 0.05 } },
    "gpt-4.5-preview": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 75e-6, "output_cost_per_token": 15e-5, "input_cost_per_token_batches": 375e-7, "output_cost_per_token_batches": 75e-6, "cache_read_input_token_cost": 375e-7, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4.5-preview-2025-02-27": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 75e-6, "output_cost_per_token": 15e-5, "input_cost_per_token_batches": 375e-7, "output_cost_per_token_batches": 75e-6, "cache_read_input_token_cost": 375e-7, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "deprecation_date": "2025-07-14" },
    "gpt-4o-audio-preview": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "input_cost_per_audio_token": 1e-4, "output_cost_per_token": 1e-5, "output_cost_per_audio_token": 2e-4, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-audio-preview-2024-12-17": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "input_cost_per_audio_token": 4e-5, "output_cost_per_token": 1e-5, "output_cost_per_audio_token": 8e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-audio-preview-2024-10-01": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "input_cost_per_audio_token": 1e-4, "output_cost_per_token": 1e-5, "output_cost_per_audio_token": 2e-4, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-audio-preview-2025-06-03": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "input_cost_per_audio_token": 4e-5, "output_cost_per_token": 1e-5, "output_cost_per_audio_token": 8e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-mini-audio-preview": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "input_cost_per_audio_token": 1e-5, "output_cost_per_token": 6e-7, "output_cost_per_audio_token": 2e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-mini-audio-preview-2024-12-17": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "input_cost_per_audio_token": 1e-5, "output_cost_per_token": 6e-7, "output_cost_per_audio_token": 2e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-mini": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "input_cost_per_token_batches": 75e-9, "output_cost_per_token_batches": 3e-7, "cache_read_input_token_cost": 75e-9, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-mini-search-preview-2025-03-11": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "input_cost_per_token_batches": 75e-9, "output_cost_per_token_batches": 3e-7, "cache_read_input_token_cost": 75e-9, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-mini-search-preview": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "input_cost_per_token_batches": 75e-9, "output_cost_per_token_batches": 3e-7, "cache_read_input_token_cost": 75e-9, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_web_search": true, "search_context_cost_per_query": { "search_context_size_low": 0.025, "search_context_size_medium": 0.0275, "search_context_size_high": 0.03 } },
    "gpt-4o-mini-2024-07-18": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "input_cost_per_token_batches": 75e-9, "output_cost_per_token_batches": 3e-7, "cache_read_input_token_cost": 75e-9, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "search_context_cost_per_query": { "search_context_size_low": 30, "search_context_size_medium": 35, "search_context_size_high": 50 } },
    "codex-mini-latest": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 15e-7, "output_cost_per_token": 6e-6, "cache_read_input_token_cost": 375e-9, "litellm_provider": "openai", "mode": "responses", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supported_endpoints": ["/v1/responses"] },
    "o1-pro": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 15e-5, "output_cost_per_token": 6e-4, "input_cost_per_token_batches": 75e-6, "output_cost_per_token_batches": 3e-4, "litellm_provider": "openai", "mode": "responses", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_native_streaming": false, "supports_reasoning": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supported_endpoints": ["/v1/responses", "/v1/batch"] },
    "o1-pro-2025-03-19": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 15e-5, "output_cost_per_token": 6e-4, "input_cost_per_token_batches": 75e-6, "output_cost_per_token_batches": 3e-4, "litellm_provider": "openai", "mode": "responses", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_native_streaming": false, "supports_reasoning": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supported_endpoints": ["/v1/responses", "/v1/batch"] },
    o1,
    "o1-mini": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 55e-8, "litellm_provider": "openai", "mode": "chat", "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true },
    "computer-use-preview": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 3e-6, "output_cost_per_token": 12e-6, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": false, "supports_system_messages": true, "supports_tool_choice": true, "supports_reasoning": true },
    "o3-pro": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 2e-5, "input_cost_per_token_batches": 1e-5, "output_cost_per_token_batches": 4e-5, "output_cost_per_token": 8e-5, "litellm_provider": "openai", "mode": "responses", "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true, "supported_endpoints": ["/v1/responses", "/v1/batch"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"] },
    "o3-pro-2025-06-10": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 2e-5, "input_cost_per_token_batches": 1e-5, "output_cost_per_token_batches": 4e-5, "output_cost_per_token": 8e-5, "litellm_provider": "openai", "mode": "responses", "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true, "supported_endpoints": ["/v1/responses", "/v1/batch"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"] },
    o3,
    "o3-2025-04-16": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "cache_read_input_token_cost": 5e-7, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true, "supported_endpoints": ["/v1/responses", "/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"] },
    "o3-mini": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 55e-8, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": false, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "o3-mini-2025-01-31": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 55e-8, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": false, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "o4-mini": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 275e-9, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "o4-mini-2025-04-16": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 275e-9, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "o1-mini-2024-09-12": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 3e-6, "output_cost_per_token": 12e-6, "cache_read_input_token_cost": 15e-7, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_vision": true, "supports_reasoning": true, "supports_prompt_caching": true },
    "o1-preview": { "max_tokens": 32768, "max_input_tokens": 128e3, "max_output_tokens": 32768, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "cache_read_input_token_cost": 75e-7, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_vision": true, "supports_reasoning": true, "supports_prompt_caching": true },
    "o1-preview-2024-09-12": { "max_tokens": 32768, "max_input_tokens": 128e3, "max_output_tokens": 32768, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "cache_read_input_token_cost": 75e-7, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_vision": true, "supports_reasoning": true, "supports_prompt_caching": true },
    "o1-2024-12-17": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "cache_read_input_token_cost": 75e-7, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "chatgpt-4o-latest": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-6, "output_cost_per_token": 15e-6, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-2024-05-13": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-6, "output_cost_per_token": 15e-6, "input_cost_per_token_batches": 25e-7, "output_cost_per_token_batches": 75e-7, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-2024-08-06": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "input_cost_per_token_batches": 125e-8, "output_cost_per_token_batches": 5e-6, "cache_read_input_token_cost": 125e-8, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-2024-11-20": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "input_cost_per_token_batches": 125e-8, "output_cost_per_token_batches": 5e-6, "cache_read_input_token_cost": 125e-8, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-realtime-preview-2024-10-01": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-6, "input_cost_per_audio_token": 1e-4, "cache_read_input_token_cost": 25e-7, "cache_creation_input_audio_token_cost": 2e-5, "output_cost_per_token": 2e-5, "output_cost_per_audio_token": 2e-4, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-realtime-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-6, "input_cost_per_audio_token": 4e-5, "cache_read_input_token_cost": 25e-7, "output_cost_per_token": 2e-5, "output_cost_per_audio_token": 8e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-realtime-preview-2024-12-17": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-6, "input_cost_per_audio_token": 4e-5, "cache_read_input_token_cost": 25e-7, "output_cost_per_token": 2e-5, "output_cost_per_audio_token": 8e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-mini-realtime-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 6e-7, "input_cost_per_audio_token": 1e-5, "cache_read_input_token_cost": 3e-7, "cache_creation_input_audio_token_cost": 3e-7, "output_cost_per_token": 24e-7, "output_cost_per_audio_token": 2e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4o-mini-realtime-preview-2024-12-17": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 6e-7, "input_cost_per_audio_token": 1e-5, "cache_read_input_token_cost": 3e-7, "cache_creation_input_audio_token_cost": 3e-7, "output_cost_per_token": 24e-7, "output_cost_per_audio_token": 2e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-turbo-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-0314": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 3e-5, "output_cost_per_token": 6e-5, "litellm_provider": "openai", "mode": "chat", "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-0613": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 3e-5, "output_cost_per_token": 6e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_prompt_caching": true, "supports_system_messages": true, "deprecation_date": "2025-06-06", "supports_tool_choice": true },
    "gpt-4-32k": { "max_tokens": 4096, "max_input_tokens": 32768, "max_output_tokens": 4096, "input_cost_per_token": 6e-5, "output_cost_per_token": 12e-5, "litellm_provider": "openai", "mode": "chat", "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-32k-0314": { "max_tokens": 4096, "max_input_tokens": 32768, "max_output_tokens": 4096, "input_cost_per_token": 6e-5, "output_cost_per_token": 12e-5, "litellm_provider": "openai", "mode": "chat", "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-32k-0613": { "max_tokens": 4096, "max_input_tokens": 32768, "max_output_tokens": 4096, "input_cost_per_token": 6e-5, "output_cost_per_token": 12e-5, "litellm_provider": "openai", "mode": "chat", "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-turbo": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-turbo-2024-04-09": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-1106-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-0125-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-4-vision-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "openai", "mode": "chat", "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_system_messages": true, "deprecation_date": "2024-12-06", "supports_tool_choice": true },
    "gpt-4-1106-vision-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "openai", "mode": "chat", "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_system_messages": true, "deprecation_date": "2024-12-06", "supports_tool_choice": true },
    "gpt-3.5-turbo": { "max_tokens": 4097, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-3.5-turbo-0301": { "max_tokens": 4097, "max_input_tokens": 4097, "max_output_tokens": 4096, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "openai", "mode": "chat", "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-3.5-turbo-0613": { "max_tokens": 4097, "max_input_tokens": 4097, "max_output_tokens": 4096, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-3.5-turbo-1106": { "max_tokens": 16385, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 1e-6, "output_cost_per_token": 2e-6, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-3.5-turbo-0125": { "max_tokens": 16385, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-3.5-turbo-16k": { "max_tokens": 16385, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 4e-6, "litellm_provider": "openai", "mode": "chat", "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "gpt-3.5-turbo-16k-0613": { "max_tokens": 16385, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 4e-6, "litellm_provider": "openai", "mode": "chat", "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "ft:gpt-3.5-turbo": { "max_tokens": 4096, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 6e-6, "input_cost_per_token_batches": 15e-7, "output_cost_per_token_batches": 3e-6, "litellm_provider": "openai", "mode": "chat", "supports_system_messages": true, "supports_tool_choice": true },
    "ft:gpt-3.5-turbo-0125": { "max_tokens": 4096, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 6e-6, "litellm_provider": "openai", "mode": "chat", "supports_system_messages": true, "supports_tool_choice": true },
    "ft:gpt-3.5-turbo-1106": { "max_tokens": 4096, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 6e-6, "litellm_provider": "openai", "mode": "chat", "supports_system_messages": true, "supports_tool_choice": true },
    "ft:gpt-3.5-turbo-0613": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 6e-6, "litellm_provider": "openai", "mode": "chat", "supports_system_messages": true, "supports_tool_choice": true },
    "ft:gpt-4-0613": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 3e-5, "output_cost_per_token": 6e-5, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "source": "OpenAI needs to add pricing for this ft model, will be updated when added by OpenAI. Defaulting to base model pricing", "supports_system_messages": true, "supports_tool_choice": true },
    "ft:gpt-4o-2024-08-06": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 375e-8, "output_cost_per_token": 15e-6, "input_cost_per_token_batches": 1875e-9, "output_cost_per_token_batches": 75e-7, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_system_messages": true, "supports_tool_choice": true },
    "ft:gpt-4o-2024-11-20": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 375e-8, "cache_creation_input_token_cost": 1875e-9, "output_cost_per_token": 15e-6, "litellm_provider": "openai", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "ft:gpt-4o-mini-2024-07-18": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 3e-7, "output_cost_per_token": 12e-7, "input_cost_per_token_batches": 15e-8, "output_cost_per_token_batches": 6e-7, "cache_read_input_token_cost": 15e-8, "litellm_provider": "openai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "ft:davinci-002": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 4096, "input_cost_per_token": 2e-6, "output_cost_per_token": 2e-6, "input_cost_per_token_batches": 1e-6, "output_cost_per_token_batches": 1e-6, "litellm_provider": "text-completion-openai", "mode": "completion" },
    "ft:babbage-002": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 4096, "input_cost_per_token": 4e-7, "output_cost_per_token": 4e-7, "input_cost_per_token_batches": 2e-7, "output_cost_per_token_batches": 2e-7, "litellm_provider": "text-completion-openai", "mode": "completion" },
    "text-embedding-3-large": { "max_tokens": 8191, "max_input_tokens": 8191, "output_vector_size": 3072, "input_cost_per_token": 13e-8, "output_cost_per_token": 0, "input_cost_per_token_batches": 65e-9, "output_cost_per_token_batches": 0, "litellm_provider": "openai", "mode": "embedding" },
    "text-embedding-3-small": { "max_tokens": 8191, "max_input_tokens": 8191, "output_vector_size": 1536, "input_cost_per_token": 2e-8, "output_cost_per_token": 0, "input_cost_per_token_batches": 1e-8, "output_cost_per_token_batches": 0, "litellm_provider": "openai", "mode": "embedding" },
    "text-embedding-ada-002": { "max_tokens": 8191, "max_input_tokens": 8191, "output_vector_size": 1536, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "openai", "mode": "embedding" },
    "text-embedding-ada-002-v2": { "max_tokens": 8191, "max_input_tokens": 8191, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "input_cost_per_token_batches": 5e-8, "output_cost_per_token_batches": 0, "litellm_provider": "openai", "mode": "embedding" },
    "text-moderation-stable": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 0, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "openai", "mode": "moderation" },
    "text-moderation-007": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 0, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "openai", "mode": "moderation" },
    "text-moderation-latest": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 0, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "openai", "mode": "moderation" },
    "256-x-256/dall-e-2": { "mode": "image_generation", "input_cost_per_pixel": 24414e-11, "output_cost_per_pixel": 0, "litellm_provider": "openai" },
    "512-x-512/dall-e-2": { "mode": "image_generation", "input_cost_per_pixel": 686e-10, "output_cost_per_pixel": 0, "litellm_provider": "openai" },
    "1024-x-1024/dall-e-2": { "mode": "image_generation", "input_cost_per_pixel": 19e-9, "output_cost_per_pixel": 0, "litellm_provider": "openai" },
    "hd/1024-x-1792/dall-e-3": { "mode": "image_generation", "input_cost_per_pixel": 6539e-11, "output_cost_per_pixel": 0, "litellm_provider": "openai" },
    "hd/1792-x-1024/dall-e-3": { "mode": "image_generation", "input_cost_per_pixel": 6539e-11, "output_cost_per_pixel": 0, "litellm_provider": "openai" },
    "hd/1024-x-1024/dall-e-3": { "mode": "image_generation", "input_cost_per_pixel": 7629e-11, "output_cost_per_pixel": 0, "litellm_provider": "openai" },
    "standard/1024-x-1792/dall-e-3": { "mode": "image_generation", "input_cost_per_pixel": 4359e-11, "output_cost_per_pixel": 0, "litellm_provider": "openai" },
    "standard/1792-x-1024/dall-e-3": { "mode": "image_generation", "input_cost_per_pixel": 4359e-11, "output_cost_per_pixel": 0, "litellm_provider": "openai" },
    "standard/1024-x-1024/dall-e-3": { "mode": "image_generation", "input_cost_per_pixel": 381469e-13, "output_cost_per_pixel": 0, "litellm_provider": "openai" },
    "gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 40054321e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "low/1024-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 10490417e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "medium/1024-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 40054321e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "high/1024-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 159263611e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "low/1024-x-1536/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 10172526e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "medium/1024-x-1536/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 40054321e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "high/1024-x-1536/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 158945719e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "low/1536-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 10172526e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "medium/1536-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 40054321e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "high/1536-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 158945719e-15, "output_cost_per_pixel": 0, "litellm_provider": "openai", "supported_endpoints": ["/v1/images/generations"] },
    "gpt-4o-transcribe": { "mode": "audio_transcription", "max_input_tokens": 16e3, "max_output_tokens": 2e3, "input_cost_per_token": 25e-7, "input_cost_per_audio_token": 6e-6, "output_cost_per_token": 1e-5, "litellm_provider": "openai", "supported_endpoints": ["/v1/audio/transcriptions"] },
    "gpt-4o-mini-transcribe": { "mode": "audio_transcription", "max_input_tokens": 16e3, "max_output_tokens": 2e3, "input_cost_per_token": 125e-8, "input_cost_per_audio_token": 3e-6, "output_cost_per_token": 5e-6, "litellm_provider": "openai", "supported_endpoints": ["/v1/audio/transcriptions"] },
    "whisper-1": { "mode": "audio_transcription", "input_cost_per_second": 1e-4, "output_cost_per_second": 1e-4, "litellm_provider": "openai", "supported_endpoints": ["/v1/audio/transcriptions"] },
    "tts-1": { "mode": "audio_speech", "input_cost_per_character": 15e-6, "litellm_provider": "openai", "supported_endpoints": ["/v1/audio/speech"] },
    "tts-1-hd": { "mode": "audio_speech", "input_cost_per_character": 3e-5, "litellm_provider": "openai", "supported_endpoints": ["/v1/audio/speech"] },
    "gpt-4o-mini-tts": { "mode": "audio_speech", "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_audio_token": 12e-6, "output_cost_per_second": 25e-5, "litellm_provider": "openai", "supported_modalities": ["text", "audio"], "supported_output_modalities": ["audio"], "supported_endpoints": ["/v1/audio/speech"] },
    "azure/gpt-4o-mini-tts": { "mode": "audio_speech", "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_audio_token": 12e-6, "output_cost_per_second": 25e-5, "litellm_provider": "azure", "supported_modalities": ["text", "audio"], "supported_output_modalities": ["audio"], "supported_endpoints": ["/v1/audio/speech"] },
    "azure/computer-use-preview": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 3e-6, "output_cost_per_token": 12e-6, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": false, "supports_system_messages": true, "supports_tool_choice": true, "supports_reasoning": true },
    "azure/gpt-4o-audio-preview-2024-12-17": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "input_cost_per_audio_token": 4e-5, "output_cost_per_token": 1e-5, "output_cost_per_audio_token": 8e-5, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions"], "supported_modalities": ["text", "audio"], "supported_output_modalities": ["text", "audio"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": false, "supports_vision": false, "supports_prompt_caching": false, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true, "supports_reasoning": false },
    "azure/gpt-4o-mini-audio-preview-2024-12-17": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "input_cost_per_audio_token": 4e-5, "output_cost_per_token": 1e-5, "output_cost_per_audio_token": 8e-5, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions"], "supported_modalities": ["text", "audio"], "supported_output_modalities": ["text", "audio"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": false, "supports_vision": false, "supports_prompt_caching": false, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true, "supports_reasoning": false },
    "azure/gpt-4.1": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "input_cost_per_token_batches": 1e-6, "output_cost_per_token_batches": 4e-6, "cache_read_input_token_cost": 5e-7, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true, "supports_web_search": true, "search_context_cost_per_query": { "search_context_size_low": 0.03, "search_context_size_medium": 0.035, "search_context_size_high": 0.05 } },
    "azure/gpt-4.1-2025-04-14": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "input_cost_per_token_batches": 1e-6, "output_cost_per_token_batches": 4e-6, "cache_read_input_token_cost": 5e-7, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true, "supports_web_search": true, "search_context_cost_per_query": { "search_context_size_low": 0.03, "search_context_size_medium": 0.035, "search_context_size_high": 0.05 } },
    "azure/gpt-4.1-mini": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 4e-7, "output_cost_per_token": 16e-7, "input_cost_per_token_batches": 2e-7, "output_cost_per_token_batches": 8e-7, "cache_read_input_token_cost": 1e-7, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true, "supports_web_search": true, "search_context_cost_per_query": { "search_context_size_low": 0.025, "search_context_size_medium": 0.0275, "search_context_size_high": 0.03 } },
    "azure/gpt-4.1-mini-2025-04-14": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 4e-7, "output_cost_per_token": 16e-7, "input_cost_per_token_batches": 2e-7, "output_cost_per_token_batches": 8e-7, "cache_read_input_token_cost": 1e-7, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true, "supports_web_search": true, "search_context_cost_per_query": { "search_context_size_low": 0.025, "search_context_size_medium": 0.0275, "search_context_size_high": 0.03 } },
    "azure/gpt-4.1-nano": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "input_cost_per_token_batches": 5e-8, "output_cost_per_token_batches": 2e-7, "cache_read_input_token_cost": 25e-9, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true },
    "azure/gpt-4.1-nano-2025-04-14": { "max_tokens": 32768, "max_input_tokens": 1047576, "max_output_tokens": 32768, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "input_cost_per_token_batches": 5e-8, "output_cost_per_token_batches": 2e-7, "cache_read_input_token_cost": 25e-9, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true, "supports_native_streaming": true },
    "azure/o3-pro": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 2e-5, "output_cost_per_token": 8e-5, "input_cost_per_token_batches": 1e-5, "output_cost_per_token_batches": 4e-5, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_prompt_caching": false, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "azure/o3-pro-2025-06-10": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 2e-5, "output_cost_per_token": 8e-5, "input_cost_per_token_batches": 1e-5, "output_cost_per_token_batches": 4e-5, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_prompt_caching": false, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "azure/o3": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "cache_read_input_token_cost": 5e-7, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "azure/o3-2025-04-16": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 1e-5, "output_cost_per_token": 4e-5, "cache_read_input_token_cost": 25e-7, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "azure/o4-mini": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 275e-9, "litellm_provider": "azure", "mode": "chat", "supported_endpoints": ["/v1/chat/completions", "/v1/batch", "/v1/responses"], "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "azure/gpt-4o-mini-realtime-preview-2024-12-17": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 6e-7, "input_cost_per_audio_token": 1e-5, "cache_read_input_token_cost": 3e-7, "cache_creation_input_audio_token_cost": 3e-7, "output_cost_per_token": 24e-7, "output_cost_per_audio_token": 2e-5, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/eu/gpt-4o-mini-realtime-preview-2024-12-17": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 66e-8, "input_cost_per_audio_token": 11e-6, "cache_read_input_token_cost": 33e-8, "cache_creation_input_audio_token_cost": 33e-8, "output_cost_per_token": 264e-8, "output_cost_per_audio_token": 22e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/us/gpt-4o-mini-realtime-preview-2024-12-17": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 66e-8, "input_cost_per_audio_token": 11e-6, "cache_read_input_token_cost": 33e-8, "cache_creation_input_audio_token_cost": 33e-8, "output_cost_per_token": 264e-8, "output_cost_per_audio_token": 22e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/gpt-4o-realtime-preview-2024-12-17": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-6, "input_cost_per_audio_token": 4e-5, "cache_read_input_token_cost": 25e-7, "output_cost_per_token": 2e-5, "output_cost_per_audio_token": 8e-5, "litellm_provider": "azure", "mode": "chat", "supported_modalities": ["text", "audio"], "supported_output_modalities": ["text", "audio"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/us/gpt-4o-realtime-preview-2024-12-17": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 55e-7, "input_cost_per_audio_token": 44e-6, "cache_read_input_token_cost": 275e-8, "cache_read_input_audio_token_cost": 25e-7, "output_cost_per_token": 22e-6, "output_cost_per_audio_token": 8e-5, "litellm_provider": "azure", "mode": "chat", "supported_modalities": ["text", "audio"], "supported_output_modalities": ["text", "audio"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/eu/gpt-4o-realtime-preview-2024-12-17": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 55e-7, "input_cost_per_audio_token": 44e-6, "cache_read_input_token_cost": 275e-8, "cache_read_input_audio_token_cost": 25e-7, "output_cost_per_token": 22e-6, "output_cost_per_audio_token": 8e-5, "litellm_provider": "azure", "mode": "chat", "supported_modalities": ["text", "audio"], "supported_output_modalities": ["text", "audio"], "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/gpt-4o-realtime-preview-2024-10-01": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-6, "input_cost_per_audio_token": 1e-4, "cache_read_input_token_cost": 25e-7, "cache_creation_input_audio_token_cost": 2e-5, "output_cost_per_token": 2e-5, "output_cost_per_audio_token": 2e-4, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/us/gpt-4o-realtime-preview-2024-10-01": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 55e-7, "input_cost_per_audio_token": 11e-5, "cache_read_input_token_cost": 275e-8, "cache_creation_input_audio_token_cost": 22e-6, "output_cost_per_token": 22e-6, "output_cost_per_audio_token": 22e-5, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/eu/gpt-4o-realtime-preview-2024-10-01": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 55e-7, "input_cost_per_audio_token": 11e-5, "cache_read_input_token_cost": 275e-8, "cache_creation_input_audio_token_cost": 22e-6, "output_cost_per_token": 22e-6, "output_cost_per_audio_token": 22e-5, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_audio_input": true, "supports_audio_output": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/o4-mini-2025-04-16": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 275e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": false, "supports_vision": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "azure/o3-mini-2025-01-31": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 55e-8, "litellm_provider": "azure", "mode": "chat", "supports_reasoning": true, "supports_vision": false, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/us/o3-mini-2025-01-31": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 121e-8, "input_cost_per_token_batches": 605e-9, "output_cost_per_token": 484e-8, "output_cost_per_token_batches": 242e-8, "cache_read_input_token_cost": 605e-9, "litellm_provider": "azure", "mode": "chat", "supports_vision": false, "supports_reasoning": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/eu/o3-mini-2025-01-31": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 121e-8, "input_cost_per_token_batches": 605e-9, "output_cost_per_token": 484e-8, "output_cost_per_token_batches": 242e-8, "cache_read_input_token_cost": 605e-9, "litellm_provider": "azure", "mode": "chat", "supports_vision": false, "supports_reasoning": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/tts-1": { "mode": "audio_speech", "input_cost_per_character": 15e-6, "litellm_provider": "azure" },
    "azure/tts-1-hd": { "mode": "audio_speech", "input_cost_per_character": 3e-5, "litellm_provider": "azure" },
    "azure/whisper-1": { "mode": "audio_transcription", "input_cost_per_second": 1e-4, "output_cost_per_second": 1e-4, "litellm_provider": "azure" },
    "azure/gpt-4o-transcribe": { "mode": "audio_transcription", "max_input_tokens": 16e3, "max_output_tokens": 2e3, "input_cost_per_token": 25e-7, "input_cost_per_audio_token": 6e-6, "output_cost_per_token": 1e-5, "litellm_provider": "azure", "supported_endpoints": ["/v1/audio/transcriptions"] },
    "azure/gpt-4o-mini-transcribe": { "mode": "audio_transcription", "max_input_tokens": 16e3, "max_output_tokens": 2e3, "input_cost_per_token": 125e-8, "input_cost_per_audio_token": 3e-6, "output_cost_per_token": 5e-6, "litellm_provider": "azure", "supported_endpoints": ["/v1/audio/transcriptions"] },
    "azure/o3-mini": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 55e-8, "litellm_provider": "azure", "mode": "chat", "supports_vision": false, "supports_prompt_caching": true, "supports_reasoning": true, "supports_response_schema": true, "supports_tool_choice": true },
    "azure/o1-mini": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 121e-8, "output_cost_per_token": 484e-8, "cache_read_input_token_cost": 605e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_reasoning": true, "supports_prompt_caching": true },
    "azure/o1-mini-2024-09-12": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "cache_read_input_token_cost": 55e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_reasoning": true, "supports_prompt_caching": true },
    "azure/us/o1-mini-2024-09-12": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 121e-8, "input_cost_per_token_batches": 605e-9, "output_cost_per_token": 484e-8, "output_cost_per_token_batches": 242e-8, "cache_read_input_token_cost": 605e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_prompt_caching": true },
    "azure/eu/o1-mini-2024-09-12": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 121e-8, "input_cost_per_token_batches": 605e-9, "output_cost_per_token": 484e-8, "output_cost_per_token_batches": 242e-8, "cache_read_input_token_cost": 605e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_prompt_caching": true },
    "azure/o1": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "cache_read_input_token_cost": 75e-7, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_reasoning": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/o1-2024-12-17": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "cache_read_input_token_cost": 75e-7, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_reasoning": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/us/o1-2024-12-17": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 165e-7, "output_cost_per_token": 66e-6, "cache_read_input_token_cost": 825e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/eu/o1-2024-12-17": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 165e-7, "output_cost_per_token": 66e-6, "cache_read_input_token_cost": 825e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/codex-mini": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 15e-7, "output_cost_per_token": 6e-6, "cache_read_input_token_cost": 375e-9, "litellm_provider": "azure", "mode": "responses", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"], "supported_endpoints": ["/v1/responses"] },
    "azure/o1-preview": { "max_tokens": 32768, "max_input_tokens": 128e3, "max_output_tokens": 32768, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "cache_read_input_token_cost": 75e-7, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_reasoning": true, "supports_prompt_caching": true },
    "azure/o1-preview-2024-09-12": { "max_tokens": 32768, "max_input_tokens": 128e3, "max_output_tokens": 32768, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "cache_read_input_token_cost": 75e-7, "litellm_provider": "azure", "mode": "chat", "supports_pdf_input": true, "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_reasoning": true, "supports_prompt_caching": true },
    "azure/us/o1-preview-2024-09-12": { "max_tokens": 32768, "max_input_tokens": 128e3, "max_output_tokens": 32768, "input_cost_per_token": 165e-7, "output_cost_per_token": 66e-6, "cache_read_input_token_cost": 825e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_prompt_caching": true },
    "azure/eu/o1-preview-2024-09-12": { "max_tokens": 32768, "max_input_tokens": 128e3, "max_output_tokens": 32768, "input_cost_per_token": 165e-7, "output_cost_per_token": 66e-6, "cache_read_input_token_cost": 825e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_prompt_caching": true },
    "azure/gpt-4.5-preview": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 75e-6, "output_cost_per_token": 15e-5, "input_cost_per_token_batches": 375e-7, "output_cost_per_token_batches": 75e-6, "cache_read_input_token_cost": 375e-7, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_tool_choice": true },
    "azure/gpt-4o": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "cache_read_input_token_cost": 125e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/global/gpt-4o-2024-11-20": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "cache_read_input_token_cost": 125e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/gpt-4o-2024-08-06": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "cache_read_input_token_cost": 125e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/global/gpt-4o-2024-08-06": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "cache_read_input_token_cost": 125e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/gpt-4o-2024-11-20": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 275e-8, "output_cost_per_token": 11e-6, "cache_read_input_token_cost": 125e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/us/gpt-4o-2024-11-20": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 275e-8, "cache_creation_input_token_cost": 138e-8, "output_cost_per_token": 11e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true },
    "azure/eu/gpt-4o-2024-11-20": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 275e-8, "cache_creation_input_token_cost": 138e-8, "output_cost_per_token": 11e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true },
    "azure/gpt-4o-2024-05-13": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-6, "output_cost_per_token": 15e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/global-standard/gpt-4o-2024-08-06": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "cache_read_input_token_cost": 125e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true, "deprecation_date": "2025-08-20" },
    "azure/us/gpt-4o-2024-08-06": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 275e-8, "output_cost_per_token": 11e-6, "cache_read_input_token_cost": 1375e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/eu/gpt-4o-2024-08-06": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 275e-8, "output_cost_per_token": 11e-6, "cache_read_input_token_cost": 1375e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/global-standard/gpt-4o-2024-11-20": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "cache_read_input_token_cost": 125e-8, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true, "deprecation_date": "2025-12-20" },
    "azure/global-standard/gpt-4o-mini": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true },
    "azure/gpt-4o-mini": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 165e-9, "output_cost_per_token": 66e-8, "cache_read_input_token_cost": 75e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/gpt-4o-mini-2024-07-18": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 165e-9, "output_cost_per_token": 66e-8, "cache_read_input_token_cost": 75e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/us/gpt-4o-mini-2024-07-18": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 165e-9, "output_cost_per_token": 66e-8, "cache_read_input_token_cost": 83e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/eu/gpt-4o-mini-2024-07-18": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 165e-9, "output_cost_per_token": 66e-8, "cache_read_input_token_cost": 83e-9, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "azure/gpt-4-turbo-2024-04-09": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "azure/gpt-4-0125-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_tool_choice": true },
    "azure/gpt-4-1106-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_tool_choice": true },
    "azure/gpt-4-0613": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 3e-5, "output_cost_per_token": 6e-5, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "azure/gpt-4-32k-0613": { "max_tokens": 4096, "max_input_tokens": 32768, "max_output_tokens": 4096, "input_cost_per_token": 6e-5, "output_cost_per_token": 12e-5, "litellm_provider": "azure", "mode": "chat", "supports_tool_choice": true },
    "azure/gpt-4-32k": { "max_tokens": 4096, "max_input_tokens": 32768, "max_output_tokens": 4096, "input_cost_per_token": 6e-5, "output_cost_per_token": 12e-5, "litellm_provider": "azure", "mode": "chat", "supports_tool_choice": true },
    "azure/gpt-4": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 3e-5, "output_cost_per_token": 6e-5, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "azure/gpt-4-turbo": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_tool_choice": true },
    "azure/gpt-4-turbo-vision-preview": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "litellm_provider": "azure", "mode": "chat", "supports_vision": true, "supports_tool_choice": true },
    "azure/gpt-35-turbo-16k-0613": { "max_tokens": 4096, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 4e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "azure/gpt-35-turbo-1106": { "max_tokens": 4096, "max_input_tokens": 16384, "max_output_tokens": 4096, "input_cost_per_token": 1e-6, "output_cost_per_token": 2e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "deprecation_date": "2025-03-31", "supports_tool_choice": true },
    "azure/gpt-35-turbo-0613": { "max_tokens": 4097, "max_input_tokens": 4097, "max_output_tokens": 4096, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "deprecation_date": "2025-02-13", "supports_tool_choice": true },
    "azure/gpt-35-turbo-0301": { "max_tokens": 4097, "max_input_tokens": 4097, "max_output_tokens": 4096, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "deprecation_date": "2025-02-13", "supports_tool_choice": true },
    "azure/gpt-35-turbo-0125": { "max_tokens": 4096, "max_input_tokens": 16384, "max_output_tokens": 4096, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "deprecation_date": "2025-05-31", "supports_tool_choice": true },
    "azure/gpt-3.5-turbo-0125": { "max_tokens": 4096, "max_input_tokens": 16384, "max_output_tokens": 4096, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "deprecation_date": "2025-03-31", "supports_tool_choice": true },
    "azure/gpt-35-turbo-16k": { "max_tokens": 4096, "max_input_tokens": 16385, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 4e-6, "litellm_provider": "azure", "mode": "chat", "supports_tool_choice": true },
    "azure/gpt-35-turbo": { "max_tokens": 4096, "max_input_tokens": 4097, "max_output_tokens": 4096, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "azure/gpt-3.5-turbo": { "max_tokens": 4096, "max_input_tokens": 4097, "max_output_tokens": 4096, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "azure/gpt-3.5-turbo-instruct-0914": { "max_tokens": 4097, "max_input_tokens": 4097, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "azure_text", "mode": "completion" },
    "azure/gpt-35-turbo-instruct": { "max_tokens": 4097, "max_input_tokens": 4097, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "azure_text", "mode": "completion" },
    "azure/gpt-35-turbo-instruct-0914": { "max_tokens": 4097, "max_input_tokens": 4097, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "azure_text", "mode": "completion" },
    "azure/mistral-large-latest": { "max_tokens": 32e3, "max_input_tokens": 32e3, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true },
    "azure/mistral-large-2402": { "max_tokens": 32e3, "max_input_tokens": 32e3, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true },
    "azure/command-r-plus": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "azure", "mode": "chat", "supports_function_calling": true },
    "azure/ada": { "max_tokens": 8191, "max_input_tokens": 8191, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "embedding" },
    "azure/text-embedding-ada-002": { "max_tokens": 8191, "max_input_tokens": 8191, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "embedding" },
    "azure/text-embedding-3-large": { "max_tokens": 8191, "max_input_tokens": 8191, "input_cost_per_token": 13e-8, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "embedding" },
    "azure/text-embedding-3-small": { "max_tokens": 8191, "max_input_tokens": 8191, "input_cost_per_token": 2e-8, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "embedding" },
    "azure/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 40054321e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/low/1024-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 10490417e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/medium/1024-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 40054321e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/high/1024-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 159263611e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/low/1024-x-1536/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 10172526e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/medium/1024-x-1536/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 40054321e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/high/1024-x-1536/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 158945719e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/low/1536-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 10172526e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/medium/1536-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 40054321e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/high/1536-x-1024/gpt-image-1": { "mode": "image_generation", "input_cost_per_pixel": 158945719e-15, "output_cost_per_pixel": 0, "litellm_provider": "azure", "supported_endpoints": ["/v1/images/generations"] },
    "azure/standard/1024-x-1024/dall-e-3": { "input_cost_per_pixel": 381469e-13, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "image_generation" },
    "azure/hd/1024-x-1024/dall-e-3": { "input_cost_per_pixel": 7629e-11, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "image_generation" },
    "azure/standard/1024-x-1792/dall-e-3": { "input_cost_per_pixel": 4359e-11, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "image_generation" },
    "azure/standard/1792-x-1024/dall-e-3": { "input_cost_per_pixel": 4359e-11, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "image_generation" },
    "azure/hd/1024-x-1792/dall-e-3": { "input_cost_per_pixel": 6539e-11, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "image_generation" },
    "azure/hd/1792-x-1024/dall-e-3": { "input_cost_per_pixel": 6539e-11, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "image_generation" },
    "azure/standard/1024-x-1024/dall-e-2": { "input_cost_per_pixel": 0, "output_cost_per_token": 0, "litellm_provider": "azure", "mode": "image_generation" },
    "azure_ai/deepseek-r1": { "max_tokens": 8192, "max_input_tokens": 128e3, "max_output_tokens": 8192, "input_cost_per_token": 135e-8, "output_cost_per_token": 54e-7, "litellm_provider": "azure_ai", "mode": "chat", "supports_tool_choice": true, "supports_reasoning": true, "source": "https://techcommunity.microsoft.com/blog/machinelearningblog/deepseek-r1-improved-performance-higher-limits-and-transparent-pricing/4386367" },
    "azure_ai/deepseek-v3": { "max_tokens": 8192, "max_input_tokens": 128e3, "max_output_tokens": 8192, "input_cost_per_token": 114e-8, "output_cost_per_token": 456e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_tool_choice": true, "source": "https://techcommunity.microsoft.com/blog/machinelearningblog/announcing-deepseek-v3-on-azure-ai-foundry-and-github/4390438" },
    "azure_ai/deepseek-v3-0324": { "max_tokens": 8192, "max_input_tokens": 128e3, "max_output_tokens": 8192, "input_cost_per_token": 114e-8, "output_cost_per_token": 456e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "source": "https://techcommunity.microsoft.com/blog/machinelearningblog/announcing-deepseek-v3-on-azure-ai-foundry-and-github/4390438" },
    "azure_ai/jamba-instruct": { "max_tokens": 4096, "max_input_tokens": 7e4, "max_output_tokens": 4096, "input_cost_per_token": 5e-7, "output_cost_per_token": 7e-7, "litellm_provider": "azure_ai", "mode": "chat", "supports_tool_choice": true },
    "azure_ai/mistral-nemo": { "max_tokens": 4096, "max_input_tokens": 131072, "max_output_tokens": 4096, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_function_calling": true, "source": "https://azuremarketplace.microsoft.com/en/marketplace/apps/000-000.mistral-nemo-12b-2407?tab=PlansAndPrice" },
    "azure_ai/mistral-medium-2505": { "max_tokens": 8191, "max_input_tokens": 131072, "max_output_tokens": 8191, "input_cost_per_token": 4e-7, "output_cost_per_token": 2e-6, "litellm_provider": "azure_ai", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "azure_ai/mistral-large": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 4e-6, "output_cost_per_token": 12e-6, "litellm_provider": "azure_ai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "azure_ai/mistral-small": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 1e-6, "output_cost_per_token": 3e-6, "litellm_provider": "azure_ai", "supports_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "azure_ai/mistral-small-2503": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 1e-6, "output_cost_per_token": 3e-6, "litellm_provider": "azure_ai", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "azure_ai/mistral-large-2407": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "azure_ai", "supports_function_calling": true, "mode": "chat", "source": "https://azuremarketplace.microsoft.com/en/marketplace/apps/000-000.mistral-ai-large-2407-offer?tab=Overview", "supports_tool_choice": true },
    "azure_ai/mistral-large-latest": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "azure_ai", "supports_function_calling": true, "mode": "chat", "source": "https://azuremarketplace.microsoft.com/en/marketplace/apps/000-000.mistral-ai-large-2407-offer?tab=Overview", "supports_tool_choice": true },
    "azure_ai/ministral-3b": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 4e-8, "output_cost_per_token": 4e-8, "litellm_provider": "azure_ai", "supports_function_calling": true, "mode": "chat", "source": "https://azuremarketplace.microsoft.com/en/marketplace/apps/000-000.ministral-3b-2410-offer?tab=Overview", "supports_tool_choice": true },
    "azure_ai/Llama-3.2-11B-Vision-Instruct": { "max_tokens": 2048, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 37e-8, "output_cost_per_token": 37e-8, "litellm_provider": "azure_ai", "supports_function_calling": true, "supports_vision": true, "mode": "chat", "source": "https://azuremarketplace.microsoft.com/en/marketplace/apps/metagenai.meta-llama-3-2-11b-vision-instruct-offer?tab=Overview", "supports_tool_choice": true },
    "azure_ai/Llama-3.3-70B-Instruct": { "max_tokens": 2048, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 71e-8, "output_cost_per_token": 71e-8, "litellm_provider": "azure_ai", "supports_function_calling": true, "mode": "chat", "source": "https://azuremarketplace.microsoft.com/en/marketplace/apps/metagenai.llama-3-3-70b-instruct-offer?tab=Overview", "supports_tool_choice": true },
    "azure_ai/Llama-4-Scout-17B-16E-Instruct": { "max_tokens": 16384, "max_input_tokens": 1e7, "max_output_tokens": 16384, "input_cost_per_token": 2e-7, "output_cost_per_token": 78e-8, "litellm_provider": "azure_ai", "supports_function_calling": true, "supports_vision": true, "mode": "chat", "source": "https://azure.microsoft.com/en-us/blog/introducing-the-llama-4-herd-in-azure-ai-foundry-and-azure-databricks/", "supports_tool_choice": true },
    "azure_ai/Llama-4-Maverick-17B-128E-Instruct-FP8": { "max_tokens": 16384, "max_input_tokens": 1e6, "max_output_tokens": 16384, "input_cost_per_token": 141e-8, "output_cost_per_token": 35e-8, "litellm_provider": "azure_ai", "supports_function_calling": true, "supports_vision": true, "mode": "chat", "source": "https://azure.microsoft.com/en-us/blog/introducing-the-llama-4-herd-in-azure-ai-foundry-and-azure-databricks/", "supports_tool_choice": true },
    "azure_ai/Llama-3.2-90B-Vision-Instruct": { "max_tokens": 2048, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 204e-8, "output_cost_per_token": 204e-8, "litellm_provider": "azure_ai", "supports_function_calling": true, "supports_vision": true, "mode": "chat", "source": "https://azuremarketplace.microsoft.com/en/marketplace/apps/metagenai.meta-llama-3-2-90b-vision-instruct-offer?tab=Overview", "supports_tool_choice": true },
    "azure_ai/Meta-Llama-3-70B-Instruct": { "max_tokens": 2048, "max_input_tokens": 8192, "max_output_tokens": 2048, "input_cost_per_token": 11e-7, "output_cost_per_token": 37e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_tool_choice": true },
    "azure_ai/Meta-Llama-3.1-8B-Instruct": { "max_tokens": 2048, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 3e-7, "output_cost_per_token": 61e-8, "litellm_provider": "azure_ai", "mode": "chat", "source": "https://azuremarketplace.microsoft.com/en-us/marketplace/apps/metagenai.meta-llama-3-1-8b-instruct-offer?tab=PlansAndPrice", "supports_tool_choice": true },
    "azure_ai/Meta-Llama-3.1-70B-Instruct": { "max_tokens": 2048, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 268e-8, "output_cost_per_token": 354e-8, "litellm_provider": "azure_ai", "mode": "chat", "source": "https://azuremarketplace.microsoft.com/en-us/marketplace/apps/metagenai.meta-llama-3-1-70b-instruct-offer?tab=PlansAndPrice", "supports_tool_choice": true },
    "azure_ai/Meta-Llama-3.1-405B-Instruct": { "max_tokens": 2048, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 533e-8, "output_cost_per_token": 16e-6, "litellm_provider": "azure_ai", "mode": "chat", "source": "https://azuremarketplace.microsoft.com/en-us/marketplace/apps/metagenai.meta-llama-3-1-405b-instruct-offer?tab=PlansAndPrice", "supports_tool_choice": true },
    "azure_ai/Phi-4-mini-instruct": { "max_tokens": 4096, "max_input_tokens": 131072, "max_output_tokens": 4096, "input_cost_per_token": 75e-9, "output_cost_per_token": 3e-7, "litellm_provider": "azure_ai", "mode": "chat", "supports_function_calling": true, "source": "https://techcommunity.microsoft.com/blog/Azure-AI-Services-blog/announcing-new-phi-pricing-empowering-your-business-with-small-language-models/4395112" },
    "azure_ai/Phi-4-multimodal-instruct": { "max_tokens": 4096, "max_input_tokens": 131072, "max_output_tokens": 4096, "input_cost_per_token": 8e-8, "input_cost_per_audio_token": 4e-6, "output_cost_per_token": 32e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_audio_input": true, "supports_function_calling": true, "supports_vision": true, "source": "https://techcommunity.microsoft.com/blog/Azure-AI-Services-blog/announcing-new-phi-pricing-empowering-your-business-with-small-language-models/4395112" },
    "azure_ai/Phi-4": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 125e-9, "output_cost_per_token": 5e-7, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": false, "source": "https://techcommunity.microsoft.com/blog/machinelearningblog/affordable-innovation-unveiling-the-pricing-of-phi-3-slms-on-models-as-a-service/4156495", "supports_function_calling": true, "supports_tool_choice": true },
    "azure_ai/Phi-3.5-mini-instruct": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 13e-8, "output_cost_per_token": 52e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": false, "source": "https://azure.microsoft.com/en-us/pricing/details/phi-3/", "supports_tool_choice": true },
    "azure_ai/Phi-3.5-vision-instruct": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 13e-8, "output_cost_per_token": 52e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": true, "source": "https://azure.microsoft.com/en-us/pricing/details/phi-3/", "supports_tool_choice": true },
    "azure_ai/Phi-3.5-MoE-instruct": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 16e-8, "output_cost_per_token": 64e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": false, "source": "https://azure.microsoft.com/en-us/pricing/details/phi-3/", "supports_tool_choice": true },
    "azure_ai/Phi-3-mini-4k-instruct": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 13e-8, "output_cost_per_token": 52e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": false, "source": "https://azure.microsoft.com/en-us/pricing/details/phi-3/", "supports_tool_choice": true },
    "azure_ai/Phi-3-mini-128k-instruct": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 13e-8, "output_cost_per_token": 52e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": false, "source": "https://azure.microsoft.com/en-us/pricing/details/phi-3/", "supports_tool_choice": true },
    "azure_ai/Phi-3-small-8k-instruct": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": false, "source": "https://azure.microsoft.com/en-us/pricing/details/phi-3/", "supports_tool_choice": true },
    "azure_ai/Phi-3-small-128k-instruct": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": false, "source": "https://azure.microsoft.com/en-us/pricing/details/phi-3/", "supports_tool_choice": true },
    "azure_ai/Phi-3-medium-4k-instruct": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 17e-8, "output_cost_per_token": 68e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": false, "source": "https://azure.microsoft.com/en-us/pricing/details/phi-3/", "supports_tool_choice": true },
    "azure_ai/Phi-3-medium-128k-instruct": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 17e-8, "output_cost_per_token": 68e-8, "litellm_provider": "azure_ai", "mode": "chat", "supports_vision": false, "source": "https://azure.microsoft.com/en-us/pricing/details/phi-3/", "supports_tool_choice": true },
    "azure_ai/cohere-rerank-v3-multilingual": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "max_query_tokens": 2048, "input_cost_per_token": 0, "input_cost_per_query": 2e-3, "output_cost_per_token": 0, "litellm_provider": "azure_ai", "mode": "rerank" },
    "azure_ai/cohere-rerank-v3-english": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "max_query_tokens": 2048, "input_cost_per_token": 0, "input_cost_per_query": 2e-3, "output_cost_per_token": 0, "litellm_provider": "azure_ai", "mode": "rerank" },
    "azure_ai/Cohere-embed-v3-english": { "max_tokens": 512, "max_input_tokens": 512, "output_vector_size": 1024, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "azure_ai", "mode": "embedding", "supports_embedding_image_input": true, "source": "https://azuremarketplace.microsoft.com/en-us/marketplace/apps/cohere.cohere-embed-v3-english-offer?tab=PlansAndPrice" },
    "azure_ai/Cohere-embed-v3-multilingual": { "max_tokens": 512, "max_input_tokens": 512, "output_vector_size": 1024, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "azure_ai", "mode": "embedding", "supports_embedding_image_input": true, "source": "https://azuremarketplace.microsoft.com/en-us/marketplace/apps/cohere.cohere-embed-v3-english-offer?tab=PlansAndPrice" },
    "azure_ai/embed-v-4-0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "output_vector_size": 3072, "input_cost_per_token": 12e-8, "output_cost_per_token": 0, "litellm_provider": "azure_ai", "mode": "embedding", "supports_embedding_image_input": true, "supported_endpoints": ["/v1/embeddings"], "supported_modalities": ["text", "image"], "source": "https://azuremarketplace.microsoft.com/pt-br/marketplace/apps/cohere.cohere-embed-4-offer?tab=PlansAndPrice" },
    "babbage-002": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 4096, "input_cost_per_token": 4e-7, "output_cost_per_token": 4e-7, "litellm_provider": "text-completion-openai", "mode": "completion" },
    "davinci-002": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 4096, "input_cost_per_token": 2e-6, "output_cost_per_token": 2e-6, "litellm_provider": "text-completion-openai", "mode": "completion" },
    "gpt-3.5-turbo-instruct": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "text-completion-openai", "mode": "completion" },
    "gpt-3.5-turbo-instruct-0914": { "max_tokens": 4097, "max_input_tokens": 8192, "max_output_tokens": 4097, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "text-completion-openai", "mode": "completion" },
    "claude-instant-1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 163e-8, "output_cost_per_token": 551e-8, "litellm_provider": "anthropic", "mode": "chat" },
    "mistral/mistral-tiny": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 25e-8, "output_cost_per_token": 25e-8, "litellm_provider": "mistral", "mode": "chat", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-small": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 1e-7, "output_cost_per_token": 3e-7, "litellm_provider": "mistral", "supports_function_calling": true, "mode": "chat", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-small-latest": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 1e-7, "output_cost_per_token": 3e-7, "litellm_provider": "mistral", "supports_function_calling": true, "mode": "chat", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-medium": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 27e-7, "output_cost_per_token": 81e-7, "litellm_provider": "mistral", "mode": "chat", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-medium-latest": { "max_tokens": 8191, "max_input_tokens": 131072, "max_output_tokens": 8191, "input_cost_per_token": 4e-7, "output_cost_per_token": 2e-6, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-medium-2505": { "max_tokens": 8191, "max_input_tokens": 131072, "max_output_tokens": 8191, "input_cost_per_token": 4e-7, "output_cost_per_token": 2e-6, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-medium-2312": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 27e-7, "output_cost_per_token": 81e-7, "litellm_provider": "mistral", "mode": "chat", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-large-latest": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-large-2411": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-large-2402": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 4e-6, "output_cost_per_token": 12e-6, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/mistral-large-2407": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 9e-6, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/pixtral-large-latest": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_vision": true, "supports_tool_choice": true },
    "mistral/pixtral-large-2411": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_vision": true, "supports_tool_choice": true },
    "mistral/pixtral-12b-2409": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_vision": true, "supports_tool_choice": true },
    "mistral/open-mistral-7b": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 25e-8, "output_cost_per_token": 25e-8, "litellm_provider": "mistral", "mode": "chat", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/open-mixtral-8x7b": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 7e-7, "output_cost_per_token": 7e-7, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/open-mixtral-8x22b": { "max_tokens": 8191, "max_input_tokens": 65336, "max_output_tokens": 8191, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "mistral", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/codestral-latest": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 1e-6, "output_cost_per_token": 3e-6, "litellm_provider": "mistral", "mode": "chat", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/codestral-2405": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 1e-6, "output_cost_per_token": 3e-6, "litellm_provider": "mistral", "mode": "chat", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/open-mistral-nemo": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 3e-7, "output_cost_per_token": 3e-7, "litellm_provider": "mistral", "mode": "chat", "source": "https://mistral.ai/technology/", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/open-mistral-nemo-2407": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 3e-7, "output_cost_per_token": 3e-7, "litellm_provider": "mistral", "mode": "chat", "source": "https://mistral.ai/technology/", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/open-codestral-mamba": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 25e-8, "output_cost_per_token": 25e-8, "litellm_provider": "mistral", "mode": "chat", "source": "https://mistral.ai/technology/", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/codestral-mamba-latest": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 25e-8, "output_cost_per_token": 25e-8, "litellm_provider": "mistral", "mode": "chat", "source": "https://mistral.ai/technology/", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/devstral-small-2505": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 1e-7, "output_cost_per_token": 3e-7, "litellm_provider": "mistral", "mode": "chat", "source": "https://mistral.ai/news/devstral", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "mistral/magistral-medium-latest": { "max_tokens": 4e4, "max_input_tokens": 4e4, "max_output_tokens": 4e4, "input_cost_per_token": 2e-6, "output_cost_per_token": 5e-6, "litellm_provider": "mistral", "mode": "chat", "source": "https://mistral.ai/news/magistral", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true, "supports_reasoning": true },
    "mistral/magistral-medium-2506": { "max_tokens": 4e4, "max_input_tokens": 4e4, "max_output_tokens": 4e4, "input_cost_per_token": 2e-6, "output_cost_per_token": 5e-6, "litellm_provider": "mistral", "mode": "chat", "source": "https://mistral.ai/news/magistral", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true, "supports_reasoning": true },
    "mistral/magistral-small-latest": { "max_tokens": 4e4, "max_input_tokens": 4e4, "max_output_tokens": 4e4, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "litellm_provider": "mistral", "mode": "chat", "source": "https://mistral.ai/pricing#api-pricing", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true, "supports_reasoning": true },
    "mistral/magistral-small-2506": { "max_tokens": 4e4, "max_input_tokens": 4e4, "max_output_tokens": 4e4, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "litellm_provider": "mistral", "mode": "chat", "source": "https://mistral.ai/pricing#api-pricing", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true, "supports_reasoning": true },
    "mistral/mistral-embed": { "max_tokens": 8192, "max_input_tokens": 8192, "input_cost_per_token": 1e-7, "litellm_provider": "mistral", "mode": "embedding" },
    "deepseek/deepseek-reasoner": { "max_tokens": 8192, "max_input_tokens": 65536, "max_output_tokens": 8192, "input_cost_per_token": 55e-8, "input_cost_per_token_cache_hit": 14e-8, "output_cost_per_token": 219e-8, "litellm_provider": "deepseek", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_prompt_caching": true },
    "deepseek/deepseek-chat": { "max_tokens": 8192, "max_input_tokens": 65536, "max_output_tokens": 8192, "input_cost_per_token": 27e-8, "input_cost_per_token_cache_hit": 7e-8, "cache_read_input_token_cost": 7e-8, "cache_creation_input_token_cost": 0, "output_cost_per_token": 11e-7, "litellm_provider": "deepseek", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true, "supports_prompt_caching": true },
    "codestral/codestral-latest": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "codestral", "mode": "chat", "source": "https://docs.mistral.ai/capabilities/code_generation/", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "codestral/codestral-2405": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "codestral", "mode": "chat", "source": "https://docs.mistral.ai/capabilities/code_generation/", "supports_assistant_prefill": true, "supports_tool_choice": true },
    "text-completion-codestral/codestral-latest": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "text-completion-codestral", "mode": "completion", "source": "https://docs.mistral.ai/capabilities/code_generation/" },
    "text-completion-codestral/codestral-2405": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "text-completion-codestral", "mode": "completion", "source": "https://docs.mistral.ai/capabilities/code_generation/" },
    "xai/grok-beta": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 5e-6, "output_cost_per_token": 15e-6, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_web_search": true },
    "xai/grok-2-vision-1212": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 2e-6, "input_cost_per_image": 2e-6, "output_cost_per_token": 1e-5, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_web_search": true },
    "xai/grok-2-vision-latest": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 2e-6, "input_cost_per_image": 2e-6, "output_cost_per_token": 1e-5, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_web_search": true },
    "xai/grok-2-vision": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 2e-6, "input_cost_per_image": 2e-6, "output_cost_per_token": 1e-5, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_web_search": true },
    "xai/grok-3": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-latest": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-beta": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-fast-beta": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 5e-6, "output_cost_per_token": 25e-6, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-fast-latest": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 5e-6, "output_cost_per_token": 25e-6, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-mini": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 3e-7, "output_cost_per_token": 5e-7, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-mini-latest": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 3e-7, "output_cost_per_token": 5e-7, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-mini-fast": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 6e-7, "output_cost_per_token": 4e-6, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-mini-fast-latest": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 6e-7, "output_cost_per_token": 4e-6, "litellm_provider": "xai", "mode": "chat", "supports_reasoning": true, "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-mini-beta": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 3e-7, "output_cost_per_token": 5e-7, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-3-mini-fast-beta": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 6e-7, "output_cost_per_token": 4e-6, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_response_schema": false, "source": "https://x.ai/api#pricing", "supports_web_search": true },
    "xai/grok-vision-beta": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 5e-6, "input_cost_per_image": 5e-6, "output_cost_per_token": 15e-6, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_web_search": true },
    "xai/grok-2-1212": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 2e-6, "output_cost_per_token": 1e-5, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_web_search": true },
    "xai/grok-2": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 2e-6, "output_cost_per_token": 1e-5, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_web_search": true },
    "xai/grok-2-latest": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 2e-6, "output_cost_per_token": 1e-5, "litellm_provider": "xai", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_web_search": true },
    "deepseek/deepseek-coder": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 14e-8, "input_cost_per_token_cache_hit": 14e-9, "output_cost_per_token": 28e-8, "litellm_provider": "deepseek", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_tool_choice": true, "supports_prompt_caching": true },
    "groq/deepseek-r1-distill-llama-70b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 75e-8, "output_cost_per_token": 99e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "groq/llama-3.3-70b-versatile": { "max_tokens": 32768, "max_input_tokens": 128e3, "max_output_tokens": 32768, "input_cost_per_token": 59e-8, "output_cost_per_token": 79e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true },
    "groq/llama-3.3-70b-specdec": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 59e-8, "output_cost_per_token": 99e-8, "litellm_provider": "groq", "mode": "chat", "supports_tool_choice": true, "deprecation_date": "2025-04-14" },
    "groq/llama-guard-3-8b": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "groq", "mode": "chat" },
    "groq/llama2-70b-4096": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 7e-7, "output_cost_per_token": 8e-7, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true },
    "groq/llama3-8b-8192": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 5e-8, "output_cost_per_token": 8e-8, "litellm_provider": "groq", "mode": "chat", "supports_tool_choice": true },
    "groq/llama-3.2-1b-preview": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 4e-8, "output_cost_per_token": 4e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "deprecation_date": "2025-04-14" },
    "groq/llama-3.2-3b-preview": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 6e-8, "output_cost_per_token": 6e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "deprecation_date": "2025-04-14" },
    "groq/llama-3.2-11b-text-preview": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 18e-8, "output_cost_per_token": 18e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "deprecation_date": "2024-10-28" },
    "groq/llama-3.2-11b-vision-preview": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 18e-8, "output_cost_per_token": 18e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true, "deprecation_date": "2025-04-14" },
    "groq/llama-3.2-90b-text-preview": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "deprecation_date": "2024-11-25" },
    "groq/llama-3.2-90b-vision-preview": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true, "deprecation_date": "2025-04-14" },
    "groq/llama3-70b-8192": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 59e-8, "output_cost_per_token": 79e-8, "litellm_provider": "groq", "mode": "chat", "supports_response_schema": true, "supports_tool_choice": true },
    "groq/llama-3.1-8b-instant": { "max_tokens": 8192, "max_input_tokens": 128e3, "max_output_tokens": 8192, "input_cost_per_token": 5e-8, "output_cost_per_token": 8e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true },
    "groq/llama-3.1-70b-versatile": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 59e-8, "output_cost_per_token": 79e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "deprecation_date": "2025-01-24" },
    "groq/llama-3.1-405b-reasoning": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 59e-8, "output_cost_per_token": 79e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true },
    "groq/meta-llama/llama-4-scout-17b-16e-instruct": { "max_tokens": 8192, "max_input_tokens": 131072, "max_output_tokens": 8192, "input_cost_per_token": 11e-8, "output_cost_per_token": 34e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true },
    "groq/meta-llama/llama-4-maverick-17b-128e-instruct": { "max_tokens": 8192, "max_input_tokens": 131072, "max_output_tokens": 8192, "input_cost_per_token": 2e-7, "output_cost_per_token": 6e-7, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true },
    "groq/mistral-saba-24b": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 32e3, "input_cost_per_token": 79e-8, "output_cost_per_token": 79e-8, "litellm_provider": "groq", "mode": "chat" },
    "groq/mixtral-8x7b-32768": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 24e-8, "output_cost_per_token": 24e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "deprecation_date": "2025-03-20" },
    "groq/gemma-7b-it": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 7e-8, "output_cost_per_token": 7e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "deprecation_date": "2024-12-18" },
    "groq/gemma2-9b-it": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": false, "supports_response_schema": true, "supports_tool_choice": false },
    "groq/llama3-groq-70b-8192-tool-use-preview": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 89e-8, "output_cost_per_token": 89e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "deprecation_date": "2025-01-06" },
    "groq/llama3-groq-8b-8192-tool-use-preview": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 19e-8, "output_cost_per_token": 19e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "deprecation_date": "2025-01-06" },
    "groq/qwen-qwq-32b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 29e-8, "output_cost_per_token": 39e-8, "litellm_provider": "groq", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_reasoning": true, "supports_tool_choice": true },
    "groq/playai-tts": { "max_tokens": 1e4, "max_input_tokens": 1e4, "max_output_tokens": 1e4, "input_cost_per_character": 5e-5, "litellm_provider": "groq", "mode": "audio_speech" },
    "groq/whisper-large-v3": { "input_cost_per_second": 3083e-8, "output_cost_per_second": 0, "litellm_provider": "groq", "mode": "audio_transcription" },
    "groq/whisper-large-v3-turbo": { "input_cost_per_second": 1111e-8, "output_cost_per_second": 0, "litellm_provider": "groq", "mode": "audio_transcription" },
    "groq/distil-whisper-large-v3-en": { "input_cost_per_second": 556e-8, "output_cost_per_second": 0, "litellm_provider": "groq", "mode": "audio_transcription" },
    "cerebras/llama3.1-8b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 1e-7, "output_cost_per_token": 1e-7, "litellm_provider": "cerebras", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "cerebras/llama3.1-70b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 6e-7, "output_cost_per_token": 6e-7, "litellm_provider": "cerebras", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "cerebras/llama-3.3-70b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 85e-8, "output_cost_per_token": 12e-7, "litellm_provider": "cerebras", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "cerebras/qwen-3-32b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 4e-7, "output_cost_per_token": 8e-7, "litellm_provider": "cerebras", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "source": "https://inference-docs.cerebras.ai/support/pricing" },
    "friendliai/meta-llama-3.1-8b-instruct": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 1e-7, "output_cost_per_token": 1e-7, "litellm_provider": "friendliai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_system_messages": true, "supports_response_schema": true, "supports_tool_choice": true },
    "friendliai/meta-llama-3.1-70b-instruct": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 6e-7, "output_cost_per_token": 6e-7, "litellm_provider": "friendliai", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_system_messages": true, "supports_response_schema": true, "supports_tool_choice": true },
    "claude-instant-1.2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 163e-9, "output_cost_per_token": 551e-9, "litellm_provider": "anthropic", "mode": "chat", "supports_tool_choice": true },
    "claude-2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "anthropic", "mode": "chat" },
    "claude-2.1": { "max_tokens": 8191, "max_input_tokens": 2e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "anthropic", "mode": "chat", "supports_tool_choice": true },
    "claude-3-haiku-20240307": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "cache_creation_input_token_cost": 3e-7, "cache_read_input_token_cost": 3e-8, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 264, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-03-01", "supports_tool_choice": true },
    "claude-3-5-haiku-20241022": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 8e-7, "output_cost_per_token": 4e-6, "cache_creation_input_token_cost": 1e-6, "cache_read_input_token_cost": 8e-8, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 264, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-10-01", "supports_tool_choice": true, "supports_web_search": true },
    "claude-3-5-haiku-latest": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 1e-6, "output_cost_per_token": 5e-6, "cache_creation_input_token_cost": 125e-8, "cache_read_input_token_cost": 1e-7, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 264, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-10-01", "supports_tool_choice": true, "supports_web_search": true },
    "claude-3-opus-latest": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "cache_creation_input_token_cost": 1875e-8, "cache_read_input_token_cost": 15e-7, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 395, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-03-01", "supports_tool_choice": true },
    "claude-3-opus-20240229": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "cache_creation_input_token_cost": 1875e-8, "cache_read_input_token_cost": 15e-7, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 395, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-03-01", "supports_tool_choice": true },
    "claude-3-sonnet-20240229": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-07-21", "supports_tool_choice": true },
    "claude-3-5-sonnet-latest": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-06-01", "supports_tool_choice": true, "supports_web_search": true },
    "claude-3-5-sonnet-20240620": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-06-01", "supports_tool_choice": true },
    "claude-opus-4-20250514": { "max_tokens": 32e3, "max_input_tokens": 2e5, "max_output_tokens": 32e3, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 1875e-8, "cache_read_input_token_cost": 15e-7, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "claude-sonnet-4-20250514": { "max_tokens": 64e3, "max_input_tokens": 2e5, "max_output_tokens": 64e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "claude-4-opus-20250514": { "max_tokens": 32e3, "max_input_tokens": 2e5, "max_output_tokens": 32e3, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 1875e-8, "cache_read_input_token_cost": 15e-7, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "claude-4-sonnet-20250514": { "max_tokens": 64e3, "max_input_tokens": 2e5, "max_output_tokens": 64e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "claude-3-7-sonnet-latest": { "supports_computer_use": true, "max_tokens": 128e3, "max_input_tokens": 2e5, "max_output_tokens": 128e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-06-01", "supports_tool_choice": true, "supports_reasoning": true },
    "claude-3-7-sonnet-20250219": { "supports_computer_use": true, "max_tokens": 128e3, "max_input_tokens": 2e5, "max_output_tokens": 128e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2026-02-01", "supports_tool_choice": true, "supports_reasoning": true, "supports_web_search": true },
    "claude-3-5-sonnet-20241022": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "litellm_provider": "anthropic", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-10-01", "supports_tool_choice": true, "supports_web_search": true },
    "text-bison": { "max_tokens": 2048, "max_input_tokens": 8192, "max_output_tokens": 2048, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "text-bison@001": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "text-bison@002": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "text-bison32k": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "text-bison32k@002": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "text-unicorn": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 1e-5, "output_cost_per_token": 28e-6, "litellm_provider": "vertex_ai-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "text-unicorn@001": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 1e-5, "output_cost_per_token": 28e-6, "litellm_provider": "vertex_ai-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "chat-bison": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "chat-bison@001": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "chat-bison@002": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "deprecation_date": "2025-04-09", "supports_tool_choice": true },
    "chat-bison-32k": { "max_tokens": 8192, "max_input_tokens": 32e3, "max_output_tokens": 8192, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "chat-bison-32k@002": { "max_tokens": 8192, "max_input_tokens": 32e3, "max_output_tokens": 8192, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "code-bison": { "max_tokens": 1024, "max_input_tokens": 6144, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-text-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "code-bison@001": { "max_tokens": 1024, "max_input_tokens": 6144, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "code-bison@002": { "max_tokens": 1024, "max_input_tokens": 6144, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "code-bison32k": { "max_tokens": 1024, "max_input_tokens": 6144, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "code-bison-32k@002": { "max_tokens": 1024, "max_input_tokens": 6144, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "code-gecko@001": { "max_tokens": 64, "max_input_tokens": 2048, "max_output_tokens": 64, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "vertex_ai-code-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "code-gecko@002": { "max_tokens": 64, "max_input_tokens": 2048, "max_output_tokens": 64, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "vertex_ai-code-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "code-gecko": { "max_tokens": 64, "max_input_tokens": 2048, "max_output_tokens": 64, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "vertex_ai-code-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "code-gecko-latest": { "max_tokens": 64, "max_input_tokens": 2048, "max_output_tokens": 64, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "vertex_ai-code-text-models", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "codechat-bison@latest": { "max_tokens": 1024, "max_input_tokens": 6144, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "codechat-bison": { "max_tokens": 1024, "max_input_tokens": 6144, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "codechat-bison@001": { "max_tokens": 1024, "max_input_tokens": 6144, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "codechat-bison@002": { "max_tokens": 1024, "max_input_tokens": 6144, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "codechat-bison-32k": { "max_tokens": 8192, "max_input_tokens": 32e3, "max_output_tokens": 8192, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "codechat-bison-32k@002": { "max_tokens": 8192, "max_input_tokens": 32e3, "max_output_tokens": 8192, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "input_cost_per_character": 25e-8, "output_cost_per_character": 5e-7, "litellm_provider": "vertex_ai-code-chat-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "meta_llama/Llama-4-Scout-17B-16E-Instruct-FP8": { "max_tokens": 128e3, "max_input_tokens": 1e7, "max_output_tokens": 4028, "litellm_provider": "meta_llama", "mode": "chat", "supports_function_calling": true, "source": "https://llama.developer.meta.com/docs/models", "supports_tool_choice": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"] },
    "meta_llama/Llama-4-Maverick-17B-128E-Instruct-FP8": { "max_tokens": 128e3, "max_input_tokens": 1e6, "max_output_tokens": 4028, "litellm_provider": "meta_llama", "mode": "chat", "supports_function_calling": true, "source": "https://llama.developer.meta.com/docs/models", "supports_tool_choice": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text"] },
    "meta_llama/Llama-3.3-70B-Instruct": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4028, "litellm_provider": "meta_llama", "mode": "chat", "supports_function_calling": true, "source": "https://llama.developer.meta.com/docs/models", "supports_tool_choice": true, "supported_modalities": ["text"], "supported_output_modalities": ["text"] },
    "meta_llama/Llama-3.3-8B-Instruct": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4028, "litellm_provider": "meta_llama", "mode": "chat", "supports_function_calling": true, "source": "https://llama.developer.meta.com/docs/models", "supports_tool_choice": true, "supported_modalities": ["text"], "supported_output_modalities": ["text"] },
    "gemini-pro": { "max_tokens": 8192, "max_input_tokens": 32760, "max_output_tokens": 8192, "input_cost_per_image": 25e-4, "input_cost_per_video_per_second": 2e-3, "input_cost_per_token": 5e-7, "input_cost_per_character": 125e-9, "output_cost_per_token": 15e-7, "output_cost_per_character": 375e-9, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing", "supports_tool_choice": true },
    "gemini-1.0-pro": { "max_tokens": 8192, "max_input_tokens": 32760, "max_output_tokens": 8192, "input_cost_per_image": 25e-4, "input_cost_per_video_per_second": 2e-3, "input_cost_per_token": 5e-7, "input_cost_per_character": 125e-9, "output_cost_per_token": 15e-7, "output_cost_per_character": 375e-9, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing#google_models", "supports_tool_choice": true },
    "gemini-1.0-pro-001": { "max_tokens": 8192, "max_input_tokens": 32760, "max_output_tokens": 8192, "input_cost_per_image": 25e-4, "input_cost_per_video_per_second": 2e-3, "input_cost_per_token": 5e-7, "input_cost_per_character": 125e-9, "output_cost_per_token": 15e-7, "output_cost_per_character": 375e-9, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_function_calling": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "deprecation_date": "2025-04-09", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.0-ultra": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 2048, "input_cost_per_image": 25e-4, "input_cost_per_video_per_second": 2e-3, "input_cost_per_token": 5e-7, "input_cost_per_character": 125e-9, "output_cost_per_token": 15e-7, "output_cost_per_character": 375e-9, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_function_calling": true, "source": "As of Jun, 2024. There is no available doc on vertex ai pricing gemini-1.0-ultra-001. Using gemini-1.0-pro pricing. Got max_tokens info here: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.0-ultra-001": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 2048, "input_cost_per_image": 25e-4, "input_cost_per_video_per_second": 2e-3, "input_cost_per_token": 5e-7, "input_cost_per_character": 125e-9, "output_cost_per_token": 15e-7, "output_cost_per_character": 375e-9, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_function_calling": true, "source": "As of Jun, 2024. There is no available doc on vertex ai pricing gemini-1.0-ultra-001. Using gemini-1.0-pro pricing. Got max_tokens info here: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.0-pro-002": { "max_tokens": 8192, "max_input_tokens": 32760, "max_output_tokens": 8192, "input_cost_per_image": 25e-4, "input_cost_per_video_per_second": 2e-3, "input_cost_per_token": 5e-7, "input_cost_per_character": 125e-9, "output_cost_per_token": 15e-7, "output_cost_per_character": 375e-9, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_function_calling": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "deprecation_date": "2025-04-09", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.5-pro": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "input_cost_per_image": 32875e-8, "input_cost_per_audio_per_second": 3125e-8, "input_cost_per_video_per_second": 32875e-8, "input_cost_per_token": 125e-8, "input_cost_per_character": 3125e-10, "input_cost_per_image_above_128k_tokens": 6575e-7, "input_cost_per_video_per_second_above_128k_tokens": 6575e-7, "input_cost_per_audio_per_second_above_128k_tokens": 625e-7, "input_cost_per_token_above_128k_tokens": 25e-7, "input_cost_per_character_above_128k_tokens": 625e-9, "output_cost_per_token": 5e-6, "output_cost_per_character": 125e-8, "output_cost_per_token_above_128k_tokens": 1e-5, "output_cost_per_character_above_128k_tokens": 25e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_vision": true, "supports_pdf_input": true, "supports_system_messages": true, "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_parallel_function_calling": true },
    "gemini-1.5-pro-002": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "input_cost_per_image": 32875e-8, "input_cost_per_audio_per_second": 3125e-8, "input_cost_per_video_per_second": 32875e-8, "input_cost_per_token": 125e-8, "input_cost_per_character": 3125e-10, "input_cost_per_image_above_128k_tokens": 6575e-7, "input_cost_per_video_per_second_above_128k_tokens": 6575e-7, "input_cost_per_audio_per_second_above_128k_tokens": 625e-7, "input_cost_per_token_above_128k_tokens": 25e-7, "input_cost_per_character_above_128k_tokens": 625e-9, "output_cost_per_token": 5e-6, "output_cost_per_character": 125e-8, "output_cost_per_token_above_128k_tokens": 1e-5, "output_cost_per_character_above_128k_tokens": 25e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_vision": true, "supports_system_messages": true, "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-1.5-pro", "deprecation_date": "2025-09-24", "supports_parallel_function_calling": true },
    "gemini-1.5-pro-001": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "input_cost_per_image": 32875e-8, "input_cost_per_audio_per_second": 3125e-8, "input_cost_per_video_per_second": 32875e-8, "input_cost_per_token": 125e-8, "input_cost_per_character": 3125e-10, "input_cost_per_image_above_128k_tokens": 6575e-7, "input_cost_per_video_per_second_above_128k_tokens": 6575e-7, "input_cost_per_audio_per_second_above_128k_tokens": 625e-7, "input_cost_per_token_above_128k_tokens": 25e-7, "input_cost_per_character_above_128k_tokens": 625e-9, "output_cost_per_token": 5e-6, "output_cost_per_character": 125e-8, "output_cost_per_token_above_128k_tokens": 1e-5, "output_cost_per_character_above_128k_tokens": 25e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_vision": true, "supports_system_messages": true, "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "deprecation_date": "2025-05-24", "supports_parallel_function_calling": true },
    "gemini-1.5-pro-preview-0514": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "input_cost_per_image": 32875e-8, "input_cost_per_audio_per_second": 3125e-8, "input_cost_per_video_per_second": 32875e-8, "input_cost_per_token": 78125e-12, "input_cost_per_character": 3125e-10, "input_cost_per_image_above_128k_tokens": 6575e-7, "input_cost_per_video_per_second_above_128k_tokens": 6575e-7, "input_cost_per_audio_per_second_above_128k_tokens": 625e-7, "input_cost_per_token_above_128k_tokens": 15625e-11, "input_cost_per_character_above_128k_tokens": 625e-9, "output_cost_per_token": 3125e-10, "output_cost_per_character": 125e-8, "output_cost_per_token_above_128k_tokens": 625e-9, "output_cost_per_character_above_128k_tokens": 25e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_parallel_function_calling": true },
    "gemini-1.5-pro-preview-0215": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "input_cost_per_image": 32875e-8, "input_cost_per_audio_per_second": 3125e-8, "input_cost_per_video_per_second": 32875e-8, "input_cost_per_token": 78125e-12, "input_cost_per_character": 3125e-10, "input_cost_per_image_above_128k_tokens": 6575e-7, "input_cost_per_video_per_second_above_128k_tokens": 6575e-7, "input_cost_per_audio_per_second_above_128k_tokens": 625e-7, "input_cost_per_token_above_128k_tokens": 15625e-11, "input_cost_per_character_above_128k_tokens": 625e-9, "output_cost_per_token": 3125e-10, "output_cost_per_character": 125e-8, "output_cost_per_token_above_128k_tokens": 625e-9, "output_cost_per_character_above_128k_tokens": 25e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_parallel_function_calling": true },
    "gemini-1.5-pro-preview-0409": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "input_cost_per_image": 32875e-8, "input_cost_per_audio_per_second": 3125e-8, "input_cost_per_video_per_second": 32875e-8, "input_cost_per_token": 78125e-12, "input_cost_per_character": 3125e-10, "input_cost_per_image_above_128k_tokens": 6575e-7, "input_cost_per_video_per_second_above_128k_tokens": 6575e-7, "input_cost_per_audio_per_second_above_128k_tokens": 625e-7, "input_cost_per_token_above_128k_tokens": 15625e-11, "input_cost_per_character_above_128k_tokens": 625e-9, "output_cost_per_token": 3125e-10, "output_cost_per_character": 125e-8, "output_cost_per_token_above_128k_tokens": 625e-9, "output_cost_per_character_above_128k_tokens": 25e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_parallel_function_calling": true },
    "gemini-1.5-flash": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 2e-5, "input_cost_per_video_per_second": 2e-5, "input_cost_per_audio_per_second": 2e-6, "input_cost_per_token": 75e-9, "input_cost_per_character": 1875e-11, "input_cost_per_token_above_128k_tokens": 1e-6, "input_cost_per_character_above_128k_tokens": 25e-8, "input_cost_per_image_above_128k_tokens": 4e-5, "input_cost_per_video_per_second_above_128k_tokens": 4e-5, "input_cost_per_audio_per_second_above_128k_tokens": 4e-6, "output_cost_per_token": 3e-7, "output_cost_per_character": 75e-9, "output_cost_per_token_above_128k_tokens": 6e-7, "output_cost_per_character_above_128k_tokens": 15e-8, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.5-flash-exp-0827": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 2e-5, "input_cost_per_video_per_second": 2e-5, "input_cost_per_audio_per_second": 2e-6, "input_cost_per_token": 4688e-12, "input_cost_per_character": 1875e-11, "input_cost_per_token_above_128k_tokens": 1e-6, "input_cost_per_character_above_128k_tokens": 25e-8, "input_cost_per_image_above_128k_tokens": 4e-5, "input_cost_per_video_per_second_above_128k_tokens": 4e-5, "input_cost_per_audio_per_second_above_128k_tokens": 4e-6, "output_cost_per_token": 46875e-13, "output_cost_per_character": 1875e-11, "output_cost_per_token_above_128k_tokens": 9375e-12, "output_cost_per_character_above_128k_tokens": 375e-10, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.5-flash-002": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 2e-5, "input_cost_per_video_per_second": 2e-5, "input_cost_per_audio_per_second": 2e-6, "input_cost_per_token": 75e-9, "input_cost_per_character": 1875e-11, "input_cost_per_token_above_128k_tokens": 1e-6, "input_cost_per_character_above_128k_tokens": 25e-8, "input_cost_per_image_above_128k_tokens": 4e-5, "input_cost_per_video_per_second_above_128k_tokens": 4e-5, "input_cost_per_audio_per_second_above_128k_tokens": 4e-6, "output_cost_per_token": 3e-7, "output_cost_per_character": 75e-9, "output_cost_per_token_above_128k_tokens": 6e-7, "output_cost_per_character_above_128k_tokens": 15e-8, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-1.5-flash", "deprecation_date": "2025-09-24", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.5-flash-001": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 2e-5, "input_cost_per_video_per_second": 2e-5, "input_cost_per_audio_per_second": 2e-6, "input_cost_per_token": 75e-9, "input_cost_per_character": 1875e-11, "input_cost_per_token_above_128k_tokens": 1e-6, "input_cost_per_character_above_128k_tokens": 25e-8, "input_cost_per_image_above_128k_tokens": 4e-5, "input_cost_per_video_per_second_above_128k_tokens": 4e-5, "input_cost_per_audio_per_second_above_128k_tokens": 4e-6, "output_cost_per_token": 3e-7, "output_cost_per_character": 75e-9, "output_cost_per_token_above_128k_tokens": 6e-7, "output_cost_per_character_above_128k_tokens": 15e-8, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "deprecation_date": "2025-05-24", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.5-flash-preview-0514": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 2e-5, "input_cost_per_video_per_second": 2e-5, "input_cost_per_audio_per_second": 2e-6, "input_cost_per_token": 75e-9, "input_cost_per_character": 1875e-11, "input_cost_per_token_above_128k_tokens": 1e-6, "input_cost_per_character_above_128k_tokens": 25e-8, "input_cost_per_image_above_128k_tokens": 4e-5, "input_cost_per_video_per_second_above_128k_tokens": 4e-5, "input_cost_per_audio_per_second_above_128k_tokens": 4e-6, "output_cost_per_token": 46875e-13, "output_cost_per_character": 1875e-11, "output_cost_per_token_above_128k_tokens": 9375e-12, "output_cost_per_character_above_128k_tokens": 375e-10, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-pro-experimental": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "input_cost_per_character": 0, "output_cost_per_character": 0, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_function_calling": false, "supports_tool_choice": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/gemini-experimental", "supports_parallel_function_calling": true },
    "gemini-flash-experimental": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "input_cost_per_character": 0, "output_cost_per_character": 0, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_function_calling": false, "supports_tool_choice": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/gemini-experimental", "supports_parallel_function_calling": true },
    "gemini-pro-vision": { "max_tokens": 2048, "max_input_tokens": 16384, "max_output_tokens": 2048, "max_images_per_prompt": 16, "max_videos_per_prompt": 1, "max_video_length": 2, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "input_cost_per_image": 25e-4, "litellm_provider": "vertex_ai-vision-models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.0-pro-vision": { "max_tokens": 2048, "max_input_tokens": 16384, "max_output_tokens": 2048, "max_images_per_prompt": 16, "max_videos_per_prompt": 1, "max_video_length": 2, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "input_cost_per_image": 25e-4, "litellm_provider": "vertex_ai-vision-models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "gemini-1.0-pro-vision-001": { "max_tokens": 2048, "max_input_tokens": 16384, "max_output_tokens": 2048, "max_images_per_prompt": 16, "max_videos_per_prompt": 1, "max_video_length": 2, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "input_cost_per_image": 25e-4, "litellm_provider": "vertex_ai-vision-models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "deprecation_date": "2025-04-09", "supports_tool_choice": true, "supports_parallel_function_calling": true },
    "medlm-medium": { "max_tokens": 8192, "max_input_tokens": 32768, "max_output_tokens": 8192, "input_cost_per_character": 5e-7, "output_cost_per_character": 1e-6, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "medlm-large": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_character": 5e-6, "output_cost_per_character": 15e-6, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "gemini-2.5-pro-exp-03-25": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_audio_input": true, "supports_video_input": true, "supports_pdf_input": true, "supports_response_schema": true, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing", "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini-2.0-pro-exp-02-05": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_audio_input": true, "supports_video_input": true, "supports_pdf_input": true, "supports_response_schema": true, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing", "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini-2.0-flash-exp": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 0, "input_cost_per_video_per_second": 0, "input_cost_per_audio_per_second": 0, "input_cost_per_token": 15e-8, "input_cost_per_character": 0, "input_cost_per_token_above_128k_tokens": 0, "input_cost_per_character_above_128k_tokens": 0, "input_cost_per_image_above_128k_tokens": 0, "input_cost_per_video_per_second_above_128k_tokens": 0, "input_cost_per_audio_per_second_above_128k_tokens": 0, "output_cost_per_token": 6e-7, "output_cost_per_character": 0, "output_cost_per_token_above_128k_tokens": 0, "output_cost_per_character_above_128k_tokens": 0, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing", "supports_tool_choice": true, "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini-2.0-flash-001": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 1e-6, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supports_tool_choice": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing", "deprecation_date": "2026-02-05", "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini-2.0-flash-thinking-exp": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 0, "input_cost_per_video_per_second": 0, "input_cost_per_audio_per_second": 0, "input_cost_per_token": 0, "input_cost_per_character": 0, "input_cost_per_token_above_128k_tokens": 0, "input_cost_per_character_above_128k_tokens": 0, "input_cost_per_image_above_128k_tokens": 0, "input_cost_per_video_per_second_above_128k_tokens": 0, "input_cost_per_audio_per_second_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_character": 0, "output_cost_per_token_above_128k_tokens": 0, "output_cost_per_character_above_128k_tokens": 0, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-2.0-flash", "supports_tool_choice": true, "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini-2.0-flash-thinking-exp-01-21": { "max_tokens": 65536, "max_input_tokens": 1048576, "max_output_tokens": 65536, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 0, "input_cost_per_video_per_second": 0, "input_cost_per_audio_per_second": 0, "input_cost_per_token": 0, "input_cost_per_character": 0, "input_cost_per_token_above_128k_tokens": 0, "input_cost_per_character_above_128k_tokens": 0, "input_cost_per_image_above_128k_tokens": 0, "input_cost_per_video_per_second_above_128k_tokens": 0, "input_cost_per_audio_per_second_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_character": 0, "output_cost_per_token_above_128k_tokens": 0, "output_cost_per_character_above_128k_tokens": 0, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": false, "supports_vision": true, "supports_response_schema": false, "supports_audio_output": false, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-2.0-flash", "supports_tool_choice": true, "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini-2.5-pro": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_audio_input": true, "supports_video_input": true, "supports_pdf_input": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing", "supports_web_search": true },
    "gemini/gemini-2.5-pro-exp-03-25": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 0, "input_cost_per_token_above_200k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_token_above_200k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "rpm": 5, "tpm": 25e4, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_audio_input": true, "supports_video_input": true, "supports_pdf_input": true, "supports_response_schema": true, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing", "supports_web_search": true },
    "gemini/gemini-2.5-pro": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "gemini", "mode": "chat", "rpm": 2e3, "tpm": 8e5, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_audio_input": true, "supports_video_input": true, "supports_pdf_input": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing", "supports_web_search": true },
    "gemini/gemini-2.5-flash": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 1e-6, "input_cost_per_token": 3e-7, "output_cost_per_token": 25e-7, "output_cost_per_reasoning_token": 25e-7, "litellm_provider": "gemini", "mode": "chat", "supports_reasoning": true, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_url_context": true, "tpm": 8e6, "rpm": 1e5, "supports_pdf_input": true },
    "gemini-2.5-flash": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 1e-6, "input_cost_per_token": 3e-7, "output_cost_per_token": 25e-7, "output_cost_per_reasoning_token": 25e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_reasoning": true, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_url_context": true, "supports_pdf_input": true },
    "gemini/gemini-2.5-flash-preview-tts": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 1e-6, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "output_cost_per_reasoning_token": 35e-7, "litellm_provider": "gemini", "mode": "chat", "rpm": 10, "tpm": 25e4, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_reasoning": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions"], "supported_modalities": ["text"], "supported_output_modalities": ["audio"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_web_search": true },
    "gemini/gemini-2.5-flash-preview-05-20": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 1e-6, "input_cost_per_token": 3e-7, "output_cost_per_token": 25e-7, "output_cost_per_reasoning_token": 25e-7, "litellm_provider": "gemini", "mode": "chat", "rpm": 10, "tpm": 25e4, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_reasoning": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_web_search": true, "supports_url_context": true, "supports_pdf_input": true },
    "gemini/gemini-2.5-flash-preview-04-17": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 1e-6, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "output_cost_per_reasoning_token": 35e-7, "litellm_provider": "gemini", "mode": "chat", "rpm": 10, "tpm": 25e4, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_reasoning": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_web_search": true, "supports_pdf_input": true },
    "gemini/gemini-2.5-flash-lite-preview-06-17": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 5e-7, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "output_cost_per_reasoning_token": 4e-7, "litellm_provider": "gemini", "mode": "chat", "rpm": 15, "tpm": 25e4, "supports_reasoning": true, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-lite", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_url_context": true, "supports_pdf_input": true },
    "gemini-2.5-flash-preview-05-20": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 1e-6, "input_cost_per_token": 3e-7, "output_cost_per_token": 25e-7, "output_cost_per_reasoning_token": 25e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_reasoning": true, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_url_context": true, "supports_pdf_input": true },
    "gemini-2.5-flash-preview-04-17": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 1e-6, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "output_cost_per_reasoning_token": 35e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_reasoning": true, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_pdf_input": true },
    "gemini-2.5-flash-lite-preview-06-17": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 5e-7, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "output_cost_per_reasoning_token": 4e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_reasoning": true, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_url_context": true, "supports_pdf_input": true },
    "gemini-2.0-flash": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supports_audio_input": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "supports_tool_choice": true, "source": "https://ai.google.dev/pricing#2_0flash", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_url_context": true },
    "gemini-2.0-flash-lite": { "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 50, "input_cost_per_audio_token": 75e-9, "input_cost_per_token": 75e-9, "output_cost_per_token": 3e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-2.0-flash", "supports_tool_choice": true, "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini-2.0-flash-lite-001": { "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 50, "input_cost_per_audio_token": 75e-9, "input_cost_per_token": 75e-9, "output_cost_per_token": 3e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-2.0-flash", "supports_tool_choice": true, "deprecation_date": "2026-02-25", "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini-2.5-pro-preview-06-05": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 125e-8, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_reasoning": true, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_pdf_input": true },
    "gemini-2.5-pro-preview-05-06": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 125e-8, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_reasoning": true, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "supported_regions": ["global"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_pdf_input": true },
    "gemini-2.5-pro-preview-03-25": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 125e-8, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_reasoning": true, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_endpoints": ["/v1/chat/completions", "/v1/completions", "/v1/batch"], "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-preview", "supports_parallel_function_calling": true, "supports_web_search": true, "supports_pdf_input": true },
    "gemini-2.0-flash-preview-image-generation": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supports_audio_input": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "supports_tool_choice": true, "source": "https://ai.google.dev/pricing#2_0flash", "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini-2.5-pro-preview-tts": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "vertex_ai-language-models", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_modalities": ["text"], "supported_output_modalities": ["audio"], "source": "https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-pro-preview", "supports_parallel_function_calling": true, "supports_web_search": true },
    "gemini/gemini-2.0-pro-exp-02-05": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 0, "input_cost_per_video_per_second": 0, "input_cost_per_audio_per_second": 0, "input_cost_per_token": 0, "input_cost_per_character": 0, "input_cost_per_token_above_128k_tokens": 0, "input_cost_per_character_above_128k_tokens": 0, "input_cost_per_image_above_128k_tokens": 0, "input_cost_per_video_per_second_above_128k_tokens": 0, "input_cost_per_audio_per_second_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_character": 0, "output_cost_per_token_above_128k_tokens": 0, "output_cost_per_character_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "rpm": 2, "tpm": 1e6, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_audio_input": true, "supports_video_input": true, "supports_pdf_input": true, "supports_response_schema": true, "supports_tool_choice": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing", "supports_web_search": true },
    "gemini/gemini-2.0-flash-preview-image-generation": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "litellm_provider": "gemini", "mode": "chat", "rpm": 1e4, "tpm": 1e7, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supports_audio_input": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "supports_tool_choice": true, "source": "https://ai.google.dev/pricing#2_0flash", "supports_web_search": true },
    "gemini/gemini-2.0-flash": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "litellm_provider": "gemini", "mode": "chat", "rpm": 1e4, "tpm": 1e7, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supports_audio_input": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "supports_tool_choice": true, "source": "https://ai.google.dev/pricing#2_0flash", "supports_web_search": true, "supports_url_context": true },
    "gemini/gemini-2.0-flash-lite": { "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 50, "input_cost_per_audio_token": 75e-9, "input_cost_per_token": 75e-9, "output_cost_per_token": 3e-7, "litellm_provider": "gemini", "mode": "chat", "tpm": 4e6, "rpm": 4e3, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supports_tool_choice": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/pricing#gemini-2.0-flash-lite", "supports_web_search": true },
    "gemini/gemini-2.0-flash-001": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "litellm_provider": "gemini", "mode": "chat", "rpm": 1e4, "tpm": 1e7, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "source": "https://ai.google.dev/pricing#2_0flash", "supports_web_search": true },
    "gemini/gemini-2.5-pro-preview-tts": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "gemini", "mode": "chat", "rpm": 1e4, "tpm": 1e7, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_modalities": ["text"], "supported_output_modalities": ["audio"], "source": "https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-pro-preview", "supports_web_search": true },
    "gemini/gemini-2.5-pro-preview-06-05": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "gemini", "mode": "chat", "rpm": 1e4, "tpm": 1e7, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-pro-preview", "supports_web_search": true, "supports_url_context": true, "supports_pdf_input": true },
    "gemini/gemini-2.5-pro-preview-05-06": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "gemini", "mode": "chat", "rpm": 1e4, "tpm": 1e7, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-pro-preview", "supports_web_search": true, "supports_url_context": true, "supports_pdf_input": true },
    "gemini/gemini-2.5-pro-preview-03-25": { "max_tokens": 65535, "max_input_tokens": 1048576, "max_output_tokens": 65535, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 125e-8, "input_cost_per_token_above_200k_tokens": 25e-7, "output_cost_per_token": 1e-5, "output_cost_per_token_above_200k_tokens": 15e-6, "litellm_provider": "gemini", "mode": "chat", "rpm": 1e4, "tpm": 1e7, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-pro-preview", "supports_web_search": true, "supports_pdf_input": true },
    "gemini/gemini-2.0-flash-exp": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 0, "input_cost_per_video_per_second": 0, "input_cost_per_audio_per_second": 0, "input_cost_per_token": 0, "input_cost_per_character": 0, "input_cost_per_token_above_128k_tokens": 0, "input_cost_per_character_above_128k_tokens": 0, "input_cost_per_image_above_128k_tokens": 0, "input_cost_per_video_per_second_above_128k_tokens": 0, "input_cost_per_audio_per_second_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_character": 0, "output_cost_per_token_above_128k_tokens": 0, "output_cost_per_character_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "tpm": 4e6, "rpm": 10, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-2.0-flash", "supports_tool_choice": true, "supports_web_search": true },
    "gemini/gemini-2.0-flash-lite-preview-02-05": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 75e-9, "input_cost_per_token": 75e-9, "output_cost_per_token": 3e-7, "litellm_provider": "gemini", "mode": "chat", "rpm": 6e4, "tpm": 1e7, "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "supports_tool_choice": true, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-2.0-flash-lite", "supports_web_search": true },
    "gemini/gemini-2.0-flash-thinking-exp": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 65536, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 0, "input_cost_per_video_per_second": 0, "input_cost_per_audio_per_second": 0, "input_cost_per_token": 0, "input_cost_per_character": 0, "input_cost_per_token_above_128k_tokens": 0, "input_cost_per_character_above_128k_tokens": 0, "input_cost_per_image_above_128k_tokens": 0, "input_cost_per_video_per_second_above_128k_tokens": 0, "input_cost_per_audio_per_second_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_character": 0, "output_cost_per_token_above_128k_tokens": 0, "output_cost_per_character_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "tpm": 4e6, "rpm": 10, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-2.0-flash", "supports_tool_choice": true, "supports_web_search": true },
    "gemini/gemini-2.0-flash-thinking-exp-01-21": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 65536, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_image": 0, "input_cost_per_video_per_second": 0, "input_cost_per_audio_per_second": 0, "input_cost_per_token": 0, "input_cost_per_character": 0, "input_cost_per_token_above_128k_tokens": 0, "input_cost_per_character_above_128k_tokens": 0, "input_cost_per_image_above_128k_tokens": 0, "input_cost_per_video_per_second_above_128k_tokens": 0, "input_cost_per_audio_per_second_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_character": 0, "output_cost_per_token_above_128k_tokens": 0, "output_cost_per_character_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "tpm": 4e6, "rpm": 10, "supported_modalities": ["text", "image", "audio", "video"], "supported_output_modalities": ["text", "image"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#gemini-2.0-flash", "supports_tool_choice": true, "supports_web_search": true },
    "gemini/gemma-3-27b-it": { "max_tokens": 8192, "max_input_tokens": 131072, "max_output_tokens": 8192, "input_cost_per_image": 0, "input_cost_per_video_per_second": 0, "input_cost_per_audio_per_second": 0, "input_cost_per_token": 0, "input_cost_per_character": 0, "input_cost_per_token_above_128k_tokens": 0, "input_cost_per_character_above_128k_tokens": 0, "input_cost_per_image_above_128k_tokens": 0, "input_cost_per_video_per_second_above_128k_tokens": 0, "input_cost_per_audio_per_second_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_character": 0, "output_cost_per_token_above_128k_tokens": 0, "output_cost_per_character_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "source": "https://aistudio.google.com", "supports_tool_choice": true },
    "gemini/learnlm-1.5-pro-experimental": { "max_tokens": 8192, "max_input_tokens": 32767, "max_output_tokens": 8192, "input_cost_per_image": 0, "input_cost_per_video_per_second": 0, "input_cost_per_audio_per_second": 0, "input_cost_per_token": 0, "input_cost_per_character": 0, "input_cost_per_token_above_128k_tokens": 0, "input_cost_per_character_above_128k_tokens": 0, "input_cost_per_image_above_128k_tokens": 0, "input_cost_per_video_per_second_above_128k_tokens": 0, "input_cost_per_audio_per_second_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_character": 0, "output_cost_per_token_above_128k_tokens": 0, "output_cost_per_character_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": false, "source": "https://aistudio.google.com", "supports_tool_choice": true },
    "vertex_ai/claude-3-sonnet": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-sonnet@20240229": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-5-sonnet": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_pdf_input": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-5-sonnet@20240620": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_pdf_input": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-5-sonnet-v2": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_pdf_input": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-5-sonnet-v2@20241022": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_pdf_input": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-7-sonnet@20250219": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_pdf_input": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "deprecation_date": "2025-06-01", "supports_reasoning": true, "supports_tool_choice": true },
    "vertex_ai/claude-opus-4": { "max_tokens": 32e3, "max_input_tokens": 2e5, "max_output_tokens": 32e3, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 1875e-8, "cache_read_input_token_cost": 15e-7, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "vertex_ai/claude-opus-4@20250514": { "max_tokens": 32e3, "max_input_tokens": 2e5, "max_output_tokens": 32e3, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 1875e-8, "cache_read_input_token_cost": 15e-7, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "vertex_ai/claude-sonnet-4": { "max_tokens": 64e3, "max_input_tokens": 2e5, "max_output_tokens": 64e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "vertex_ai/claude-sonnet-4@20250514": { "max_tokens": 64e3, "max_input_tokens": 2e5, "max_output_tokens": 64e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "vertex_ai/claude-3-haiku": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-haiku@20240307": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-5-haiku": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 1e-6, "output_cost_per_token": 5e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_pdf_input": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-5-haiku@20241022": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 1e-6, "output_cost_per_token": 5e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_pdf_input": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-opus": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/claude-3-opus@20240229": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "litellm_provider": "vertex_ai-anthropic_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "vertex_ai/meta/llama3-405b-instruct-maas": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 32e3, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-llama_models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing#partner-models", "supports_tool_choice": true },
    "vertex_ai/meta/llama-4-scout-17b-16e-instruct-maas": { "max_tokens": 1e7, "max_input_tokens": 1e7, "max_output_tokens": 1e7, "input_cost_per_token": 25e-8, "output_cost_per_token": 7e-7, "litellm_provider": "vertex_ai-llama_models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing#partner-models", "supports_tool_choice": true, "supports_function_calling": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text", "code"] },
    "vertex_ai/meta/llama-4-scout-17b-128e-instruct-maas": { "max_tokens": 1e7, "max_input_tokens": 1e7, "max_output_tokens": 1e7, "input_cost_per_token": 25e-8, "output_cost_per_token": 7e-7, "litellm_provider": "vertex_ai-llama_models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing#partner-models", "supports_tool_choice": true, "supports_function_calling": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text", "code"] },
    "vertex_ai/meta/llama-4-maverick-17b-128e-instruct-maas": { "max_tokens": 1e6, "max_input_tokens": 1e6, "max_output_tokens": 1e6, "input_cost_per_token": 35e-8, "output_cost_per_token": 115e-8, "litellm_provider": "vertex_ai-llama_models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing#partner-models", "supports_tool_choice": true, "supports_function_calling": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text", "code"] },
    "vertex_ai/meta/llama-4-maverick-17b-16e-instruct-maas": { "max_tokens": 1e6, "max_input_tokens": 1e6, "max_output_tokens": 1e6, "input_cost_per_token": 35e-8, "output_cost_per_token": 115e-8, "litellm_provider": "vertex_ai-llama_models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing#partner-models", "supports_tool_choice": true, "supports_function_calling": true, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text", "code"] },
    "vertex_ai/meta/llama3-70b-instruct-maas": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 32e3, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-llama_models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing#partner-models", "supports_tool_choice": true },
    "vertex_ai/meta/llama3-8b-instruct-maas": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 32e3, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-llama_models", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing#partner-models", "supports_tool_choice": true },
    "vertex_ai/meta/llama-3.2-90b-vision-instruct-maas": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-llama_models", "mode": "chat", "supports_system_messages": true, "supports_vision": true, "source": "https://console.cloud.google.com/vertex-ai/publishers/meta/model-garden/llama-3.2-90b-vision-instruct-maas", "supports_tool_choice": true },
    "vertex_ai/mistral-large@latest": { "max_tokens": 8191, "max_input_tokens": 128e3, "max_output_tokens": 8191, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "vertex_ai/mistral-large@2411-001": { "max_tokens": 8191, "max_input_tokens": 128e3, "max_output_tokens": 8191, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "vertex_ai/mistral-large-2411": { "max_tokens": 8191, "max_input_tokens": 128e3, "max_output_tokens": 8191, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "vertex_ai/mistral-large@2407": { "max_tokens": 8191, "max_input_tokens": 128e3, "max_output_tokens": 8191, "input_cost_per_token": 2e-6, "output_cost_per_token": 6e-6, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "vertex_ai/mistral-nemo@latest": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "vertex_ai/mistral-small-2503@001": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 1e-6, "output_cost_per_token": 3e-6, "litellm_provider": "vertex_ai-mistral_models", "supports_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "vertex_ai/mistral-small-2503": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 1e-6, "output_cost_per_token": 3e-6, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "vertex_ai/jamba-1.5-mini@001": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 4e-7, "litellm_provider": "vertex_ai-ai21_models", "mode": "chat", "supports_tool_choice": true },
    "vertex_ai/jamba-1.5-large@001": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "litellm_provider": "vertex_ai-ai21_models", "mode": "chat", "supports_tool_choice": true },
    "vertex_ai/jamba-1.5": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 4e-7, "litellm_provider": "vertex_ai-ai21_models", "mode": "chat", "supports_tool_choice": true },
    "vertex_ai/jamba-1.5-mini": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 4e-7, "litellm_provider": "vertex_ai-ai21_models", "mode": "chat", "supports_tool_choice": true },
    "vertex_ai/jamba-1.5-large": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "litellm_provider": "vertex_ai-ai21_models", "mode": "chat", "supports_tool_choice": true },
    "vertex_ai/mistral-nemo@2407": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 3e-6, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "vertex_ai/codestral@latest": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 6e-7, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "vertex_ai/codestral@2405": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 6e-7, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "vertex_ai/codestral-2501": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 6e-7, "litellm_provider": "vertex_ai-mistral_models", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "vertex_ai/imagegeneration@006": { "output_cost_per_image": 0.02, "litellm_provider": "vertex_ai-image-models", "mode": "image_generation", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing" },
    "vertex_ai/imagen-4.0-generate-preview-06-06": { "output_cost_per_image": 0.04, "litellm_provider": "vertex_ai-image-models", "mode": "image_generation", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing" },
    "vertex_ai/imagen-4.0-ultra-generate-preview-06-06": { "output_cost_per_image": 0.06, "litellm_provider": "vertex_ai-image-models", "mode": "image_generation", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing" },
    "vertex_ai/imagen-4.0-fast-generate-preview-06-06": { "output_cost_per_image": 0.02, "litellm_provider": "vertex_ai-image-models", "mode": "image_generation", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing" },
    "vertex_ai/imagen-3.0-generate-002": { "output_cost_per_image": 0.04, "litellm_provider": "vertex_ai-image-models", "mode": "image_generation", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing" },
    "vertex_ai/imagen-3.0-generate-001": { "output_cost_per_image": 0.04, "litellm_provider": "vertex_ai-image-models", "mode": "image_generation", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing" },
    "vertex_ai/imagen-3.0-fast-generate-001": { "output_cost_per_image": 0.02, "litellm_provider": "vertex_ai-image-models", "mode": "image_generation", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing" },
    "text-embedding-004": { "max_tokens": 2048, "max_input_tokens": 2048, "output_vector_size": 768, "input_cost_per_character": 25e-9, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models" },
    "gemini-embedding-001": { "max_tokens": 2048, "max_input_tokens": 2048, "output_vector_size": 3072, "input_cost_per_token": 15e-8, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models" },
    "text-embedding-005": { "max_tokens": 2048, "max_input_tokens": 2048, "output_vector_size": 768, "input_cost_per_character": 25e-9, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models" },
    "text-multilingual-embedding-002": { "max_tokens": 2048, "max_input_tokens": 2048, "output_vector_size": 768, "input_cost_per_character": 25e-9, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models" },
    multimodalembedding,
    "multimodalembedding@001": { "max_tokens": 2048, "max_input_tokens": 2048, "output_vector_size": 768, "input_cost_per_character": 2e-7, "input_cost_per_image": 1e-4, "input_cost_per_video_per_second": 5e-4, "input_cost_per_video_per_second_above_8s_interval": 1e-3, "input_cost_per_video_per_second_above_15s_interval": 2e-3, "input_cost_per_token": 8e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "supported_endpoints": ["/v1/embeddings"], "supported_modalities": ["text", "image", "video"], "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models" },
    "text-embedding-large-exp-03-07": { "max_tokens": 8192, "max_input_tokens": 8192, "output_vector_size": 3072, "input_cost_per_character": 25e-9, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models" },
    "textembedding-gecko": { "max_tokens": 3072, "max_input_tokens": 3072, "output_vector_size": 768, "input_cost_per_character": 25e-9, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "textembedding-gecko-multilingual": { "max_tokens": 3072, "max_input_tokens": 3072, "output_vector_size": 768, "input_cost_per_character": 25e-9, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "textembedding-gecko-multilingual@001": { "max_tokens": 3072, "max_input_tokens": 3072, "output_vector_size": 768, "input_cost_per_character": 25e-9, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "textembedding-gecko@001": { "max_tokens": 3072, "max_input_tokens": 3072, "output_vector_size": 768, "input_cost_per_character": 25e-9, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "textembedding-gecko@003": { "max_tokens": 3072, "max_input_tokens": 3072, "output_vector_size": 768, "input_cost_per_character": 25e-9, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "text-embedding-preview-0409": { "max_tokens": 3072, "max_input_tokens": 3072, "output_vector_size": 768, "input_cost_per_token": 625e-11, "input_cost_per_token_batch_requests": 5e-9, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/pricing" },
    "text-multilingual-embedding-preview-0409": { "max_tokens": 3072, "max_input_tokens": 3072, "output_vector_size": 768, "input_cost_per_token": 625e-11, "output_cost_per_token": 0, "litellm_provider": "vertex_ai-embedding-models", "mode": "embedding", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "palm/chat-bison": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "palm", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "palm/chat-bison-001": { "max_tokens": 4096, "max_input_tokens": 8192, "max_output_tokens": 4096, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "palm", "mode": "chat", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "palm/text-bison": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "palm", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "palm/text-bison-001": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "palm", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "palm/text-bison-safety-off": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "palm", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "palm/text-bison-safety-recitation-off": { "max_tokens": 1024, "max_input_tokens": 8192, "max_output_tokens": 1024, "input_cost_per_token": 125e-9, "output_cost_per_token": 125e-9, "litellm_provider": "palm", "mode": "completion", "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models" },
    "gemini/gemini-1.5-flash-002": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "cache_read_input_token_cost": 1875e-11, "cache_creation_input_token_cost": 1e-6, "input_cost_per_token": 75e-9, "input_cost_per_token_above_128k_tokens": 15e-8, "output_cost_per_token": 3e-7, "output_cost_per_token_above_128k_tokens": 6e-7, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_prompt_caching": true, "tpm": 4e6, "rpm": 2e3, "source": "https://ai.google.dev/pricing", "deprecation_date": "2025-09-24", "supports_tool_choice": true },
    "gemini/gemini-1.5-flash-001": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "cache_read_input_token_cost": 1875e-11, "cache_creation_input_token_cost": 1e-6, "input_cost_per_token": 75e-9, "input_cost_per_token_above_128k_tokens": 15e-8, "output_cost_per_token": 3e-7, "output_cost_per_token_above_128k_tokens": 6e-7, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_prompt_caching": true, "tpm": 4e6, "rpm": 2e3, "source": "https://ai.google.dev/pricing", "deprecation_date": "2025-05-24", "supports_tool_choice": true },
    "gemini/gemini-1.5-flash": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 75e-9, "input_cost_per_token_above_128k_tokens": 15e-8, "output_cost_per_token": 3e-7, "output_cost_per_token_above_128k_tokens": 6e-7, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "tpm": 4e6, "rpm": 2e3, "source": "https://ai.google.dev/pricing", "supports_tool_choice": true },
    "gemini/gemini-1.5-flash-latest": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 75e-9, "input_cost_per_token_above_128k_tokens": 15e-8, "output_cost_per_token": 3e-7, "output_cost_per_token_above_128k_tokens": 6e-7, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_prompt_caching": true, "tpm": 4e6, "rpm": 2e3, "source": "https://ai.google.dev/pricing", "supports_tool_choice": true },
    "gemini/gemini-1.5-flash-8b": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 0, "input_cost_per_token_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_token_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_prompt_caching": true, "tpm": 4e6, "rpm": 4e3, "source": "https://ai.google.dev/pricing", "supports_tool_choice": true },
    "gemini/gemini-1.5-flash-8b-exp-0924": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 0, "input_cost_per_token_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_token_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_prompt_caching": true, "tpm": 4e6, "rpm": 4e3, "source": "https://ai.google.dev/pricing", "supports_tool_choice": true },
    "gemini/gemini-exp-1114": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 0, "input_cost_per_token_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_token_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_tool_choice": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "tpm": 4e6, "rpm": 1e3, "source": "https://ai.google.dev/pricing", "metadata": { "notes": "Rate limits not documented for gemini-exp-1114. Assuming same as gemini-1.5-pro.", "supports_tool_choice": true } },
    "gemini/gemini-exp-1206": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 0, "input_cost_per_token_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_token_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_tool_choice": true, "supports_vision": true, "supports_response_schema": true, "tpm": 4e6, "rpm": 1e3, "source": "https://ai.google.dev/pricing", "metadata": { "notes": "Rate limits not documented for gemini-exp-1206. Assuming same as gemini-1.5-pro.", "supports_tool_choice": true } },
    "gemini/gemini-1.5-flash-exp-0827": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 0, "input_cost_per_token_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_token_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "tpm": 4e6, "rpm": 2e3, "source": "https://ai.google.dev/pricing", "supports_tool_choice": true },
    "gemini/gemini-1.5-flash-8b-exp-0827": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_token": 0, "input_cost_per_token_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_token_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "tpm": 4e6, "rpm": 4e3, "source": "https://ai.google.dev/pricing", "supports_tool_choice": true },
    "gemini/gemini-pro": { "max_tokens": 8192, "max_input_tokens": 32760, "max_output_tokens": 8192, "input_cost_per_token": 35e-8, "input_cost_per_token_above_128k_tokens": 7e-7, "output_cost_per_token": 105e-8, "output_cost_per_token_above_128k_tokens": 21e-7, "litellm_provider": "gemini", "mode": "chat", "supports_function_calling": true, "rpd": 3e4, "tpm": 12e4, "rpm": 360, "source": "https://ai.google.dev/gemini-api/docs/models/gemini", "supports_tool_choice": true },
    "gemini/gemini-1.5-pro": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "input_cost_per_token": 35e-7, "input_cost_per_token_above_128k_tokens": 7e-6, "output_cost_per_token": 105e-7, "output_cost_per_token_above_128k_tokens": 21e-6, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_response_schema": true, "tpm": 4e6, "rpm": 1e3, "source": "https://ai.google.dev/pricing" },
    "gemini/gemini-1.5-pro-002": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "input_cost_per_token": 35e-7, "input_cost_per_token_above_128k_tokens": 7e-6, "output_cost_per_token": 105e-7, "output_cost_per_token_above_128k_tokens": 21e-6, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_response_schema": true, "supports_prompt_caching": true, "tpm": 4e6, "rpm": 1e3, "source": "https://ai.google.dev/pricing", "deprecation_date": "2025-09-24" },
    "gemini/gemini-1.5-pro-001": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "input_cost_per_token": 35e-7, "input_cost_per_token_above_128k_tokens": 7e-6, "output_cost_per_token": 105e-7, "output_cost_per_token_above_128k_tokens": 21e-6, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_response_schema": true, "supports_prompt_caching": true, "tpm": 4e6, "rpm": 1e3, "source": "https://ai.google.dev/pricing", "deprecation_date": "2025-05-24" },
    "gemini/gemini-1.5-pro-exp-0801": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "input_cost_per_token": 35e-7, "input_cost_per_token_above_128k_tokens": 7e-6, "output_cost_per_token": 105e-7, "output_cost_per_token_above_128k_tokens": 21e-6, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_response_schema": true, "tpm": 4e6, "rpm": 1e3, "source": "https://ai.google.dev/pricing" },
    "gemini/gemini-1.5-pro-exp-0827": { "max_tokens": 8192, "max_input_tokens": 2097152, "max_output_tokens": 8192, "input_cost_per_token": 0, "input_cost_per_token_above_128k_tokens": 0, "output_cost_per_token": 0, "output_cost_per_token_above_128k_tokens": 0, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_response_schema": true, "tpm": 4e6, "rpm": 1e3, "source": "https://ai.google.dev/pricing" },
    "gemini/gemini-1.5-pro-latest": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "input_cost_per_token": 35e-7, "input_cost_per_token_above_128k_tokens": 7e-6, "output_cost_per_token": 105e-8, "output_cost_per_token_above_128k_tokens": 21e-6, "litellm_provider": "gemini", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true, "supports_response_schema": true, "tpm": 4e6, "rpm": 1e3, "source": "https://ai.google.dev/pricing" },
    "gemini/gemini-pro-vision": { "max_tokens": 2048, "max_input_tokens": 30720, "max_output_tokens": 2048, "input_cost_per_token": 35e-8, "input_cost_per_token_above_128k_tokens": 7e-7, "output_cost_per_token": 105e-8, "output_cost_per_token_above_128k_tokens": 21e-7, "litellm_provider": "gemini", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "rpd": 3e4, "tpm": 12e4, "rpm": 360, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "gemini/gemini-gemma-2-27b-it": { "max_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 35e-8, "output_cost_per_token": 105e-8, "litellm_provider": "gemini", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "gemini/gemini-gemma-2-9b-it": { "max_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 35e-8, "output_cost_per_token": 105e-8, "litellm_provider": "gemini", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "source": "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models#foundation_models", "supports_tool_choice": true },
    "command-a-03-2025": { "max_tokens": 8e3, "max_input_tokens": 256e3, "max_output_tokens": 8e3, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "litellm_provider": "cohere_chat", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "command-r": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "litellm_provider": "cohere_chat", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "command-r-08-2024": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "litellm_provider": "cohere_chat", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "command-r7b-12-2024": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 15e-8, "output_cost_per_token": 375e-10, "litellm_provider": "cohere_chat", "mode": "chat", "supports_function_calling": true, "source": "https://docs.cohere.com/v2/docs/command-r7b", "supports_tool_choice": true },
    "command-light": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 3e-7, "output_cost_per_token": 6e-7, "litellm_provider": "cohere_chat", "mode": "chat", "supports_tool_choice": true },
    "command-r-plus": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "litellm_provider": "cohere_chat", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "command-r-plus-08-2024": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "litellm_provider": "cohere_chat", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "command-nightly": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 1e-6, "output_cost_per_token": 2e-6, "litellm_provider": "cohere", "mode": "completion" },
    command,
    "rerank-v3.5": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "max_query_tokens": 2048, "input_cost_per_token": 0, "input_cost_per_query": 2e-3, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "rerank" },
    "rerank-english-v3.0": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "max_query_tokens": 2048, "input_cost_per_token": 0, "input_cost_per_query": 2e-3, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "rerank" },
    "rerank-multilingual-v3.0": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "max_query_tokens": 2048, "input_cost_per_token": 0, "input_cost_per_query": 2e-3, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "rerank" },
    "rerank-english-v2.0": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "max_query_tokens": 2048, "input_cost_per_token": 0, "input_cost_per_query": 2e-3, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "rerank" },
    "rerank-multilingual-v2.0": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "max_query_tokens": 2048, "input_cost_per_token": 0, "input_cost_per_query": 2e-3, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "rerank" },
    "embed-english-light-v3.0": { "max_tokens": 1024, "max_input_tokens": 1024, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "embedding" },
    "embed-multilingual-v3.0": { "max_tokens": 1024, "max_input_tokens": 1024, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "cohere", "supports_embedding_image_input": true, "mode": "embedding" },
    "embed-english-v2.0": { "max_tokens": 4096, "max_input_tokens": 4096, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "embedding" },
    "embed-english-light-v2.0": { "max_tokens": 1024, "max_input_tokens": 1024, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "embedding" },
    "embed-multilingual-v2.0": { "max_tokens": 768, "max_input_tokens": 768, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "embedding" },
    "embed-english-v3.0": { "max_tokens": 1024, "max_input_tokens": 1024, "input_cost_per_token": 1e-7, "input_cost_per_image": 1e-4, "output_cost_per_token": 0, "litellm_provider": "cohere", "mode": "embedding", "supports_image_input": true, "supports_embedding_image_input": true, "metadata": { "notes": "'supports_image_input' is a deprecated field. Use 'supports_embedding_image_input' instead." } },
    "replicate/meta/llama-2-13b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 1e-7, "output_cost_per_token": 5e-7, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/meta/llama-2-13b-chat": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 1e-7, "output_cost_per_token": 5e-7, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/meta/llama-2-70b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 65e-8, "output_cost_per_token": 275e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/meta/llama-2-70b-chat": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 65e-8, "output_cost_per_token": 275e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/meta/llama-2-7b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 5e-8, "output_cost_per_token": 25e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/meta/llama-2-7b-chat": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 5e-8, "output_cost_per_token": 25e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/meta/llama-3-70b": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 65e-8, "output_cost_per_token": 275e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/meta/llama-3-70b-instruct": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 65e-8, "output_cost_per_token": 275e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/meta/llama-3-8b": { "max_tokens": 8086, "max_input_tokens": 8086, "max_output_tokens": 8086, "input_cost_per_token": 5e-8, "output_cost_per_token": 25e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/meta/llama-3-8b-instruct": { "max_tokens": 8086, "max_input_tokens": 8086, "max_output_tokens": 8086, "input_cost_per_token": 5e-8, "output_cost_per_token": 25e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/mistralai/mistral-7b-v0.1": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 5e-8, "output_cost_per_token": 25e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/mistralai/mistral-7b-instruct-v0.2": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 5e-8, "output_cost_per_token": 25e-8, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "replicate/mistralai/mixtral-8x7b-instruct-v0.1": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 3e-7, "output_cost_per_token": 1e-6, "litellm_provider": "replicate", "mode": "chat", "supports_tool_choice": true },
    "openrouter/deepseek/deepseek-r1-0528": { "max_tokens": 8192, "max_input_tokens": 65336, "max_output_tokens": 8192, "input_cost_per_token": 5e-7, "input_cost_per_token_cache_hit": 14e-8, "output_cost_per_token": 215e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_reasoning": true, "supports_tool_choice": true, "supports_prompt_caching": true },
    "openrouter/deepseek/deepseek-r1": { "max_tokens": 8192, "max_input_tokens": 65336, "max_output_tokens": 8192, "input_cost_per_token": 55e-8, "input_cost_per_token_cache_hit": 14e-8, "output_cost_per_token": 219e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_reasoning": true, "supports_tool_choice": true, "supports_prompt_caching": true },
    "openrouter/deepseek/deepseek-chat": { "max_tokens": 8192, "max_input_tokens": 65536, "max_output_tokens": 8192, "input_cost_per_token": 14e-8, "output_cost_per_token": 28e-8, "litellm_provider": "openrouter", "supports_prompt_caching": true, "mode": "chat", "supports_tool_choice": true },
    "openrouter/deepseek/deepseek-coder": { "max_tokens": 8192, "max_input_tokens": 66e3, "max_output_tokens": 4096, "input_cost_per_token": 14e-8, "output_cost_per_token": 28e-8, "litellm_provider": "openrouter", "supports_prompt_caching": true, "mode": "chat", "supports_tool_choice": true },
    "openrouter/microsoft/wizardlm-2-8x22b:nitro": { "max_tokens": 65536, "input_cost_per_token": 1e-6, "output_cost_per_token": 1e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/google/gemini-2.5-pro": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 125e-8, "output_cost_per_token": 1e-5, "litellm_provider": "openrouter", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supports_tool_choice": true },
    "openrouter/google/gemini-pro-1.5": { "max_tokens": 8192, "max_input_tokens": 1e6, "max_output_tokens": 8192, "input_cost_per_token": 25e-7, "output_cost_per_token": 75e-7, "input_cost_per_image": 265e-5, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "openrouter/google/gemini-2.0-flash-001": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 1e-7, "output_cost_per_token": 4e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supports_tool_choice": true },
    "openrouter/google/gemini-2.5-flash": { "max_tokens": 8192, "max_input_tokens": 1048576, "max_output_tokens": 8192, "max_images_per_prompt": 3e3, "max_videos_per_prompt": 10, "max_video_length": 1, "max_audio_length_hours": 8.4, "max_audio_per_prompt": 1, "max_pdf_size_mb": 30, "input_cost_per_audio_token": 7e-7, "input_cost_per_token": 3e-7, "output_cost_per_token": 25e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_system_messages": true, "supports_function_calling": true, "supports_vision": true, "supports_response_schema": true, "supports_audio_output": true, "supports_tool_choice": true },
    "openrouter/mistralai/mixtral-8x22b-instruct": { "max_tokens": 65536, "input_cost_per_token": 65e-8, "output_cost_per_token": 65e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/cohere/command-r-plus": { "max_tokens": 128e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/databricks/dbrx-instruct": { "max_tokens": 32768, "input_cost_per_token": 6e-7, "output_cost_per_token": 6e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/anthropic/claude-3-haiku": { "max_tokens": 2e5, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "input_cost_per_image": 4e-4, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "openrouter/anthropic/claude-3-5-haiku": { "max_tokens": 2e5, "input_cost_per_token": 1e-6, "output_cost_per_token": 5e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "openrouter/anthropic/claude-3-haiku-20240307": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 264, "supports_tool_choice": true },
    "openrouter/anthropic/claude-3-5-haiku-20241022": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 1e-6, "output_cost_per_token": 5e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "tool_use_system_prompt_tokens": 264, "supports_tool_choice": true },
    "openrouter/anthropic/claude-3.5-sonnet": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "openrouter/anthropic/claude-3.5-sonnet:beta": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_tool_choice": true },
    "openrouter/anthropic/claude-3.7-sonnet": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "input_cost_per_image": 48e-4, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_reasoning": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "openrouter/anthropic/claude-3.7-sonnet:beta": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "input_cost_per_image": 48e-4, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_reasoning": true, "tool_use_system_prompt_tokens": 159, "supports_tool_choice": true },
    "openrouter/anthropic/claude-3-sonnet": { "max_tokens": 2e5, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "input_cost_per_image": 48e-4, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "openrouter/anthropic/claude-sonnet-4": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "input_cost_per_image": 48e-4, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_reasoning": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_tool_choice": true },
    "openrouter/mistralai/mistral-large": { "max_tokens": 32e3, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/mistralai/mistral-small-3.1-24b-instruct": { "max_tokens": 32e3, "input_cost_per_token": 1e-7, "output_cost_per_token": 3e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/mistralai/mistral-small-3.2-24b-instruct": { "max_tokens": 32e3, "input_cost_per_token": 1e-7, "output_cost_per_token": 3e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/cognitivecomputations/dolphin-mixtral-8x7b": { "max_tokens": 32769, "input_cost_per_token": 5e-7, "output_cost_per_token": 5e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/google/gemini-pro-vision": { "max_tokens": 45875, "input_cost_per_token": 125e-9, "output_cost_per_token": 375e-9, "input_cost_per_image": 25e-4, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "openrouter/fireworks/firellava-13b": { "max_tokens": 4096, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/meta-llama/llama-3-8b-instruct:free": { "max_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/meta-llama/llama-3-8b-instruct:extended": { "max_tokens": 16384, "input_cost_per_token": 225e-9, "output_cost_per_token": 225e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/meta-llama/llama-3-70b-instruct:nitro": { "max_tokens": 8192, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/meta-llama/llama-3-70b-instruct": { "max_tokens": 8192, "input_cost_per_token": 59e-8, "output_cost_per_token": 79e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/openai/o1": { "max_tokens": 1e5, "max_input_tokens": 2e5, "max_output_tokens": 1e5, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "cache_read_input_token_cost": 75e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_prompt_caching": true, "supports_system_messages": true, "supports_response_schema": true, "supports_tool_choice": true },
    "openrouter/openai/o1-mini": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 3e-6, "output_cost_per_token": 12e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_tool_choice": true },
    "openrouter/openai/o1-mini-2024-09-12": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 3e-6, "output_cost_per_token": 12e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_tool_choice": true },
    "openrouter/openai/o1-preview": { "max_tokens": 32768, "max_input_tokens": 128e3, "max_output_tokens": 32768, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_tool_choice": true },
    "openrouter/openai/o1-preview-2024-09-12": { "max_tokens": 32768, "max_input_tokens": 128e3, "max_output_tokens": 32768, "input_cost_per_token": 15e-6, "output_cost_per_token": 6e-5, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_tool_choice": true },
    "openrouter/openai/o3-mini": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_reasoning": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_tool_choice": true },
    "openrouter/openai/o3-mini-high": { "max_tokens": 65536, "max_input_tokens": 128e3, "max_output_tokens": 65536, "input_cost_per_token": 11e-7, "output_cost_per_token": 44e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_reasoning": true, "supports_parallel_function_calling": true, "supports_vision": false, "supports_tool_choice": true },
    "openrouter/openai/gpt-4o": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 25e-7, "output_cost_per_token": 1e-5, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "openrouter/openai/gpt-4o-2024-05-13": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-6, "output_cost_per_token": 15e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "openrouter/openai/gpt-4-vision-preview": { "max_tokens": 13e4, "input_cost_per_token": 1e-5, "output_cost_per_token": 3e-5, "input_cost_per_image": 0.01445, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_tool_choice": true },
    "openrouter/openai/gpt-3.5-turbo": { "max_tokens": 4095, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/openai/gpt-3.5-turbo-16k": { "max_tokens": 16383, "input_cost_per_token": 3e-6, "output_cost_per_token": 4e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/openai/gpt-4": { "max_tokens": 8192, "input_cost_per_token": 3e-5, "output_cost_per_token": 6e-5, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/anthropic/claude-instant-v1": { "max_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 163e-8, "output_cost_per_token": 551e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/anthropic/claude-2": { "max_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 1102e-8, "output_cost_per_token": 3268e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/anthropic/claude-3-opus": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "litellm_provider": "openrouter", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 395, "supports_tool_choice": true },
    "openrouter/google/palm-2-chat-bison": { "max_tokens": 25804, "input_cost_per_token": 5e-7, "output_cost_per_token": 5e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/google/palm-2-codechat-bison": { "max_tokens": 20070, "input_cost_per_token": 5e-7, "output_cost_per_token": 5e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/meta-llama/llama-2-13b-chat": { "max_tokens": 4096, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/meta-llama/llama-2-70b-chat": { "max_tokens": 4096, "input_cost_per_token": 15e-7, "output_cost_per_token": 15e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/meta-llama/codellama-34b-instruct": { "max_tokens": 8192, "input_cost_per_token": 5e-7, "output_cost_per_token": 5e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/nousresearch/nous-hermes-llama2-13b": { "max_tokens": 4096, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/mancer/weaver": { "max_tokens": 8e3, "input_cost_per_token": 5625e-9, "output_cost_per_token": 5625e-9, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/gryphe/mythomax-l2-13b": { "max_tokens": 8192, "input_cost_per_token": 1875e-9, "output_cost_per_token": 1875e-9, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/jondurbin/airoboros-l2-70b-2.1": { "max_tokens": 4096, "input_cost_per_token": 13875e-9, "output_cost_per_token": 13875e-9, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/undi95/remm-slerp-l2-13b": { "max_tokens": 6144, "input_cost_per_token": 1875e-9, "output_cost_per_token": 1875e-9, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/pygmalionai/mythalion-13b": { "max_tokens": 4096, "input_cost_per_token": 1875e-9, "output_cost_per_token": 1875e-9, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/mistralai/mistral-7b-instruct": { "max_tokens": 8192, "input_cost_per_token": 13e-8, "output_cost_per_token": 13e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/mistralai/mistral-7b-instruct:free": { "max_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "openrouter/qwen/qwen-2.5-coder-32b-instruct": { "max_tokens": 33792, "max_input_tokens": 33792, "max_output_tokens": 33792, "input_cost_per_token": 18e-8, "output_cost_per_token": 18e-8, "litellm_provider": "openrouter", "mode": "chat", "supports_tool_choice": true },
    "j2-ultra": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 15e-6, "output_cost_per_token": 15e-6, "litellm_provider": "ai21", "mode": "completion" },
    "jamba-1.5-mini@001": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 4e-7, "litellm_provider": "ai21", "mode": "chat", "supports_tool_choice": true },
    "jamba-1.5-large@001": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "litellm_provider": "ai21", "mode": "chat", "supports_tool_choice": true },
    "jamba-1.5": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 4e-7, "litellm_provider": "ai21", "mode": "chat", "supports_tool_choice": true },
    "jamba-1.5-mini": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 4e-7, "litellm_provider": "ai21", "mode": "chat", "supports_tool_choice": true },
    "jamba-1.5-large": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "litellm_provider": "ai21", "mode": "chat", "supports_tool_choice": true },
    "jamba-large-1.6": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "litellm_provider": "ai21", "mode": "chat", "supports_tool_choice": true },
    "jamba-mini-1.6": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 4e-7, "litellm_provider": "ai21", "mode": "chat", "supports_tool_choice": true },
    "j2-mid": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 1e-5, "output_cost_per_token": 1e-5, "litellm_provider": "ai21", "mode": "completion" },
    "j2-light": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 3e-6, "litellm_provider": "ai21", "mode": "completion" },
    dolphin,
    chatdolphin,
    "luminous-base": { "max_tokens": 2048, "input_cost_per_token": 3e-5, "output_cost_per_token": 33e-6, "litellm_provider": "aleph_alpha", "mode": "completion" },
    "luminous-base-control": { "max_tokens": 2048, "input_cost_per_token": 375e-7, "output_cost_per_token": 4125e-8, "litellm_provider": "aleph_alpha", "mode": "chat" },
    "luminous-extended": { "max_tokens": 2048, "input_cost_per_token": 45e-6, "output_cost_per_token": 495e-7, "litellm_provider": "aleph_alpha", "mode": "completion" },
    "luminous-extended-control": { "max_tokens": 2048, "input_cost_per_token": 5625e-8, "output_cost_per_token": 61875e-9, "litellm_provider": "aleph_alpha", "mode": "chat" },
    "luminous-supreme": { "max_tokens": 2048, "input_cost_per_token": 175e-6, "output_cost_per_token": 1925e-7, "litellm_provider": "aleph_alpha", "mode": "completion" },
    "luminous-supreme-control": { "max_tokens": 2048, "input_cost_per_token": 21875e-8, "output_cost_per_token": 240625e-9, "litellm_provider": "aleph_alpha", "mode": "chat" },
    "ai21.j2-mid-v1": { "max_tokens": 8191, "max_input_tokens": 8191, "max_output_tokens": 8191, "input_cost_per_token": 125e-7, "output_cost_per_token": 125e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "ai21.j2-ultra-v1": { "max_tokens": 8191, "max_input_tokens": 8191, "max_output_tokens": 8191, "input_cost_per_token": 188e-7, "output_cost_per_token": 188e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "ai21.jamba-instruct-v1:0": { "max_tokens": 4096, "max_input_tokens": 7e4, "max_output_tokens": 4096, "input_cost_per_token": 5e-7, "output_cost_per_token": 7e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_system_messages": true },
    "ai21.jamba-1-5-large-v1:0": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "litellm_provider": "bedrock", "mode": "chat" },
    "ai21.jamba-1-5-mini-v1:0": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 256e3, "input_cost_per_token": 2e-7, "output_cost_per_token": 4e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "amazon.rerank-v1:0": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 32e3, "max_query_tokens": 32e3, "max_document_chunks_per_query": 100, "max_tokens_per_document_chunk": 512, "input_cost_per_token": 0, "input_cost_per_query": 1e-3, "output_cost_per_token": 0, "litellm_provider": "bedrock", "mode": "rerank" },
    "amazon.titan-text-lite-v1": { "max_tokens": 4e3, "max_input_tokens": 42e3, "max_output_tokens": 4e3, "input_cost_per_token": 3e-7, "output_cost_per_token": 4e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "amazon.titan-text-express-v1": { "max_tokens": 8e3, "max_input_tokens": 42e3, "max_output_tokens": 8e3, "input_cost_per_token": 13e-7, "output_cost_per_token": 17e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "amazon.titan-text-premier-v1:0": { "max_tokens": 32e3, "max_input_tokens": 42e3, "max_output_tokens": 32e3, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "amazon.titan-embed-text-v1": { "max_tokens": 8192, "max_input_tokens": 8192, "output_vector_size": 1536, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "bedrock", "mode": "embedding" },
    "amazon.titan-embed-text-v2:0": { "max_tokens": 8192, "max_input_tokens": 8192, "output_vector_size": 1024, "input_cost_per_token": 2e-7, "output_cost_per_token": 0, "litellm_provider": "bedrock", "mode": "embedding" },
    "amazon.titan-embed-image-v1": { "max_tokens": 128, "max_input_tokens": 128, "output_vector_size": 1024, "input_cost_per_token": 8e-7, "input_cost_per_image": 6e-5, "output_cost_per_token": 0, "litellm_provider": "bedrock", "supports_image_input": true, "supports_embedding_image_input": true, "mode": "embedding", "source": "https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/providers?model=amazon.titan-image-generator-v1", "metadata": { "notes": "'supports_image_input' is a deprecated field. Use 'supports_embedding_image_input' instead." } },
    "mistral.mistral-7b-instruct-v0:2": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 15e-8, "output_cost_per_token": 2e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "mistral.mixtral-8x7b-instruct-v0:1": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 45e-8, "output_cost_per_token": 7e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "mistral.mistral-large-2402-v1:0": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "mistral.mistral-large-2407-v1:0": { "max_tokens": 8191, "max_input_tokens": 128e3, "max_output_tokens": 8191, "input_cost_per_token": 3e-6, "output_cost_per_token": 9e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "mistral.mistral-small-2402-v1:0": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 1e-6, "output_cost_per_token": 3e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "bedrock/us-west-2/mistral.mixtral-8x7b-instruct-v0:1": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 45e-8, "output_cost_per_token": 7e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/mistral.mixtral-8x7b-instruct-v0:1": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 45e-8, "output_cost_per_token": 7e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-west-3/mistral.mixtral-8x7b-instruct-v0:1": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 59e-8, "output_cost_per_token": 91e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/mistral.mistral-7b-instruct-v0:2": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 15e-8, "output_cost_per_token": 2e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/mistral.mistral-7b-instruct-v0:2": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 15e-8, "output_cost_per_token": 2e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-west-3/mistral.mistral-7b-instruct-v0:2": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 2e-7, "output_cost_per_token": 26e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/mistral.mistral-large-2402-v1:0": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "bedrock/us-west-2/mistral.mistral-large-2402-v1:0": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "bedrock/eu-west-3/mistral.mistral-large-2402-v1:0": { "max_tokens": 8191, "max_input_tokens": 32e3, "max_output_tokens": 8191, "input_cost_per_token": 104e-7, "output_cost_per_token": 312e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true },
    "amazon.nova-micro-v1:0": { "max_tokens": 1e4, "max_input_tokens": 3e5, "max_output_tokens": 1e4, "input_cost_per_token": 35e-9, "output_cost_per_token": 14e-8, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "us.amazon.nova-micro-v1:0": { "max_tokens": 1e4, "max_input_tokens": 3e5, "max_output_tokens": 1e4, "input_cost_per_token": 35e-9, "output_cost_per_token": 14e-8, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "eu.amazon.nova-micro-v1:0": { "max_tokens": 1e4, "max_input_tokens": 3e5, "max_output_tokens": 1e4, "input_cost_per_token": 46e-9, "output_cost_per_token": 184e-9, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "amazon.nova-lite-v1:0": { "max_tokens": 1e4, "max_input_tokens": 128e3, "max_output_tokens": 1e4, "input_cost_per_token": 6e-8, "output_cost_per_token": 24e-8, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "us.amazon.nova-lite-v1:0": { "max_tokens": 1e4, "max_input_tokens": 128e3, "max_output_tokens": 1e4, "input_cost_per_token": 6e-8, "output_cost_per_token": 24e-8, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "eu.amazon.nova-lite-v1:0": { "max_tokens": 1e4, "max_input_tokens": 128e3, "max_output_tokens": 1e4, "input_cost_per_token": 78e-9, "output_cost_per_token": 312e-9, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "amazon.nova-pro-v1:0": { "max_tokens": 1e4, "max_input_tokens": 3e5, "max_output_tokens": 1e4, "input_cost_per_token": 8e-7, "output_cost_per_token": 32e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "us.amazon.nova-pro-v1:0": { "max_tokens": 1e4, "max_input_tokens": 3e5, "max_output_tokens": 1e4, "input_cost_per_token": 8e-7, "output_cost_per_token": 32e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "1024-x-1024/50-steps/bedrock/amazon.nova-canvas-v1:0": { "max_input_tokens": 2600, "output_cost_per_image": 0.06, "litellm_provider": "bedrock", "mode": "image_generation" },
    "eu.amazon.nova-pro-v1:0": { "max_tokens": 1e4, "max_input_tokens": 3e5, "max_output_tokens": 1e4, "input_cost_per_token": 105e-8, "output_cost_per_token": 42e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "source": "https://aws.amazon.com/bedrock/pricing/" },
    "apac.amazon.nova-micro-v1:0": { "max_tokens": 1e4, "max_input_tokens": 3e5, "max_output_tokens": 1e4, "input_cost_per_token": 37e-9, "output_cost_per_token": 148e-9, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "apac.amazon.nova-lite-v1:0": { "max_tokens": 1e4, "max_input_tokens": 128e3, "max_output_tokens": 1e4, "input_cost_per_token": 63e-9, "output_cost_per_token": 252e-9, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "apac.amazon.nova-pro-v1:0": { "max_tokens": 1e4, "max_input_tokens": 3e5, "max_output_tokens": 1e4, "input_cost_per_token": 84e-8, "output_cost_per_token": 336e-8, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true },
    "us.amazon.nova-premier-v1:0": { "max_tokens": 1e4, "max_input_tokens": 1e6, "max_output_tokens": 1e4, "input_cost_per_token": 25e-7, "output_cost_per_token": 125e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_prompt_caching": false, "supports_response_schema": true },
    "anthropic.claude-3-sonnet-20240229-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "bedrock/invoke/anthropic.claude-3-5-sonnet-20240620-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true, "metadata": { "notes": "Anthropic via Invoke route does not currently support pdf input." } },
    "anthropic.claude-3-5-sonnet-20240620-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "anthropic.claude-opus-4-20250514-v1:0": { "max_tokens": 32e3, "max_input_tokens": 2e5, "max_output_tokens": 32e3, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 1875e-8, "cache_read_input_token_cost": 15e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "anthropic.claude-sonnet-4-20250514-v1:0": { "max_tokens": 64e3, "max_input_tokens": 2e5, "max_output_tokens": 64e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "anthropic.claude-3-7-sonnet-20250219-v1:0": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_pdf_input": true, "supports_reasoning": true, "supports_tool_choice": true },
    "anthropic.claude-3-5-sonnet-20241022-v2:0": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true },
    "anthropic.claude-3-haiku-20240307-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "anthropic.claude-3-5-haiku-20241022-v1:0": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 8e-7, "output_cost_per_token": 4e-6, "cache_creation_input_token_cost": 1e-6, "cache_read_input_token_cost": 8e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_function_calling": true, "supports_response_schema": true, "supports_prompt_caching": true, "supports_tool_choice": true },
    "anthropic.claude-3-opus-20240229-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true },
    "us.anthropic.claude-3-sonnet-20240229-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "us.anthropic.claude-3-5-sonnet-20240620-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "us.anthropic.claude-3-5-sonnet-20241022-v2:0": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true },
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_pdf_input": true, "supports_tool_choice": true, "supports_reasoning": true },
    "us.anthropic.claude-opus-4-20250514-v1:0": { "max_tokens": 32e3, "max_input_tokens": 2e5, "max_output_tokens": 32e3, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 1875e-8, "cache_read_input_token_cost": 15e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "us.anthropic.claude-sonnet-4-20250514-v1:0": { "max_tokens": 64e3, "max_input_tokens": 2e5, "max_output_tokens": 64e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "us.anthropic.claude-3-haiku-20240307-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "us.anthropic.claude-3-5-haiku-20241022-v1:0": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 8e-7, "output_cost_per_token": 4e-6, "cache_creation_input_token_cost": 1e-6, "cache_read_input_token_cost": 8e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_function_calling": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true },
    "us.anthropic.claude-3-opus-20240229-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true },
    "eu.anthropic.claude-3-sonnet-20240229-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "eu.anthropic.claude-3-5-sonnet-20240620-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "eu.anthropic.claude-3-5-sonnet-20241022-v2:0": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_pdf_input": true, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true },
    "eu.anthropic.claude-3-7-sonnet-20250219-v1:0": { "supports_computer_use": true, "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_pdf_input": true, "supports_tool_choice": true, "supports_reasoning": true },
    "eu.anthropic.claude-3-haiku-20240307-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "eu.anthropic.claude-opus-4-20250514-v1:0": { "max_tokens": 32e3, "max_input_tokens": 2e5, "max_output_tokens": 32e3, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 1875e-8, "cache_read_input_token_cost": 15e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "eu.anthropic.claude-sonnet-4-20250514-v1:0": { "max_tokens": 64e3, "max_input_tokens": 2e5, "max_output_tokens": 64e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "apac.anthropic.claude-3-haiku-20240307-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "apac.anthropic.claude-3-sonnet-20240229-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "apac.anthropic.claude-3-5-sonnet-20240620-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_pdf_input": true, "supports_tool_choice": true },
    "apac.anthropic.claude-3-5-sonnet-20241022-v2:0": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "supports_assistant_prefill": true, "supports_computer_use": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true },
    "apac.anthropic.claude-sonnet-4-20250514-v1:0": { "max_tokens": 64e3, "max_input_tokens": 2e5, "max_output_tokens": 64e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "search_context_cost_per_query": { "search_context_size_low": 0.01, "search_context_size_medium": 0.01, "search_context_size_high": 0.01 }, "cache_creation_input_token_cost": 375e-8, "cache_read_input_token_cost": 3e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_vision": true, "tool_use_system_prompt_tokens": 159, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true, "supports_reasoning": true, "supports_computer_use": true },
    "eu.anthropic.claude-3-5-haiku-20241022-v1:0": { "max_tokens": 8192, "max_input_tokens": 2e5, "max_output_tokens": 8192, "input_cost_per_token": 25e-8, "output_cost_per_token": 125e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_assistant_prefill": true, "supports_pdf_input": true, "supports_prompt_caching": true, "supports_response_schema": true, "supports_tool_choice": true },
    "eu.anthropic.claude-3-opus-20240229-v1:0": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 15e-6, "output_cost_per_token": 75e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_vision": true, "supports_tool_choice": true },
    "anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/us-east-1/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/1-month-commitment/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0455, "output_cost_per_second": 0.0455, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/ap-northeast-1/6-month-commitment/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.02527, "output_cost_per_second": 0.02527, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/eu-central-1/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/eu-central-1/1-month-commitment/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0415, "output_cost_per_second": 0.0415, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/eu-central-1/6-month-commitment/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.02305, "output_cost_per_second": 0.02305, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/us-east-1/1-month-commitment/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0175, "output_cost_per_second": 0.0175, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/us-east-1/6-month-commitment/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 972e-5, "output_cost_per_second": 972e-5, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/us-west-2/1-month-commitment/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0175, "output_cost_per_second": 0.0175, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/us-west-2/6-month-commitment/anthropic.claude-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 972e-5, "output_cost_per_second": 972e-5, "litellm_provider": "bedrock", "mode": "chat" },
    "anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/1-month-commitment/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0455, "output_cost_per_second": 0.0455, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/6-month-commitment/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.02527, "output_cost_per_second": 0.02527, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-central-1/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-central-1/1-month-commitment/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0415, "output_cost_per_second": 0.0415, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-central-1/6-month-commitment/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.02305, "output_cost_per_second": 0.02305, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/1-month-commitment/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0175, "output_cost_per_second": 0.0175, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/6-month-commitment/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 972e-5, "output_cost_per_second": 972e-5, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/1-month-commitment/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0175, "output_cost_per_second": 0.0175, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/6-month-commitment/anthropic.claude-v2": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 972e-5, "output_cost_per_second": 972e-5, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/1-month-commitment/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0455, "output_cost_per_second": 0.0455, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/6-month-commitment/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.02527, "output_cost_per_second": 0.02527, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-central-1/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-6, "output_cost_per_token": 24e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-central-1/1-month-commitment/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0415, "output_cost_per_second": 0.0415, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-central-1/6-month-commitment/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.02305, "output_cost_per_second": 0.02305, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/1-month-commitment/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0175, "output_cost_per_second": 0.0175, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/6-month-commitment/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 972e-5, "output_cost_per_second": 972e-5, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/1-month-commitment/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.0175, "output_cost_per_second": 0.0175, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/6-month-commitment/anthropic.claude-v2:1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 972e-5, "output_cost_per_second": 972e-5, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-7, "output_cost_per_token": 24e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-7, "output_cost_per_token": 24e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/1-month-commitment/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.011, "output_cost_per_second": 0.011, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-east-1/6-month-commitment/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 611e-5, "output_cost_per_second": 611e-5, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/1-month-commitment/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.011, "output_cost_per_second": 0.011, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/6-month-commitment/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 611e-5, "output_cost_per_second": 611e-5, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/us-west-2/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 8e-7, "output_cost_per_token": 24e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 223e-8, "output_cost_per_token": 755e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/1-month-commitment/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.01475, "output_cost_per_second": 0.01475, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/ap-northeast-1/6-month-commitment/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 8194e-6, "output_cost_per_second": 8194e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-central-1/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_token": 248e-8, "output_cost_per_token": 838e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-central-1/1-month-commitment/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 0.01635, "output_cost_per_second": 0.01635, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/eu-central-1/6-month-commitment/anthropic.claude-instant-v1": { "max_tokens": 8191, "max_input_tokens": 1e5, "max_output_tokens": 8191, "input_cost_per_second": 9083e-6, "output_cost_per_second": 9083e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "cohere.rerank-v3-5:0": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 32e3, "max_query_tokens": 32e3, "max_document_chunks_per_query": 100, "max_tokens_per_document_chunk": 512, "input_cost_per_token": 0, "input_cost_per_query": 2e-3, "output_cost_per_token": 0, "litellm_provider": "bedrock", "mode": "rerank" },
    "cohere.command-text-v14": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 15e-7, "output_cost_per_token": 2e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/*/1-month-commitment/cohere.command-text-v14": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_second": 0.011, "output_cost_per_second": 0.011, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/*/6-month-commitment/cohere.command-text-v14": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_second": 66027e-7, "output_cost_per_second": 66027e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "cohere.command-light-text-v14": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 3e-7, "output_cost_per_token": 6e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/*/1-month-commitment/cohere.command-light-text-v14": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_second": 1902e-6, "output_cost_per_second": 1902e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "bedrock/*/6-month-commitment/cohere.command-light-text-v14": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_second": 11416e-7, "output_cost_per_second": 11416e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "cohere.command-r-plus-v1:0": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "cohere.command-r-v1:0": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 5e-7, "output_cost_per_token": 15e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_tool_choice": true },
    "cohere.embed-english-v3": { "max_tokens": 512, "max_input_tokens": 512, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "bedrock", "mode": "embedding", "supports_embedding_image_input": true },
    "cohere.embed-multilingual-v3": { "max_tokens": 512, "max_input_tokens": 512, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "bedrock", "mode": "embedding", "supports_embedding_image_input": true },
    "us.deepseek.r1-v1:0": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 135e-8, "output_cost_per_token": 54e-7, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_reasoning": true, "supports_function_calling": false, "supports_tool_choice": false },
    "meta.llama3-3-70b-instruct-v1:0": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 72e-8, "output_cost_per_token": 72e-8, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "meta.llama2-13b-chat-v1": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 75e-8, "output_cost_per_token": 1e-6, "litellm_provider": "bedrock", "mode": "chat" },
    "meta.llama2-70b-chat-v1": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 195e-8, "output_cost_per_token": 256e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "meta.llama3-8b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 3e-7, "output_cost_per_token": 6e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/us-east-1/meta.llama3-8b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 3e-7, "output_cost_per_token": 6e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/us-west-1/meta.llama3-8b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 3e-7, "output_cost_per_token": 6e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/ap-south-1/meta.llama3-8b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 36e-8, "output_cost_per_token": 72e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/ca-central-1/meta.llama3-8b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 35e-8, "output_cost_per_token": 69e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/eu-west-1/meta.llama3-8b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 32e-8, "output_cost_per_token": 65e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/eu-west-2/meta.llama3-8b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 39e-8, "output_cost_per_token": 78e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/sa-east-1/meta.llama3-8b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 5e-7, "output_cost_per_token": 101e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "meta.llama3-70b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 265e-8, "output_cost_per_token": 35e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/us-east-1/meta.llama3-70b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 265e-8, "output_cost_per_token": 35e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/us-west-1/meta.llama3-70b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 265e-8, "output_cost_per_token": 35e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/ap-south-1/meta.llama3-70b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 318e-8, "output_cost_per_token": 42e-7, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/ca-central-1/meta.llama3-70b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 305e-8, "output_cost_per_token": 403e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/eu-west-1/meta.llama3-70b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 286e-8, "output_cost_per_token": 378e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/eu-west-2/meta.llama3-70b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 345e-8, "output_cost_per_token": 455e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "bedrock/sa-east-1/meta.llama3-70b-instruct-v1:0": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 445e-8, "output_cost_per_token": 588e-8, "litellm_provider": "bedrock", "mode": "chat" },
    "meta.llama3-1-8b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 22e-8, "output_cost_per_token": 22e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "us.meta.llama3-1-8b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 22e-8, "output_cost_per_token": 22e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "meta.llama3-1-70b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 99e-8, "output_cost_per_token": 99e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "us.meta.llama3-1-70b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 2048, "input_cost_per_token": 99e-8, "output_cost_per_token": 99e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "meta.llama3-1-405b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 532e-8, "output_cost_per_token": 16e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "us.meta.llama3-1-405b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 532e-8, "output_cost_per_token": 16e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "meta.llama3-2-1b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-7, "output_cost_per_token": 1e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "us.meta.llama3-2-1b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 1e-7, "output_cost_per_token": 1e-7, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "eu.meta.llama3-2-1b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 13e-8, "output_cost_per_token": 13e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "meta.llama3-2-3b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "us.meta.llama3-2-3b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "eu.meta.llama3-2-3b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 19e-8, "output_cost_per_token": 19e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "meta.llama3-2-11b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 35e-8, "output_cost_per_token": 35e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false, "supports_vision": true },
    "us.meta.llama3-2-11b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 35e-8, "output_cost_per_token": 35e-8, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false, "supports_vision": true },
    "meta.llama3-2-90b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 2e-6, "output_cost_per_token": 2e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false, "supports_vision": true },
    "us.meta.llama3-2-90b-instruct-v1:0": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 2e-6, "output_cost_per_token": 2e-6, "litellm_provider": "bedrock", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false, "supports_vision": true },
    "us.meta.llama3-3-70b-instruct-v1:0": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 72e-8, "output_cost_per_token": 72e-8, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false },
    "meta.llama4-maverick-17b-instruct-v1:0": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 24e-8, "input_cost_per_token_batches": 12e-8, "output_cost_per_token": 97e-8, "output_cost_per_token_batches": 485e-9, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text", "code"] },
    "us.meta.llama4-maverick-17b-instruct-v1:0": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 24e-8, "input_cost_per_token_batches": 12e-8, "output_cost_per_token": 97e-8, "output_cost_per_token_batches": 485e-9, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text", "code"] },
    "meta.llama4-scout-17b-instruct-v1:0": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 17e-8, "input_cost_per_token_batches": 85e-9, "output_cost_per_token": 66e-8, "output_cost_per_token_batches": 33e-8, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text", "code"] },
    "us.meta.llama4-scout-17b-instruct-v1:0": { "max_tokens": 4096, "max_input_tokens": 128e3, "max_output_tokens": 4096, "input_cost_per_token": 17e-8, "input_cost_per_token_batches": 85e-9, "output_cost_per_token": 66e-8, "output_cost_per_token_batches": 33e-8, "litellm_provider": "bedrock_converse", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": false, "supported_modalities": ["text", "image"], "supported_output_modalities": ["text", "code"] },
    "512-x-512/50-steps/stability.stable-diffusion-xl-v0": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.018, "litellm_provider": "bedrock", "mode": "image_generation" },
    "512-x-512/max-steps/stability.stable-diffusion-xl-v0": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.036, "litellm_provider": "bedrock", "mode": "image_generation" },
    "max-x-max/50-steps/stability.stable-diffusion-xl-v0": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.036, "litellm_provider": "bedrock", "mode": "image_generation" },
    "max-x-max/max-steps/stability.stable-diffusion-xl-v0": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.072, "litellm_provider": "bedrock", "mode": "image_generation" },
    "1024-x-1024/50-steps/stability.stable-diffusion-xl-v1": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.04, "litellm_provider": "bedrock", "mode": "image_generation" },
    "1024-x-1024/max-steps/stability.stable-diffusion-xl-v1": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.08, "litellm_provider": "bedrock", "mode": "image_generation" },
    "stability.sd3-large-v1:0": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.08, "litellm_provider": "bedrock", "mode": "image_generation" },
    "stability.sd3-5-large-v1:0": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.08, "litellm_provider": "bedrock", "mode": "image_generation" },
    "stability.stable-image-core-v1:0": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.04, "litellm_provider": "bedrock", "mode": "image_generation" },
    "stability.stable-image-core-v1:1": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.04, "litellm_provider": "bedrock", "mode": "image_generation" },
    "stability.stable-image-ultra-v1:0": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.14, "litellm_provider": "bedrock", "mode": "image_generation" },
    "stability.stable-image-ultra-v1:1": { "max_tokens": 77, "max_input_tokens": 77, "output_cost_per_image": 0.14, "litellm_provider": "bedrock", "mode": "image_generation" },
    "sagemaker/meta-textgeneration-llama-2-7b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "sagemaker", "mode": "completion" },
    "sagemaker/meta-textgeneration-llama-2-7b-f": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "sagemaker", "mode": "chat" },
    "sagemaker/meta-textgeneration-llama-2-13b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "sagemaker", "mode": "completion" },
    "sagemaker/meta-textgeneration-llama-2-13b-f": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "sagemaker", "mode": "chat" },
    "sagemaker/meta-textgeneration-llama-2-70b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "sagemaker", "mode": "completion" },
    "sagemaker/meta-textgeneration-llama-2-70b-b-f": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "sagemaker", "mode": "chat" },
    "together-ai-up-to-4b": { "input_cost_per_token": 1e-7, "output_cost_per_token": 1e-7, "litellm_provider": "together_ai", "mode": "chat" },
    "together-ai-4.1b-8b": { "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "together_ai", "mode": "chat" },
    "together-ai-8.1b-21b": { "max_tokens": 1e3, "input_cost_per_token": 3e-7, "output_cost_per_token": 3e-7, "litellm_provider": "together_ai", "mode": "chat" },
    "together-ai-21.1b-41b": { "input_cost_per_token": 8e-7, "output_cost_per_token": 8e-7, "litellm_provider": "together_ai", "mode": "chat" },
    "together-ai-41.1b-80b": { "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "together_ai", "mode": "chat" },
    "together-ai-81.1b-110b": { "input_cost_per_token": 18e-7, "output_cost_per_token": 18e-7, "litellm_provider": "together_ai", "mode": "chat" },
    "together-ai-embedding-up-to-150m": { "input_cost_per_token": 8e-9, "output_cost_per_token": 0, "litellm_provider": "together_ai", "mode": "embedding" },
    "together-ai-embedding-151m-to-350m": { "input_cost_per_token": 16e-9, "output_cost_per_token": 0, "litellm_provider": "together_ai", "mode": "embedding" },
    "together_ai/meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo": { "input_cost_per_token": 18e-8, "output_cost_per_token": 18e-8, "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo": { "input_cost_per_token": 88e-8, "output_cost_per_token": 88e-8, "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo": { "input_cost_per_token": 35e-7, "output_cost_per_token": 35e-7, "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/meta-llama/Llama-3.3-70B-Instruct-Turbo": { "input_cost_per_token": 88e-8, "output_cost_per_token": 88e-8, "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/meta-llama/Llama-3.3-70B-Instruct-Turbo-Free": { "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/mistralai/Mixtral-8x7B-Instruct-v0.1": { "input_cost_per_token": 6e-7, "output_cost_per_token": 6e-7, "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/mistralai/Mistral-7B-Instruct-v0.1": { "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_response_schema": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/togethercomputer/CodeLlama-34b-Instruct": { "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8": { "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/meta-llama/Llama-4-Scout-17B-16E-Instruct": { "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/meta-llama/Llama-3.2-3B-Instruct-Turbo": { "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/Qwen/Qwen2.5-7B-Instruct-Turbo": { "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/Qwen/Qwen2.5-72B-Instruct-Turbo": { "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/deepseek-ai/DeepSeek-V3": { "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "together_ai/mistralai/Mistral-Small-24B-Instruct-2501": { "litellm_provider": "together_ai", "supports_function_calling": true, "supports_parallel_function_calling": true, "mode": "chat", "supports_tool_choice": true },
    "ollama/codegemma": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "completion" },
    "ollama/codegeex4": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": false },
    "ollama/deepseek-coder-v2-instruct": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": true },
    "ollama/deepseek-coder-v2-base": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "completion", "supports_function_calling": true },
    "ollama/deepseek-coder-v2-lite-instruct": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": true },
    "ollama/deepseek-coder-v2-lite-base": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "completion", "supports_function_calling": true },
    "ollama/internlm2_5-20b-chat": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": true },
    "ollama/llama2": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat" },
    "ollama/llama2:7b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat" },
    "ollama/llama2:13b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat" },
    "ollama/llama2:70b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat" },
    "ollama/llama2-uncensored": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "completion" },
    "ollama/llama3": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat" },
    "ollama/llama3:8b": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat" },
    "ollama/llama3:70b": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat" },
    "ollama/llama3.1": { "max_tokens": 32768, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": true },
    "ollama/mistral-large-instruct-2407": { "max_tokens": 65536, "max_input_tokens": 65536, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": true },
    "ollama/mistral": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "completion", "supports_function_calling": true },
    "ollama/mistral-7B-Instruct-v0.1": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": true },
    "ollama/mistral-7B-Instruct-v0.2": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": true },
    "ollama/mixtral-8x7B-Instruct-v0.1": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": true },
    "ollama/mixtral-8x22B-Instruct-v0.1": { "max_tokens": 65536, "max_input_tokens": 65536, "max_output_tokens": 65536, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "chat", "supports_function_calling": true },
    "ollama/codellama": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "completion" },
    "ollama/orca-mini": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "completion" },
    "ollama/vicuna": { "max_tokens": 2048, "max_input_tokens": 2048, "max_output_tokens": 2048, "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "ollama", "mode": "completion" },
    "deepinfra/lizpreciatior/lzlv_70b_fp16_hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 7e-7, "output_cost_per_token": 9e-7, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/Gryphe/MythoMax-L2-13b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 22e-8, "output_cost_per_token": 22e-8, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/mistralai/Mistral-7B-Instruct-v0.1": { "max_tokens": 8191, "max_input_tokens": 32768, "max_output_tokens": 8191, "input_cost_per_token": 13e-8, "output_cost_per_token": 13e-8, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/meta-llama/Llama-2-70b-chat-hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 7e-7, "output_cost_per_token": 9e-7, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/cognitivecomputations/dolphin-2.6-mixtral-8x7b": { "max_tokens": 8191, "max_input_tokens": 32768, "max_output_tokens": 8191, "input_cost_per_token": 27e-8, "output_cost_per_token": 27e-8, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/codellama/CodeLlama-34b-Instruct-hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 6e-7, "output_cost_per_token": 6e-7, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/deepinfra/mixtral": { "max_tokens": 4096, "max_input_tokens": 32e3, "max_output_tokens": 4096, "input_cost_per_token": 27e-8, "output_cost_per_token": 27e-8, "litellm_provider": "deepinfra", "mode": "completion" },
    "deepinfra/Phind/Phind-CodeLlama-34B-v2": { "max_tokens": 4096, "max_input_tokens": 16384, "max_output_tokens": 4096, "input_cost_per_token": 6e-7, "output_cost_per_token": 6e-7, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/mistralai/Mixtral-8x7B-Instruct-v0.1": { "max_tokens": 8191, "max_input_tokens": 32768, "max_output_tokens": 8191, "input_cost_per_token": 27e-8, "output_cost_per_token": 27e-8, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/deepinfra/airoboros-70b": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 7e-7, "output_cost_per_token": 9e-7, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/01-ai/Yi-34B-Chat": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 6e-7, "output_cost_per_token": 6e-7, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/01-ai/Yi-6B-200K": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 13e-8, "output_cost_per_token": 13e-8, "litellm_provider": "deepinfra", "mode": "completion" },
    "deepinfra/jondurbin/airoboros-l2-70b-gpt4-1.4.1": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 7e-7, "output_cost_per_token": 9e-7, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/meta-llama/Llama-2-13b-chat-hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 22e-8, "output_cost_per_token": 22e-8, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/amazon/MistralLite": { "max_tokens": 8191, "max_input_tokens": 32768, "max_output_tokens": 8191, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/meta-llama/Llama-2-7b-chat-hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 13e-8, "output_cost_per_token": 13e-8, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/meta-llama/Meta-Llama-3-8B-Instruct": { "max_tokens": 8191, "max_input_tokens": 8191, "max_output_tokens": 4096, "input_cost_per_token": 8e-8, "output_cost_per_token": 8e-8, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/meta-llama/Meta-Llama-3-70B-Instruct": { "max_tokens": 8191, "max_input_tokens": 8191, "max_output_tokens": 4096, "input_cost_per_token": 59e-8, "output_cost_per_token": 79e-8, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "deepinfra/meta-llama/Meta-Llama-3.1-405B-Instruct": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "deepinfra", "mode": "chat", "supports_function_calling": true, "supports_parallel_function_calling": true, "supports_tool_choice": true },
    "deepinfra/01-ai/Yi-34B-200K": { "max_tokens": 4096, "max_input_tokens": 2e5, "max_output_tokens": 4096, "input_cost_per_token": 6e-7, "output_cost_per_token": 6e-7, "litellm_provider": "deepinfra", "mode": "completion" },
    "deepinfra/openchat/openchat_3.5": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 13e-8, "output_cost_per_token": 13e-8, "litellm_provider": "deepinfra", "mode": "chat", "supports_tool_choice": true },
    "perplexity/codellama-34b-instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 35e-8, "output_cost_per_token": 14e-7, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/codellama-70b-instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 7e-7, "output_cost_per_token": 28e-7, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/llama-3.1-70b-instruct": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 1e-6, "output_cost_per_token": 1e-6, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/llama-3.1-8b-instruct": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/llama-3.1-sonar-huge-128k-online": { "max_tokens": 127072, "max_input_tokens": 127072, "max_output_tokens": 127072, "input_cost_per_token": 5e-6, "output_cost_per_token": 5e-6, "litellm_provider": "perplexity", "mode": "chat", "deprecation_date": "2025-02-22" },
    "perplexity/llama-3.1-sonar-large-128k-online": { "max_tokens": 127072, "max_input_tokens": 127072, "max_output_tokens": 127072, "input_cost_per_token": 1e-6, "output_cost_per_token": 1e-6, "litellm_provider": "perplexity", "mode": "chat", "deprecation_date": "2025-02-22" },
    "perplexity/llama-3.1-sonar-large-128k-chat": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 1e-6, "output_cost_per_token": 1e-6, "litellm_provider": "perplexity", "mode": "chat", "deprecation_date": "2025-02-22" },
    "perplexity/llama-3.1-sonar-small-128k-chat": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "perplexity", "mode": "chat", "deprecation_date": "2025-02-22" },
    "perplexity/llama-3.1-sonar-small-128k-online": { "max_tokens": 127072, "max_input_tokens": 127072, "max_output_tokens": 127072, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "perplexity", "mode": "chat", "deprecation_date": "2025-02-22" },
    "perplexity/pplx-7b-chat": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 7e-8, "output_cost_per_token": 28e-8, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/pplx-70b-chat": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 7e-7, "output_cost_per_token": 28e-7, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/pplx-7b-online": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 28e-8, "input_cost_per_request": 5e-3, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/pplx-70b-online": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 0, "output_cost_per_token": 28e-7, "input_cost_per_request": 5e-3, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/llama-2-70b-chat": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 7e-7, "output_cost_per_token": 28e-7, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/mistral-7b-instruct": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 7e-8, "output_cost_per_token": 28e-8, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/mixtral-8x7b-instruct": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 7e-8, "output_cost_per_token": 28e-8, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/sonar-small-chat": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 7e-8, "output_cost_per_token": 28e-8, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/sonar-small-online": { "max_tokens": 12e3, "max_input_tokens": 12e3, "max_output_tokens": 12e3, "input_cost_per_token": 0, "output_cost_per_token": 28e-8, "input_cost_per_request": 5e-3, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/sonar-medium-chat": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 6e-7, "output_cost_per_token": 18e-7, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/sonar-medium-online": { "max_tokens": 12e3, "max_input_tokens": 12e3, "max_output_tokens": 12e3, "input_cost_per_token": 0, "output_cost_per_token": 18e-7, "input_cost_per_request": 5e-3, "litellm_provider": "perplexity", "mode": "chat" },
    "perplexity/sonar": { "max_tokens": 128e3, "max_input_tokens": 128e3, "input_cost_per_token": 1e-6, "output_cost_per_token": 1e-6, "litellm_provider": "perplexity", "mode": "chat", "search_context_cost_per_query": { "search_context_size_low": 5e-3, "search_context_size_medium": 8e-3, "search_context_size_high": 0.012 }, "supports_web_search": true },
    "perplexity/sonar-pro": { "max_tokens": 8e3, "max_input_tokens": 2e5, "max_output_tokens": 8e3, "input_cost_per_token": 3e-6, "output_cost_per_token": 15e-6, "litellm_provider": "perplexity", "mode": "chat", "search_context_cost_per_query": { "search_context_size_low": 6e-3, "search_context_size_medium": 0.01, "search_context_size_high": 0.014 }, "supports_web_search": true },
    "perplexity/sonar-reasoning": { "max_tokens": 128e3, "max_input_tokens": 128e3, "input_cost_per_token": 1e-6, "output_cost_per_token": 5e-6, "litellm_provider": "perplexity", "mode": "chat", "search_context_cost_per_query": { "search_context_size_low": 5e-3, "search_context_size_medium": 8e-3, "search_context_size_high": 0.014 }, "supports_web_search": true, "supports_reasoning": true },
    "perplexity/sonar-reasoning-pro": { "max_tokens": 128e3, "max_input_tokens": 128e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "litellm_provider": "perplexity", "mode": "chat", "search_context_cost_per_query": { "search_context_size_low": 6e-3, "search_context_size_medium": 0.01, "search_context_size_high": 0.014 }, "supports_web_search": true, "supports_reasoning": true },
    "perplexity/sonar-deep-research": { "max_tokens": 128e3, "max_input_tokens": 128e3, "input_cost_per_token": 2e-6, "output_cost_per_token": 8e-6, "output_cost_per_reasoning_token": 3e-6, "citation_cost_per_token": 2e-6, "search_context_cost_per_query": { "search_context_size_low": 5e-3, "search_context_size_medium": 5e-3, "search_context_size_high": 5e-3 }, "litellm_provider": "perplexity", "mode": "chat", "supports_reasoning": true, "supports_web_search": true },
    "fireworks_ai/accounts/fireworks/models/llama-v3p2-1b-instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 1e-7, "output_cost_per_token": 1e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": false, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/llama-v3p2-3b-instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 1e-7, "output_cost_per_token": 1e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": false, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/llama-v3p1-8b-instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 1e-7, "output_cost_per_token": 1e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": false, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/llama-v3p2-11b-vision-instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": false, "supports_vision": true, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/llama-v3p2-90b-vision-instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_tool_choice": false, "supports_vision": true, "supports_response_schema": true, "source": "https://fireworks.ai/pricing" },
    "fireworks_ai/accounts/fireworks/models/firefunction-v2": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": true },
    "fireworks_ai/accounts/fireworks/models/mixtral-8x22b-instruct-hf": { "max_tokens": 65536, "max_input_tokens": 65536, "max_output_tokens": 65536, "input_cost_per_token": 12e-7, "output_cost_per_token": 12e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": true },
    "fireworks_ai/accounts/fireworks/models/qwen2-72b-instruct": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": false, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/qwen2p5-coder-32b-instruct": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": false, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/yi-large": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 3e-6, "output_cost_per_token": 3e-6, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": false, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/deepseek-coder-v2-instruct": { "max_tokens": 65536, "max_input_tokens": 65536, "max_output_tokens": 65536, "input_cost_per_token": 12e-7, "output_cost_per_token": 12e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_function_calling": false, "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/deepseek-v3": { "max_tokens": 8192, "max_input_tokens": 128e3, "max_output_tokens": 8192, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/deepseek-r1": { "max_tokens": 20480, "max_input_tokens": 128e3, "max_output_tokens": 20480, "input_cost_per_token": 3e-6, "output_cost_per_token": 8e-6, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/deepseek-r1-basic": { "max_tokens": 20480, "max_input_tokens": 128e3, "max_output_tokens": 20480, "input_cost_per_token": 55e-8, "output_cost_per_token": 219e-8, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/deepseek-r1-0528": { "max_tokens": 16e4, "max_input_tokens": 16e4, "max_output_tokens": 16e4, "input_cost_per_token": 3e-6, "output_cost_per_token": 8e-6, "litellm_provider": "fireworks_ai", "mode": "chat", "source": "https://fireworks.ai/pricing", "supports_tool_choice": false, "supports_response_schema": true },
    "fireworks_ai/accounts/fireworks/models/llama-v3p1-405b-instruct": { "max_tokens": 16384, "max_input_tokens": 128e3, "max_output_tokens": 16384, "input_cost_per_token": 3e-6, "output_cost_per_token": 3e-6, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": true, "supports_function_calling": true },
    "fireworks_ai/accounts/fireworks/models/llama4-maverick-instruct-basic": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 22e-8, "output_cost_per_token": 88e-8, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/accounts/fireworks/models/llama4-scout-instruct-basic": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 15e-8, "output_cost_per_token": 6e-7, "litellm_provider": "fireworks_ai", "mode": "chat", "supports_response_schema": true, "source": "https://fireworks.ai/pricing", "supports_tool_choice": false },
    "fireworks_ai/nomic-ai/nomic-embed-text-v1.5": { "max_tokens": 8192, "max_input_tokens": 8192, "input_cost_per_token": 8e-9, "output_cost_per_token": 0, "litellm_provider": "fireworks_ai-embedding-models", "mode": "embedding", "source": "https://fireworks.ai/pricing" },
    "fireworks_ai/nomic-ai/nomic-embed-text-v1": { "max_tokens": 8192, "max_input_tokens": 8192, "input_cost_per_token": 8e-9, "output_cost_per_token": 0, "litellm_provider": "fireworks_ai-embedding-models", "mode": "embedding", "source": "https://fireworks.ai/pricing" },
    "fireworks_ai/WhereIsAI/UAE-Large-V1": { "max_tokens": 512, "max_input_tokens": 512, "input_cost_per_token": 16e-9, "output_cost_per_token": 0, "litellm_provider": "fireworks_ai-embedding-models", "mode": "embedding", "source": "https://fireworks.ai/pricing" },
    "fireworks_ai/thenlper/gte-large": { "max_tokens": 512, "max_input_tokens": 512, "input_cost_per_token": 16e-9, "output_cost_per_token": 0, "litellm_provider": "fireworks_ai-embedding-models", "mode": "embedding", "source": "https://fireworks.ai/pricing" },
    "fireworks_ai/thenlper/gte-base": { "max_tokens": 512, "max_input_tokens": 512, "input_cost_per_token": 8e-9, "output_cost_per_token": 0, "litellm_provider": "fireworks_ai-embedding-models", "mode": "embedding", "source": "https://fireworks.ai/pricing" },
    "fireworks-ai-up-to-4b": { "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "fireworks_ai" },
    "fireworks-ai-4.1b-to-16b": { "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "fireworks_ai" },
    "fireworks-ai-above-16b": { "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "fireworks_ai" },
    "fireworks-ai-moe-up-to-56b": { "input_cost_per_token": 5e-7, "output_cost_per_token": 5e-7, "litellm_provider": "fireworks_ai" },
    "fireworks-ai-56b-to-176b": { "input_cost_per_token": 12e-7, "output_cost_per_token": 12e-7, "litellm_provider": "fireworks_ai" },
    "fireworks-ai-default": { "input_cost_per_token": 0, "output_cost_per_token": 0, "litellm_provider": "fireworks_ai" },
    "fireworks-ai-embedding-up-to-150m": { "input_cost_per_token": 8e-9, "output_cost_per_token": 0, "litellm_provider": "fireworks_ai-embedding-models" },
    "fireworks-ai-embedding-150m-to-350m": { "input_cost_per_token": 16e-9, "output_cost_per_token": 0, "litellm_provider": "fireworks_ai-embedding-models" },
    "anyscale/mistralai/Mistral-7B-Instruct-v0.1": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "anyscale", "mode": "chat", "supports_function_calling": true, "source": "https://docs.anyscale.com/preview/endpoints/text-generation/supported-models/mistralai-Mistral-7B-Instruct-v0.1" },
    "anyscale/mistralai/Mixtral-8x7B-Instruct-v0.1": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "anyscale", "mode": "chat", "supports_function_calling": true, "source": "https://docs.anyscale.com/preview/endpoints/text-generation/supported-models/mistralai-Mixtral-8x7B-Instruct-v0.1" },
    "anyscale/mistralai/Mixtral-8x22B-Instruct-v0.1": { "max_tokens": 65536, "max_input_tokens": 65536, "max_output_tokens": 65536, "input_cost_per_token": 9e-7, "output_cost_per_token": 9e-7, "litellm_provider": "anyscale", "mode": "chat", "supports_function_calling": true, "source": "https://docs.anyscale.com/preview/endpoints/text-generation/supported-models/mistralai-Mixtral-8x22B-Instruct-v0.1" },
    "anyscale/HuggingFaceH4/zephyr-7b-beta": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "anyscale", "mode": "chat" },
    "anyscale/google/gemma-7b-it": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "anyscale", "mode": "chat", "source": "https://docs.anyscale.com/preview/endpoints/text-generation/supported-models/google-gemma-7b-it" },
    "anyscale/meta-llama/Llama-2-7b-chat-hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "anyscale", "mode": "chat" },
    "anyscale/meta-llama/Llama-2-13b-chat-hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 25e-8, "output_cost_per_token": 25e-8, "litellm_provider": "anyscale", "mode": "chat" },
    "anyscale/meta-llama/Llama-2-70b-chat-hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 1e-6, "output_cost_per_token": 1e-6, "litellm_provider": "anyscale", "mode": "chat" },
    "anyscale/codellama/CodeLlama-34b-Instruct-hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 1e-6, "output_cost_per_token": 1e-6, "litellm_provider": "anyscale", "mode": "chat" },
    "anyscale/codellama/CodeLlama-70b-Instruct-hf": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 1e-6, "output_cost_per_token": 1e-6, "litellm_provider": "anyscale", "mode": "chat", "source": "https://docs.anyscale.com/preview/endpoints/text-generation/supported-models/codellama-CodeLlama-70b-Instruct-hf" },
    "anyscale/meta-llama/Meta-Llama-3-8B-Instruct": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "anyscale", "mode": "chat", "source": "https://docs.anyscale.com/preview/endpoints/text-generation/supported-models/meta-llama-Meta-Llama-3-8B-Instruct" },
    "anyscale/meta-llama/Meta-Llama-3-70B-Instruct": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 1e-6, "output_cost_per_token": 1e-6, "litellm_provider": "anyscale", "mode": "chat", "source": "https://docs.anyscale.com/preview/endpoints/text-generation/supported-models/meta-llama-Meta-Llama-3-70B-Instruct" },
    "cloudflare/@cf/meta/llama-2-7b-chat-fp16": { "max_tokens": 3072, "max_input_tokens": 3072, "max_output_tokens": 3072, "input_cost_per_token": 1923e-9, "output_cost_per_token": 1923e-9, "litellm_provider": "cloudflare", "mode": "chat" },
    "cloudflare/@cf/meta/llama-2-7b-chat-int8": { "max_tokens": 2048, "max_input_tokens": 2048, "max_output_tokens": 2048, "input_cost_per_token": 1923e-9, "output_cost_per_token": 1923e-9, "litellm_provider": "cloudflare", "mode": "chat" },
    "cloudflare/@cf/mistral/mistral-7b-instruct-v0.1": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 1923e-9, "output_cost_per_token": 1923e-9, "litellm_provider": "cloudflare", "mode": "chat" },
    "cloudflare/@hf/thebloke/codellama-7b-instruct-awq": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 1923e-9, "output_cost_per_token": 1923e-9, "litellm_provider": "cloudflare", "mode": "chat" },
    "voyage/voyage-01": { "max_tokens": 4096, "max_input_tokens": 4096, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-lite-01": { "max_tokens": 4096, "max_input_tokens": 4096, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-large-2": { "max_tokens": 16e3, "max_input_tokens": 16e3, "input_cost_per_token": 12e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-finance-2": { "max_tokens": 32e3, "max_input_tokens": 32e3, "input_cost_per_token": 12e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-lite-02-instruct": { "max_tokens": 4e3, "max_input_tokens": 4e3, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-law-2": { "max_tokens": 16e3, "max_input_tokens": 16e3, "input_cost_per_token": 12e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-code-2": { "max_tokens": 16e3, "max_input_tokens": 16e3, "input_cost_per_token": 12e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-2": { "max_tokens": 4e3, "max_input_tokens": 4e3, "input_cost_per_token": 1e-7, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-3-large": { "max_tokens": 32e3, "max_input_tokens": 32e3, "input_cost_per_token": 18e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-3": { "max_tokens": 32e3, "max_input_tokens": 32e3, "input_cost_per_token": 6e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-3-lite": { "max_tokens": 32e3, "max_input_tokens": 32e3, "input_cost_per_token": 2e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-code-3": { "max_tokens": 32e3, "max_input_tokens": 32e3, "input_cost_per_token": 18e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/voyage-multimodal-3": { "max_tokens": 32e3, "max_input_tokens": 32e3, "input_cost_per_token": 12e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "embedding" },
    "voyage/rerank-2": { "max_tokens": 16e3, "max_input_tokens": 16e3, "max_output_tokens": 16e3, "max_query_tokens": 16e3, "input_cost_per_token": 5e-8, "input_cost_per_query": 5e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "rerank" },
    "voyage/rerank-2-lite": { "max_tokens": 8e3, "max_input_tokens": 8e3, "max_output_tokens": 8e3, "max_query_tokens": 8e3, "input_cost_per_token": 2e-8, "input_cost_per_query": 2e-8, "output_cost_per_token": 0, "litellm_provider": "voyage", "mode": "rerank" },
    "databricks/databricks-claude-3-7-sonnet": { "max_tokens": 2e5, "max_input_tokens": 2e5, "max_output_tokens": 128e3, "input_cost_per_token": 25e-7, "input_dbu_cost_per_token": 3571e-8, "output_cost_per_token": 17857e-9, "output_db_cost_per_token": 214286e-9, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Claude 3.7 conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_assistant_prefill": true, "supports_function_calling": true, "supports_tool_choice": true, "supports_reasoning": true },
    "databricks/databricks-meta-llama-3-1-405b-instruct": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 5e-6, "input_dbu_cost_per_token": 71429e-9, "output_cost_per_token": 1500002e-11, "output_db_cost_per_token": 214286e-9, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_tool_choice": true },
    "databricks/databricks-meta-llama-3-1-70b-instruct": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 100002e-11, "input_dbu_cost_per_token": 14286e-9, "output_cost_per_token": 299999e-11, "output_dbu_cost_per_token": 42857e-9, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_tool_choice": true },
    "databricks/databricks-meta-llama-3-3-70b-instruct": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 100002e-11, "input_dbu_cost_per_token": 14286e-9, "output_cost_per_token": 299999e-11, "output_dbu_cost_per_token": 42857e-9, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_tool_choice": true },
    "databricks/databricks-llama-4-maverick": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 5e-6, "input_dbu_cost_per_token": 7143e-8, "output_cost_per_token": 15e-6, "output_dbu_cost_per_token": 21429e-8, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Databricks documentation now provides both DBU costs (_dbu_cost_per_token) and dollar costs(_cost_per_token)." }, "supports_tool_choice": true },
    "databricks/databricks-dbrx-instruct": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 74998e-11, "input_dbu_cost_per_token": 10714e-9, "output_cost_per_token": 224901e-11, "output_dbu_cost_per_token": 32143e-9, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_tool_choice": true },
    "databricks/databricks-meta-llama-3-70b-instruct": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 128e3, "input_cost_per_token": 100002e-11, "input_dbu_cost_per_token": 14286e-9, "output_cost_per_token": 299999e-11, "output_dbu_cost_per_token": 42857e-9, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_tool_choice": true },
    "databricks/databricks-llama-2-70b-chat": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 50001e-11, "input_dbu_cost_per_token": 7143e-9, "output_cost_per_token": 15e-7, "output_dbu_cost_per_token": 21429e-9, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_tool_choice": true },
    "databricks/databricks-mixtral-8x7b-instruct": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 50001e-11, "input_dbu_cost_per_token": 7143e-9, "output_cost_per_token": 99902e-11, "output_dbu_cost_per_token": 14286e-9, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_tool_choice": true },
    "databricks/databricks-mpt-30b-instruct": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 99902e-11, "input_dbu_cost_per_token": 14286e-9, "output_cost_per_token": 99902e-11, "output_dbu_cost_per_token": 14286e-9, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_tool_choice": true },
    "databricks/databricks-mpt-7b-instruct": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 50001e-11, "input_dbu_cost_per_token": 7143e-9, "output_cost_per_token": 0, "output_dbu_cost_per_token": 0, "litellm_provider": "databricks", "mode": "chat", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." }, "supports_tool_choice": true },
    "databricks/databricks-bge-large-en": { "max_tokens": 512, "max_input_tokens": 512, "output_vector_size": 1024, "input_cost_per_token": 10003e-11, "input_dbu_cost_per_token": 1429e-9, "output_cost_per_token": 0, "output_dbu_cost_per_token": 0, "litellm_provider": "databricks", "mode": "embedding", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." } },
    "databricks/databricks-gte-large-en": { "max_tokens": 8192, "max_input_tokens": 8192, "output_vector_size": 1024, "input_cost_per_token": 12999e-11, "input_dbu_cost_per_token": 1857e-9, "output_cost_per_token": 0, "output_dbu_cost_per_token": 0, "litellm_provider": "databricks", "mode": "embedding", "source": "https://www.databricks.com/product/pricing/foundation-model-serving", "metadata": { "notes": "Input/output cost per token is dbu cost * $0.070, based on databricks Llama 3.1 70B conversion. Number provided for reference, '*_dbu_cost_per_token' used in actual calculation." } },
    "sambanova/Meta-Llama-3.1-8B-Instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 1e-7, "output_cost_per_token": 2e-7, "litellm_provider": "sambanova", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/Meta-Llama-3.1-405B-Instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 5e-6, "output_cost_per_token": 1e-5, "litellm_provider": "sambanova", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/Meta-Llama-3.2-1B-Instruct": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 4e-8, "output_cost_per_token": 8e-8, "litellm_provider": "sambanova", "mode": "chat", "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/Meta-Llama-3.2-3B-Instruct": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 8e-8, "output_cost_per_token": 16e-8, "litellm_provider": "sambanova", "mode": "chat", "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/Llama-4-Maverick-17B-128E-Instruct": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 63e-8, "output_cost_per_token": 18e-7, "litellm_provider": "sambanova", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "supports_vision": true, "source": "https://cloud.sambanova.ai/plans/pricing", "metadata": { "notes": "For vision models, images are converted to 6432 input tokens and are billed at that amount" } },
    "sambanova/Llama-4-Scout-17B-16E-Instruct": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 4e-7, "output_cost_per_token": 7e-7, "litellm_provider": "sambanova", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_response_schema": true, "source": "https://cloud.sambanova.ai/plans/pricing", "metadata": { "notes": "For vision models, images are converted to 6432 input tokens and are billed at that amount" } },
    "sambanova/Meta-Llama-3.3-70B-Instruct": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 6e-7, "output_cost_per_token": 12e-7, "litellm_provider": "sambanova", "mode": "chat", "supports_function_calling": true, "supports_response_schema": true, "supports_tool_choice": true, "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/Meta-Llama-Guard-3-8B": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 3e-7, "output_cost_per_token": 3e-7, "litellm_provider": "sambanova", "mode": "chat", "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/Qwen3-32B": { "max_tokens": 8192, "max_input_tokens": 8192, "max_output_tokens": 8192, "input_cost_per_token": 4e-7, "output_cost_per_token": 8e-7, "litellm_provider": "sambanova", "supports_function_calling": true, "supports_tool_choice": true, "supports_reasoning": true, "mode": "chat", "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/QwQ-32B": { "max_tokens": 16384, "max_input_tokens": 16384, "max_output_tokens": 16384, "input_cost_per_token": 5e-7, "output_cost_per_token": 1e-6, "litellm_provider": "sambanova", "mode": "chat", "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/Qwen2-Audio-7B-Instruct": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 4096, "input_cost_per_token": 5e-7, "output_cost_per_token": 1e-4, "litellm_provider": "sambanova", "mode": "chat", "supports_audio_input": true, "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/DeepSeek-R1-Distill-Llama-70B": { "max_tokens": 131072, "max_input_tokens": 131072, "max_output_tokens": 131072, "input_cost_per_token": 7e-7, "output_cost_per_token": 14e-7, "litellm_provider": "sambanova", "mode": "chat", "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/DeepSeek-R1": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 5e-6, "output_cost_per_token": 7e-6, "litellm_provider": "sambanova", "mode": "chat", "source": "https://cloud.sambanova.ai/plans/pricing" },
    "sambanova/DeepSeek-V3-0324": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 32768, "input_cost_per_token": 3e-6, "output_cost_per_token": 45e-7, "litellm_provider": "sambanova", "mode": "chat", "supports_function_calling": true, "supports_tool_choice": true, "supports_reasoning": true, "source": "https://cloud.sambanova.ai/plans/pricing" },
    "assemblyai/nano": { "mode": "audio_transcription", "input_cost_per_second": 10278e-8, "output_cost_per_second": 0, "litellm_provider": "assemblyai" },
    "assemblyai/best": { "mode": "audio_transcription", "input_cost_per_second": 3333e-8, "output_cost_per_second": 0, "litellm_provider": "assemblyai" },
    "jina-reranker-v2-base-multilingual": { "max_tokens": 1024, "max_input_tokens": 1024, "max_output_tokens": 1024, "max_document_chunks_per_query": 2048, "input_cost_per_token": 18e-9, "output_cost_per_token": 18e-9, "litellm_provider": "jina_ai", "mode": "rerank" },
    "snowflake/deepseek-r1": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 8192, "litellm_provider": "snowflake", "supports_reasoning": true, "mode": "chat" },
    "snowflake/snowflake-arctic": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/claude-3-5-sonnet": { "supports_computer_use": true, "max_tokens": 18e3, "max_input_tokens": 18e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/mistral-large": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/mistral-large2": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/reka-flash": { "max_tokens": 1e5, "max_input_tokens": 1e5, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/reka-core": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/jamba-instruct": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/jamba-1.5-mini": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/jamba-1.5-large": { "max_tokens": 256e3, "max_input_tokens": 256e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/mixtral-8x7b": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/llama2-70b-chat": { "max_tokens": 4096, "max_input_tokens": 4096, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/llama3-8b": { "max_tokens": 8e3, "max_input_tokens": 8e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/llama3-70b": { "max_tokens": 8e3, "max_input_tokens": 8e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/llama3.1-8b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/llama3.1-70b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/llama3.3-70b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/snowflake-llama-3.3-70b": { "max_tokens": 8e3, "max_input_tokens": 8e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/llama3.1-405b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/snowflake-llama-3.1-405b": { "max_tokens": 8e3, "max_input_tokens": 8e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/llama3.2-1b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/llama3.2-3b": { "max_tokens": 128e3, "max_input_tokens": 128e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/mistral-7b": { "max_tokens": 32e3, "max_input_tokens": 32e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "snowflake/gemma-7b": { "max_tokens": 8e3, "max_input_tokens": 8e3, "max_output_tokens": 8192, "litellm_provider": "snowflake", "mode": "chat" },
    "nscale/meta-llama/Llama-4-Scout-17B-16E-Instruct": { "input_cost_per_token": 9e-8, "output_cost_per_token": 29e-8, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models" },
    "nscale/Qwen/Qwen2.5-Coder-3B-Instruct": { "input_cost_per_token": 1e-8, "output_cost_per_token": 3e-8, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models" },
    "nscale/Qwen/Qwen2.5-Coder-7B-Instruct": { "input_cost_per_token": 1e-8, "output_cost_per_token": 3e-8, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models" },
    "nscale/Qwen/Qwen2.5-Coder-32B-Instruct": { "input_cost_per_token": 6e-8, "output_cost_per_token": 2e-7, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models" },
    "nscale/Qwen/QwQ-32B": { "input_cost_per_token": 18e-8, "output_cost_per_token": 2e-7, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models" },
    "nscale/deepseek-ai/DeepSeek-R1-Distill-Llama-70B": { "input_cost_per_token": 375e-9, "output_cost_per_token": 375e-9, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models", "metadata": { "notes": "Pricing listed as $0.75/1M tokens total. Assumed 50/50 split for input/output." } },
    "nscale/deepseek-ai/DeepSeek-R1-Distill-Llama-8B": { "input_cost_per_token": 25e-9, "output_cost_per_token": 25e-9, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models", "metadata": { "notes": "Pricing listed as $0.05/1M tokens total. Assumed 50/50 split for input/output." } },
    "nscale/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B": { "input_cost_per_token": 9e-8, "output_cost_per_token": 9e-8, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models", "metadata": { "notes": "Pricing listed as $0.18/1M tokens total. Assumed 50/50 split for input/output." } },
    "nscale/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B": { "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models", "metadata": { "notes": "Pricing listed as $0.40/1M tokens total. Assumed 50/50 split for input/output." } },
    "nscale/deepseek-ai/DeepSeek-R1-Distill-Qwen-14B": { "input_cost_per_token": 7e-8, "output_cost_per_token": 7e-8, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models", "metadata": { "notes": "Pricing listed as $0.14/1M tokens total. Assumed 50/50 split for input/output." } },
    "nscale/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B": { "input_cost_per_token": 15e-8, "output_cost_per_token": 15e-8, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models", "metadata": { "notes": "Pricing listed as $0.30/1M tokens total. Assumed 50/50 split for input/output." } },
    "nscale/mistralai/mixtral-8x22b-instruct-v0.1": { "input_cost_per_token": 6e-7, "output_cost_per_token": 6e-7, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models", "metadata": { "notes": "Pricing listed as $1.20/1M tokens total. Assumed 50/50 split for input/output." } },
    "nscale/meta-llama/Llama-3.1-8B-Instruct": { "input_cost_per_token": 3e-8, "output_cost_per_token": 3e-8, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models", "metadata": { "notes": "Pricing listed as $0.06/1M tokens total. Assumed 50/50 split for input/output." } },
    "nscale/meta-llama/Llama-3.3-70B-Instruct": { "input_cost_per_token": 2e-7, "output_cost_per_token": 2e-7, "litellm_provider": "nscale", "mode": "chat", "source": "https://docs.nscale.com/docs/inference/serverless-models/current#chat-models", "metadata": { "notes": "Pricing listed as $0.40/1M tokens total. Assumed 50/50 split for input/output." } },
    "nscale/black-forest-labs/FLUX.1-schnell": { "mode": "image_generation", "input_cost_per_pixel": 13e-10, "output_cost_per_pixel": 0, "litellm_provider": "nscale", "supported_endpoints": ["/v1/images/generations"], "source": "https://docs.nscale.com/docs/inference/serverless-models/current#image-models" },
    "nscale/stabilityai/stable-diffusion-xl-base-1.0": { "mode": "image_generation", "input_cost_per_pixel": 3e-9, "output_cost_per_pixel": 0, "litellm_provider": "nscale", "supported_endpoints": ["/v1/images/generations"], "source": "https://docs.nscale.com/docs/inference/serverless-models/current#image-models" },
    "featherless_ai/featherless-ai/Qwerky-72B": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 4096, "litellm_provider": "featherless_ai", "mode": "chat" },
    "featherless_ai/featherless-ai/Qwerky-QwQ-32B": { "max_tokens": 32768, "max_input_tokens": 32768, "max_output_tokens": 4096, "litellm_provider": "featherless_ai", "mode": "chat" },
    "deepgram/nova-3": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-3-general": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-3-medical": { "mode": "audio_transcription", "input_cost_per_second": 8667e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 52e-4, "calculation": "$0.0052/60 seconds = $0.00008667 per second (multilingual)" } },
    "deepgram/nova-2": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-general": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-meeting": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-phonecall": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-voicemail": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-finance": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-conversationalai": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-video": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-drivethru": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-automotive": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-2-atc": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-general": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/nova-phonecall": { "mode": "audio_transcription", "input_cost_per_second": 7167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 43e-4, "calculation": "$0.0043/60 seconds = $0.00007167 per second" } },
    "deepgram/enhanced": { "mode": "audio_transcription", "input_cost_per_second": 24167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0145, "calculation": "$0.0145/60 seconds = $0.00024167 per second" } },
    "deepgram/enhanced-general": { "mode": "audio_transcription", "input_cost_per_second": 24167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0145, "calculation": "$0.0145/60 seconds = $0.00024167 per second" } },
    "deepgram/enhanced-meeting": { "mode": "audio_transcription", "input_cost_per_second": 24167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0145, "calculation": "$0.0145/60 seconds = $0.00024167 per second" } },
    "deepgram/enhanced-phonecall": { "mode": "audio_transcription", "input_cost_per_second": 24167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0145, "calculation": "$0.0145/60 seconds = $0.00024167 per second" } },
    "deepgram/enhanced-finance": { "mode": "audio_transcription", "input_cost_per_second": 24167e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0145, "calculation": "$0.0145/60 seconds = $0.00024167 per second" } },
    "deepgram/base": { "mode": "audio_transcription", "input_cost_per_second": 20833e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0125, "calculation": "$0.0125/60 seconds = $0.00020833 per second" } },
    "deepgram/base-general": { "mode": "audio_transcription", "input_cost_per_second": 20833e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0125, "calculation": "$0.0125/60 seconds = $0.00020833 per second" } },
    "deepgram/base-meeting": { "mode": "audio_transcription", "input_cost_per_second": 20833e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0125, "calculation": "$0.0125/60 seconds = $0.00020833 per second" } },
    "deepgram/base-phonecall": { "mode": "audio_transcription", "input_cost_per_second": 20833e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0125, "calculation": "$0.0125/60 seconds = $0.00020833 per second" } },
    "deepgram/base-voicemail": { "mode": "audio_transcription", "input_cost_per_second": 20833e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0125, "calculation": "$0.0125/60 seconds = $0.00020833 per second" } },
    "deepgram/base-finance": { "mode": "audio_transcription", "input_cost_per_second": 20833e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0125, "calculation": "$0.0125/60 seconds = $0.00020833 per second" } },
    "deepgram/base-conversationalai": { "mode": "audio_transcription", "input_cost_per_second": 20833e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0125, "calculation": "$0.0125/60 seconds = $0.00020833 per second" } },
    "deepgram/base-video": { "mode": "audio_transcription", "input_cost_per_second": 20833e-8, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "original_pricing_per_minute": 0.0125, "calculation": "$0.0125/60 seconds = $0.00020833 per second" } },
    "deepgram/whisper": { "mode": "audio_transcription", "input_cost_per_second": 1e-4, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "notes": "Deepgram's hosted OpenAI Whisper models - pricing may differ from native Deepgram models" } },
    "deepgram/whisper-tiny": { "mode": "audio_transcription", "input_cost_per_second": 1e-4, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "notes": "Deepgram's hosted OpenAI Whisper models - pricing may differ from native Deepgram models" } },
    "deepgram/whisper-base": { "mode": "audio_transcription", "input_cost_per_second": 1e-4, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "notes": "Deepgram's hosted OpenAI Whisper models - pricing may differ from native Deepgram models" } },
    "deepgram/whisper-small": { "mode": "audio_transcription", "input_cost_per_second": 1e-4, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "notes": "Deepgram's hosted OpenAI Whisper models - pricing may differ from native Deepgram models" } },
    "deepgram/whisper-medium": { "mode": "audio_transcription", "input_cost_per_second": 1e-4, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "notes": "Deepgram's hosted OpenAI Whisper models - pricing may differ from native Deepgram models" } },
    "deepgram/whisper-large": { "mode": "audio_transcription", "input_cost_per_second": 1e-4, "output_cost_per_second": 0, "litellm_provider": "deepgram", "supported_endpoints": ["/v1/audio/transcriptions"], "source": "https://deepgram.com/pricing", "metadata": { "notes": "Deepgram's hosted OpenAI Whisper models - pricing may differ from native Deepgram models" } }
  };
  let customModels = {};
  const _ModelUsage = class _ModelUsage {
    constructor(service) {
      this.service = service;
    }
    getModel(model, quality_filter = {}) {
      return _ModelUsage.get(this.service, model, quality_filter);
    }
    async refresh() {
      await _ModelUsage.refresh();
    }
    models() {
      return _ModelUsage.getByService(this.service);
    }
    static get(service, model, quality_filter = {}) {
      let info = this.getByServiceModel(service, model);
      if (info) return info;
      if (!quality_filter.allowSimilar) return null;
      info = this.getByServiceModel(service, `${model}-latest`);
      if (info) return info;
      info = this.getByServiceModel(service, `${model}-beta`);
      if (info) return info;
      info = this.getByServiceModel(service, `${service}/${model}`);
      if (info) return info;
      info = this.getByServiceModel(service, `${service}/${model}-beta`);
      if (info) return info;
      info = this.getByServiceModel(service, model.replace("-beta", ""));
      if (info) return info;
      info = this.getByServiceModel(service, model.replace("-thinking", ""));
      if (info) return info;
      info = this.getByServiceModel(service, model.replace("-exp", ""));
      if (info) return info;
      info = this.getByServiceModel(service, model.replace("-experimental", ""));
      if (info) return info;
      info = this.getByServiceModel(service, model.replace("-thinking-exp", ""));
      if (info) return info;
      info = this.getByServiceModel(service, model.replace("-preview", ""));
      if (info) return info;
      return null;
    }
    static getAll() {
      return this.factories(data).filter(this.filter());
    }
    static getByService(service) {
      return this.factories(data).filter(this.filter(service));
    }
    static getByServiceModel(service, model) {
      return this.getByService(service).find((m) => m.model === model || m.model === `${service}/${model}`) || null;
    }
    static filter(service) {
      return (model) => {
        if (model.mode !== "chat" && model.mode !== "responses") return false;
        if (service === "google" && model.service === "gemini") return true;
        return service ? model.service === service : true;
      };
    }
    static factories(data2) {
      const custom = Object.assign({}, data2, customModels);
      return Object.keys(custom).map((key) => {
        var _a, _b, _c, _d, _e, _f;
        const m = custom[key];
        const max_input_tokens = m.max_input_tokens || 0;
        const max_output_tokens = m.max_output_tokens || 0;
        const max_tokens = m.max_tokens ? m.max_tokens : max_input_tokens + max_output_tokens;
        const input_cost_per_token = m.input_cost_per_token || 0;
        const output_cost_per_token = m.output_cost_per_token || 0;
        const output_cost_per_reasoning_token = m.output_cost_per_reasoning_token || 0;
        const supported_modalities = m.supported_modalities || [];
        const supports_reasoning = m.supports_reasoning || false;
        const supports_function_calling = m.supports_function_calling || ((_a = m.raw) == null ? void 0 : _a.supports_function_calling) || false;
        const supports_vision = m.supports_vision || ((_b = m.raw) == null ? void 0 : _b.supports_vision) || false;
        const supports_web_search = m.supports_web_search || ((_c = m.raw) == null ? void 0 : _c.supports_web_search) || false;
        const supports_audio_input = m.supports_audio_input || ((_d = m.raw) == null ? void 0 : _d.supports_audio_input) || false;
        const supports_audio_output = m.supports_audio_output || ((_e = m.raw) == null ? void 0 : _e.supports_audio_output) || false;
        const supports_prompt_caching = m.supports_prompt_caching || ((_f = m.raw) == null ? void 0 : _f.supports_prompt_caching) || false;
        const tags = [];
        if (supports_reasoning) tags.push("reasoning");
        if (supports_function_calling) tags.push("tools");
        if (supports_vision) tags.push("images");
        if (supports_web_search) tags.push("search");
        if (supports_audio_input || supports_audio_output) tags.push("audio");
        if (supports_prompt_caching) tags.push("cache");
        let model = key;
        if (key.includes("/")) model = key.split("/").slice(1).join("/");
        return {
          service: m.litellm_provider || m.service,
          mode: m.mode,
          model,
          max_tokens,
          max_input_tokens,
          max_output_tokens,
          input_cost_per_token,
          output_cost_per_token,
          output_cost_per_reasoning_token,
          supports_reasoning,
          supports_function_calling,
          supports_vision,
          supports_web_search,
          supports_audio_input,
          supports_audio_output,
          supports_prompt_caching,
          supported_modalities,
          tags
        };
      });
    }
    static async refresh(service) {
      const response = await fetch(this.DEFAULT_BASE_URL);
      const data2 = await response.json();
      return this.factories(data2).filter(this.filter(service));
    }
    static addCustom(info) {
      customModels[`${info.service}/${info.model}`] = Object.assign({}, { mode: "chat" }, info);
    }
    static getCustom(service, model) {
      return customModels[`${service}/${model}`] || null;
    }
    static getCustoms() {
      return customModels;
    }
    static removeCustom(service, model) {
      delete customModels[`${service}/${model}`];
    }
    static clearCustom() {
      customModels = {};
    }
  };
  _ModelUsage.DEFAULT_BASE_URL = "https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json";
  let ModelUsage = _ModelUsage;
  const config = {
    service: "ollama",
    max_tokens: 1024
  };
  const log$2 = createLogger("llm.js:parsers");
  function codeBlock(blockType) {
    return function(content) {
      try {
        return content.split("```" + blockType)[1].split("```")[0].trim();
      } catch (e) {
        log$2.error(`error parsing code block of type ${blockType} from content`, content);
        throw e;
      }
    };
  }
  function markdown(content) {
    try {
      return codeBlock("markdown")(content);
    } catch (e) {
      return codeBlock("md")(content);
    }
  }
  function json(content) {
    try {
      return JSON.parse(content);
    } catch (e) {
      const parser = codeBlock("json");
      try {
        return JSON.parse(parser(content));
      } catch (e2) {
        log$2.error(`error parsing json from content`, content);
        throw e2;
      }
    }
  }
  function xml(tag) {
    return function(content) {
      try {
        const inner = content.split(`<${tag}>`)[1].split(`</${tag}>`)[0].trim();
        if (!inner || inner.length == 0) {
          throw new Error(`No content found inside of XML tag ${tag}`);
        }
        return inner;
      } catch (e) {
        log$2.error(`error parsing xml tag ${tag} from content`, content);
        throw e;
      }
    };
  }
  const parsers = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    codeBlock,
    json,
    markdown,
    xml
  }, Symbol.toStringTag, { value: "Module" }));
  const __vite_import_meta_env__ = {};
  const log$1 = createLogger("llm.js:utils");
  async function handleErrorResponse(response, error = "Error while handling response") {
    if (response.ok) return true;
    let data2;
    try {
      data2 = await response.json();
    } catch (e) {
      let err2 = "Unable to parse response";
      if (response.status && response.statusText) {
        err2 = `${response.status} ${response.statusText}`;
      }
      throw new Error(err2);
    }
    let err = error;
    if (data2.error && typeof data2.error === "string") {
      err = data2.error;
    } else if (data2.error && typeof data2.error === "object" && data2.error.type && data2.error.message) {
      err = `${data2.error.type}: ${data2.error.message}`;
    } else if (data2.error && typeof data2.error === "object") {
      err = JSON.stringify(data2.error);
    }
    throw new Error(err);
  }
  async function* parseStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      let { done: done2, value } = await reader.read();
      if (done2) break;
      let jsonchunk = decoder.decode(value, { stream: true });
      if (!jsonchunk) continue;
      const jsonlines = jsonchunk.split("\n");
      let unparsedLines = [];
      for (let jsonline of jsonlines) {
        if (jsonline.startsWith("event: ")) continue;
        if (jsonline.startsWith("data: ")) jsonline = jsonline.slice(6);
        if (jsonline.length === 0) continue;
        unparsedLines.push(jsonline);
      }
      buffer = unparsedLines.join("\n");
      unparsedLines = [];
      const lines = buffer.split("\n");
      for (const line of lines) {
        try {
          const data2 = JSON.parse(line);
          yield data2;
          if (data2.type === "message_stop" || data2.type === "response.completed" || data2.done) {
            done2 = true;
            break;
          }
        } catch (e) {
          unparsedLines.push(line);
        }
      }
      buffer = unparsedLines.join("\n");
    }
    if (buffer.length > 0) {
      try {
        const data2 = JSON.parse(buffer);
        yield data2;
      } catch (e) {
        log$1.error("Error parsing JSON LINE:", buffer);
      }
    }
  }
  function filterMessageRole(messages, role) {
    return messages.filter((message) => message.role === role);
  }
  function filterNotMessageRole(messages, role) {
    return messages.filter((message) => message.role !== role);
  }
  function uuid() {
    return crypto.randomUUID();
  }
  function wrapTool$1(tool) {
    if (!tool.name) throw new Error("Tool name is required");
    if (!tool.description) throw new Error("Tool description is required");
    if (!tool.input_schema) throw new Error("Tool input schema is required");
    return {
      type: "function",
      function: { name: tool.name, description: tool.description, parameters: tool.input_schema }
    };
  }
  function unwrapToolCall(tool_call) {
    if (!tool_call.function) throw new Error("Tool call function is required");
    if (!tool_call.function.id) tool_call.function.id = crypto.randomUUID();
    if (!tool_call.function.name) throw new Error("Tool call function name is required");
    if (!tool_call.function.arguments) throw new Error("Tool call function arguments is required");
    let args = tool_call.function.arguments;
    if (typeof args === "string") args = JSON.parse(args);
    return { id: tool_call.function.id, name: tool_call.function.name, input: args };
  }
  function keywordFilter(str, keywords) {
    for (const keyword of keywords) {
      if (str.includes(`${keyword}-`)) return false;
      if (str.includes(`-${keyword}`)) return false;
    }
    return true;
  }
  function isBrowser() {
    return typeof window !== "undefined" && !isNode();
  }
  function isNode() {
    return typeof process !== "undefined" && !isBrowser();
  }
  isBrowser() ? __vite_import_meta_env__ : process.env;
  function deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
      return obj.map((item) => deepClone(item));
    }
    if (obj instanceof RegExp) {
      return new RegExp(obj);
    }
    if (obj.constructor !== Object) {
      const cloned2 = Object.create(Object.getPrototypeOf(obj));
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned2[key] = deepClone(obj[key]);
        }
      }
      return cloned2;
    }
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  function join(...pathSegments) {
    if (pathSegments.length === 0) return ".";
    const firstSegment = pathSegments[0];
    const isUrl = firstSegment.startsWith("http://") || firstSegment.startsWith("https://");
    if (isUrl) {
      const [protocol, ...urlParts] = firstSegment.split("://");
      const remainingSegments = pathSegments.slice(1);
      const allSegments = [urlParts.join("://"), ...remainingSegments];
      const joinedPath = allSegments.join("/").replace(/\/+/g, "/");
      return `${protocol}://${joinedPath}`;
    }
    let parts = [];
    for (let i = 0, l = pathSegments.length; i < l; i++) {
      parts = parts.concat(pathSegments[i].split("/"));
    }
    const newParts = [];
    for (let i = 0, l = parts.length; i < l; i++) {
      const part = parts[i];
      if (!part || part === ".") continue;
      if (part === "..") newParts.pop();
      else newParts.push(part);
    }
    if (parts[0] === "") newParts.unshift("");
    return newParts.join("/") || (newParts.length ? "/" : ".");
  }
  const log = createLogger("llm.js:index");
  const _LLM = class _LLM {
    constructor(input, options = {}) {
      this.abortController = null;
      this.cache = {};
      const LLM22 = this.constructor;
      this.service = options.service ?? this.constructor.service;
      this.messages = [];
      if (input && typeof input === "string") this.user(input, options.attachments);
      else if (input && Array.isArray(input)) this.messages = input;
      this.options = options;
      this.model = options.model ?? LLM22.DEFAULT_MODEL;
      this.baseUrl = options.baseUrl ?? LLM22.DEFAULT_BASE_URL;
      this.modelUsage = new ModelUsage(this.service);
      this.stream = options.stream ?? false;
      this.max_tokens = options.max_tokens ?? config.max_tokens;
      this.extended = options.extended ?? false;
      this.think = options.think ?? false;
      this.qualityFilter = options.qualityFilter ?? {};
      if (typeof options.temperature === "number") this.temperature = options.temperature;
      if (typeof options.max_thinking_tokens === "number") this.max_thinking_tokens = options.max_thinking_tokens;
      if (typeof options.parser === "string") this.parser = this.parsers[options.parser];
      if (typeof options.json === "boolean") this.json = options.json;
      if (this.json && !this.parser) this.parser = json;
      if (Array.isArray(options.tools)) this.tools = options.tools;
      if (this.think) this.extended = true;
      if (this.tools && this.tools.length > 0) this.extended = true;
      log.debug(`LLM ${this.service} constructor`);
    }
    get isLocal() {
      return this.constructor.isLocal;
    }
    get apiKey() {
      var _a;
      if (this.options.apiKey) return this.options.apiKey;
      if (isBrowser()) {
        if (localStorage.getItem(`${this.service.toUpperCase()}_API_KEY`)) return localStorage.getItem(`${this.service.toUpperCase()}_API_KEY`);
      } else if (isNode()) {
        if (typeof process !== "undefined" && ((_a = process.env) == null ? void 0 : _a[`${this.service.toUpperCase()}_API_KEY`])) return process.env[`${this.service.toUpperCase()}_API_KEY`];
      }
      return void 0;
    }
    get llmOptions() {
      const options = {
        model: this.model,
        messages: this.parseMessages(this.messages),
        stream: this.stream,
        max_tokens: this.max_tokens,
        think: this.think
      };
      if (typeof this.max_thinking_tokens === "number") options.max_thinking_tokens = this.max_thinking_tokens;
      if (typeof this.temperature === "number") options.temperature = this.temperature;
      if (this.tools) options.tools = this.tools;
      return options;
    }
    get llmHeaders() {
      const headers = {
        "Content-Type": "application/json"
      };
      if (this.constructor.isBearerAuth) headers["Authorization"] = `Bearer ${this.apiKey}`;
      else if (this.apiKey) headers["x-api-key"] = this.apiKey;
      return headers;
    }
    get chatUrl() {
      return join(this.baseUrl, "api/chat");
    }
    get modelsUrl() {
      return join(this.baseUrl, "api/tags");
    }
    getChatUrl(opts) {
      return this.chatUrl;
    }
    getModelsUrl() {
      return this.modelsUrl;
    }
    get parsers() {
      return {
        thinking: this.parseThinkingChunk.bind(this),
        content: this.parseContentChunk.bind(this),
        usage: this.parseTokenUsage.bind(this),
        tool_calls: this.parseToolsChunk.bind(this)
      };
    }
    addMessage(role, content) {
      this.messages.push({ role, content });
    }
    user(content, attachments) {
      if (attachments && attachments.length > 0) {
        const key = this.constructor.MessageExtendedContentInputKey;
        this.addMessage("user", { type: key, text: content, attachments });
      } else {
        this.addMessage("user", content);
      }
    }
    assistant(content) {
      this.addMessage("assistant", content);
    }
    system(content) {
      this.addMessage("system", content);
    }
    thinking(content) {
      this.addMessage("thinking", content);
    }
    toolCall(tool) {
      this.addMessage("tool_call", tool);
    }
    async chat(input, options) {
      const attachments = (options == null ? void 0 : options.attachments) || [];
      this.user(input, attachments);
      return await this.send(options);
    }
    abort() {
      if (this.abortController) {
        this.abortController.abort();
      }
    }
    async send(options) {
      options == null ? true : delete options.attachments;
      const vanillaOptions = { ...this.llmOptions, ...options || {} };
      const opts = this.parseOptions(JSON.parse(JSON.stringify(vanillaOptions)));
      this.resetCache();
      if (opts.tools && opts.tools.length > 0) this.extended = true;
      log.debug(`LLM ${this.service} send`);
      this.abortController = new AbortController();
      const response = await fetch(this.getChatUrl(opts), {
        method: "POST",
        body: JSON.stringify(opts),
        headers: this.llmHeaders,
        signal: this.abortController.signal,
        mode: "cors",
        credentials: "omit"
      });
      await handleErrorResponse(response, "Failed to send request");
      if (this.stream) {
        const body = response.body;
        if (!body) throw new Error("No body found");
        if (this.extended) return this.extendedStreamResponse(body, vanillaOptions);
        return this.streamResponse(body);
      }
      try {
        const data2 = await response.json();
        if (this.extended) return this.extendedResponse(data2, vanillaOptions);
        return this.response(data2);
      } finally {
        this.abortController = null;
      }
    }
    response(data2) {
      let content = this.parseContent(data2);
      if (this.parser) content = this.parser(content);
      if (content) this.assistant(content);
      return content;
    }
    extendedResponse(data2, options) {
      const response = {
        service: this.service,
        options
      };
      const tokenUsage = this.parseTokenUsage(data2);
      if (tokenUsage) {
        response.usage = this.parseUsage(tokenUsage);
      }
      if (options.think) {
        const thinking = this.parseThinking(data2);
        if (thinking) {
          response.thinking = thinking;
          this.thinking(thinking);
        }
      }
      let content = this.parseContent(data2);
      if (this.parser) content = this.parser(content);
      if (content) this.assistant(content);
      if (this.tools && this.tools.length > 0) {
        response.tool_calls = this.parseTools(data2);
        for (const tool of response.tool_calls) {
          if (tool && Object.keys(tool).length > 0) {
            this.toolCall(tool);
          }
        }
      }
      response.content = content;
      response.messages = JSON.parse(JSON.stringify(this.messages));
      return response;
    }
    async *streamResponse(stream) {
      const restream = this.streamResponses(stream, { content: this.parseContentChunk.bind(this) });
      for await (const chunk of restream) {
        if (chunk.type === "content") {
          yield chunk.content;
        }
      }
      this.abortController = null;
    }
    async *streamResponses(stream, parsers2) {
      const reader = await parseStream(stream);
      let buffers = { "type": "buffers" };
      for await (const chunk of reader) {
        for (const [name, parser] of Object.entries(parsers2)) {
          const content = parser(chunk);
          if (!content) continue;
          if (name === "usage") {
            buffers[name] = content;
            yield { type: name, content };
          } else if (name === "tool_calls") {
            if (!Array.isArray(content) || content.length === 0) continue;
            if (!buffers[name]) buffers[name] = [];
            buffers[name].push(...content);
            yield { type: name, content };
          } else {
            if (!buffers[name]) buffers[name] = "";
            buffers[name] += content;
            yield { type: name, content };
          }
        }
      }
      this.saveBuffers(buffers);
      return buffers;
    }
    saveBuffers(buffers) {
      for (let [name, content] of Object.entries(buffers)) {
        if (name === "thinking") {
          this.thinking(content);
        } else if (name === "tool_calls") {
          for (const tool of content) {
            if (tool && Object.keys(tool).length > 0) {
              this.toolCall(tool);
            }
          }
        } else if (name === "content") {
          if (this.parser) {
            content = this.parser(content);
            buffers[name] = content;
          }
          if (content) this.assistant(content);
        }
      }
    }
    async *restream(stream, callback) {
      while (true) {
        const { value, done } = await stream.next();
        if (callback && value) callback(value);
        if (done) break;
        yield value;
      }
    }
    extendedStreamResponse(body, options) {
      let usage;
      let thinking = "";
      let content = "";
      let tool_calls = [];
      const complete = async () => {
        const messages = JSON.parse(JSON.stringify(this.messages));
        const response = { service: this.service, options, usage, messages, content };
        if (thinking) response.thinking = thinking;
        if (tool_calls.length > 0) response.tool_calls = tool_calls;
        this.abortController = null;
        return response;
      };
      const stream = this.streamResponses(body, this.parsers);
      const restream = this.restream(stream, (chunk) => {
        if (chunk.type === "usage" && chunk.content && typeof chunk.content === "object") {
          const tokenUsage = chunk.content;
          usage = this.parseUsage(tokenUsage);
        }
        if (chunk.type === "tool_calls" && chunk.content && Array.isArray(chunk.content)) {
          tool_calls.push(...chunk.content);
        }
        if (chunk.type !== "buffers") return;
        if (chunk.thinking) thinking = chunk.thinking;
        if (chunk.content) content = chunk.content;
      });
      return { service: this.service, options, stream: restream, complete, think: this.think ?? false };
    }
    async fetchModels() {
      const options = { headers: this.llmHeaders };
      log.debug(`LLM ${this.service} fetchModels`);
      const response = await fetch(this.getModelsUrl(), options);
      await handleErrorResponse(response, "Failed to fetch models");
      const data2 = await response.json();
      let models = [];
      if (Array.isArray(data2)) models = data2;
      else if (Array.isArray(data2.models)) models = data2.models;
      else if (Array.isArray(data2.data)) models = data2.data;
      if (!models) throw new Error("No models found");
      return models.map(this.parseModel);
    }
    async verifyConnection() {
      return (await this.fetchModels()).length > 0;
    }
    getDefaultModelUsage(model) {
      return {
        input_cost_per_token: 0,
        output_cost_per_token: 0,
        output_cost_per_reasoning_token: 0,
        mode: "chat",
        service: this.service,
        model: model.model,
        max_tokens: model.max_tokens || 0,
        max_input_tokens: model.max_input_tokens || 0,
        max_output_tokens: model.max_output_tokens || 0,
        supports_reasoning: model.supports_reasoning || false,
        supports_function_calling: model.supports_function_calling || false,
        supports_vision: model.supports_vision || false,
        supports_web_search: model.supports_web_search || false,
        supports_audio_input: model.supports_audio_input || false,
        supports_audio_output: model.supports_audio_output || false,
        supports_prompt_caching: model.supports_prompt_caching || false,
        tags: model.tags || []
      };
    }
    async getModels(quality_filter = {}) {
      const models = await this.fetchModels();
      return models.map((model) => {
        let usage = ModelUsage.get(this.service, model.model, quality_filter) || {};
        if (Object.keys(usage).length === 0) {
          if (this.isLocal) {
            if (typeof model["supports_reasoning"] === "undefined") {
              if (quality_filter.allowUnknown) {
                usage = { input_cost_per_token: 0, output_cost_per_token: 0, output_cost_per_reasoning_token: 0 };
              } else {
                throw new Error(`model info not found for ${model.model}`);
              }
            } else {
              usage = this.getDefaultModelUsage(model);
            }
          } else {
            usage = this.getDefaultModelUsage(model);
            if (!quality_filter.allowUnknown) throw new Error(`model info not found for ${model.model}`);
          }
        }
        return { ...usage, name: model.name, model: model.model, created: model.created, service: this.service, raw: model };
      }).filter(this.filterQualityModel);
    }
    filterQualityModel(model) {
      return true;
    }
    async getQualityModels() {
      return this.getModels({ allowUnknown: true, allowSimilar: true, topModels: true });
    }
    async refreshModelUsage() {
      await this.modelUsage.refresh();
    }
    parseContent(data2) {
      throw new Error("parseContent not implemented");
    }
    parseTools(data2) {
      return [];
    }
    parseToolsChunk(chunk) {
      return this.parseTools(chunk);
    }
    parseContentChunk(chunk) {
      return this.parseContent(chunk);
    }
    parseThinking(data2) {
      return "";
    }
    parseThinkingChunk(chunk) {
      return this.parseThinking(chunk);
    }
    parseModel(model) {
      throw new Error("parseModel not implemented");
    }
    parseMessages(messages) {
      return messages.map((message) => {
        const copy = deepClone(message);
        if (copy.role === "thinking" || copy.role === "tool_call") copy.role = "assistant";
        if (message.content && message.content.attachments) {
          copy.content = this.parseAttachmentsContent(message.content);
        } else if (message.content && message.content.text) {
          copy.content = message.content.text;
        } else if (typeof copy.content !== "string") {
          copy.content = JSON.stringify(copy.content);
        }
        return copy;
      });
    }
    parseAttachmentsContent(content) {
      const key = this.constructor.MessageExtendedContentInputKey;
      const parts = content.attachments.map(this.parseAttachment);
      parts.push({ type: key, text: content.text });
      return parts;
    }
    parseAttachment(attachment) {
      return attachment.content;
    }
    parseOptions(options) {
      if (!options) return {};
      return options;
    }
    parseTokenUsage(usage) {
      return usage;
    }
    parseUsage(tokenUsage) {
      const modelUsage = this.modelUsage.getModel(this.model, this.qualityFilter);
      let inputCostPerToken = (modelUsage == null ? void 0 : modelUsage.input_cost_per_token) || 0;
      let outputCostPerToken = (modelUsage == null ? void 0 : modelUsage.output_cost_per_token) || 0;
      if (this.isLocal) {
        inputCostPerToken = 0;
        outputCostPerToken = 0;
      }
      const input_cost = tokenUsage.input_tokens * inputCostPerToken;
      const output_cost = tokenUsage.output_tokens * outputCostPerToken;
      const total_cost = input_cost + output_cost;
      return {
        ...tokenUsage,
        local: this.isLocal,
        total_tokens: tokenUsage.input_tokens + tokenUsage.output_tokens,
        input_cost,
        output_cost,
        total_cost
      };
    }
    resetCache() {
      this.cache = {};
    }
  };
  _LLM.parsers = parsers;
  _LLM.isLocal = false;
  _LLM.isBearerAuth = false;
  _LLM.MessageExtendedContentInputKey = "text";
  let LLM2 = _LLM;
  const _Anthropic = class _Anthropic extends LLM2 {
    get chatUrl() {
      return join(this.baseUrl, "messages");
    }
    get modelsUrl() {
      return join(this.baseUrl, "models");
    }
    get llmHeaders() {
      const headers = Object.assign({
        "anthropic-version": _Anthropic.API_VERSION
      }, super.llmHeaders);
      if (isBrowser()) {
        headers["anthropic-dangerous-direct-browser-access"] = "true";
      }
      return headers;
    }
    parseOptions(options) {
      if (options.think) {
        const budget_tokens = Math.floor((options.max_tokens || 0) / 2);
        options.thinking = { type: "enabled", budget_tokens };
      }
      if (typeof options.max_thinking_tokens === "number") {
        options.thinking.budget_tokens = options.max_thinking_tokens;
        delete options.max_thinking_tokens;
      }
      delete options.think;
      return options;
    }
    parseThinking(data2) {
      const messages = data2.content ?? [];
      for (const message of messages) {
        if (message.type !== "thinking") continue;
        if (!message.thinking) continue;
        return message.thinking;
      }
      return "";
    }
    parseThinkingChunk(chunk) {
      if (!chunk || chunk.type !== "content_block_delta" || !chunk.delta) return "";
      const delta = chunk.delta;
      if (delta.type !== "thinking_delta" || !delta.thinking) return "";
      return delta.thinking;
    }
    parseTokenUsage(data2) {
      var _a, _b, _c, _d, _e, _f;
      if (!data2) return null;
      const input_tokens = ((_b = (_a = data2.message) == null ? void 0 : _a.usage) == null ? void 0 : _b.input_tokens) || ((_c = data2.usage) == null ? void 0 : _c.input_tokens);
      const output_tokens = ((_e = (_d = data2.message) == null ? void 0 : _d.usage) == null ? void 0 : _e.output_tokens) || ((_f = data2.usage) == null ? void 0 : _f.output_tokens);
      if (typeof input_tokens !== "number") return null;
      if (typeof output_tokens !== "number") return null;
      return { input_tokens, output_tokens };
    }
    parseContent(data2) {
      const messages = data2.content ?? [];
      for (const message of messages) {
        if (message.type !== "text" || !message.text) continue;
        return message.text;
      }
      return "";
    }
    parseContentChunk(chunk) {
      if (chunk.type !== "content_block_delta" || !chunk.delta || chunk.delta.type !== "text_delta" || !chunk.delta.text) return "";
      return chunk.delta.text;
    }
    parseToolsChunk(data2) {
      if (data2.type === "content_block_start" && data2.content_block && data2.content_block.type === "tool_use") {
        this.cache["tool_call"] = data2.content_block;
      }
      if (this.cache["tool_call"] && data2.type === "content_block_delta" && data2.delta && data2.delta.type === "input_json_delta") {
        if (!this.cache["tool_call_input"]) this.cache["tool_call_input"] = "";
        this.cache["tool_call_input"] += data2.delta.partial_json;
      }
      if (!this.cache["tool_call"]) return [];
      if (!this.cache["tool_call_input"]) return [];
      try {
        const input = JSON.parse(this.cache["tool_call_input"]);
        const tool_call = { id: this.cache["tool_call"].id, name: this.cache["tool_call"].name, input };
        delete this.cache["tool_call"];
        delete this.cache["tool_call_input"];
        return [tool_call];
      } catch (error) {
        return [];
      }
    }
    parseTools(data2) {
      if (!data2 || !data2.content || !Array.isArray(data2.content)) return [];
      const tools = [];
      for (const content of data2.content) {
        if (content.type !== "tool_use" || !content.id || !content.name || !content.input) continue;
        tools.push({ id: content.id, name: content.name, input: content.input });
      }
      return tools;
    }
    parseModel(model) {
      return { name: model.display_name, model: model.id, created: new Date(model.created_at) };
    }
    filterQualityModel(model) {
      if (model.mode !== "chat") return false;
      if (model.model.startsWith("claude-2")) return false;
      return true;
    }
  };
  _Anthropic.service = "anthropic";
  _Anthropic.DEFAULT_BASE_URL = "https://api.anthropic.com/v1";
  _Anthropic.DEFAULT_MODEL = "claude-opus-4-20250514";
  _Anthropic.API_VERSION = "2023-06-01";
  let Anthropic = _Anthropic;
  const _Ollama = class _Ollama extends LLM2 {
    get chatUrl() {
      return join(this.baseUrl, "api/chat");
    }
    get modelsUrl() {
      return join(this.baseUrl, "api/tags");
    }
    get modelUrl() {
      return join(this.baseUrl, "api/show");
    }
    get llmHeaders() {
      const headers = super.llmHeaders;
      delete headers["x-api-key"];
      return headers;
    }
    parseOptions(options) {
      if (options.max_tokens) {
        const max_tokens = options.max_tokens;
        delete options.max_tokens;
        if (!options.options) options.options = {};
        options.options.num_predict = max_tokens;
      }
      if (options.tools) {
        const tools = options.tools.map((tool) => wrapTool$1(tool));
        options.tools = tools;
      }
      delete options.apiKey;
      return options;
    }
    parseThinking(data2) {
      if (!data2 || !data2.message || !data2.message.thinking) return "";
      return data2.message.thinking;
    }
    parseTokenUsage(usage) {
      if (!usage) return null;
      if (typeof usage.prompt_eval_count !== "number") return null;
      if (typeof usage.eval_count !== "number") return null;
      return { input_tokens: usage.prompt_eval_count, output_tokens: usage.eval_count };
    }
    parseContent(data2) {
      if (!data2 || !data2.message || !data2.message.content) return "";
      return data2.message.content;
    }
    parseContentChunk(chunk) {
      if (!chunk || !chunk.message || !chunk.message.content || chunk.message.role !== "assistant") return "";
      return chunk.message.content;
    }
    parseTools(data2) {
      if (!data2 || !data2.message || !data2.message.tool_calls) return [];
      return data2.message.tool_calls.map((tool_call) => unwrapToolCall(tool_call));
    }
    parseModel(model) {
      return { name: model.model, model: model.model, created: new Date(model.modified_at) };
    }
    async fetchModel(model) {
      const response = await fetch(`${this.modelUrl}`, {
        method: "POST",
        body: JSON.stringify({ name: model })
      });
      return await response.json();
    }
    async fetchModels() {
      const models = await super.fetchModels();
      for (const model of models) {
        const modelData = await this.fetchModel(model.model);
        const modelInfo = modelData.model_info;
        const architecture = modelInfo["general.architecture"];
        const context_length = modelInfo[`${architecture}.context_length`];
        const capabilities = modelData.capabilities ?? [];
        model.supports_reasoning = capabilities.includes("thinking");
        model.supports_function_calling = capabilities.includes("tools");
        model.supports_vision = capabilities.includes("vision");
        model.supports_web_search = false;
        model.supports_audio_input = false;
        model.supports_audio_output = false;
        model.supports_prompt_caching = false;
        model.max_tokens = context_length;
        model.tags = [];
        if (model.supports_reasoning) model.tags.push("reasoning");
        if (model.supports_function_calling) model.tags.push("tools");
        if (model.supports_vision) model.tags.push("images");
      }
      return models;
    }
    async verifyConnection() {
      const response = await fetch(`${this.baseUrl}`);
      return await response.text() === "Ollama is running";
    }
    parseMessages(messages) {
      const msgs = [];
      for (const message of messages) {
        let added = false;
        if (message.role === "thinking" || message.role === "tool_call") message.role = "assistant";
        if (message.role && message.content.text) {
          msgs.push({ "role": message.role, "content": message.content.text });
          added = true;
        }
        if (message.role && message.content.attachments) {
          msgs.push({ "role": message.role, "images": message.content.attachments.map(this.parseAttachment) });
          added = true;
        }
        if (!added) {
          msgs.push(message);
        }
      }
      return msgs;
    }
    parseAttachmentsContent(content) {
      return [{
        "role": "user",
        "content": content.text,
        "images": content.attachments.map(this.parseAttachment)
      }];
    }
    parseAttachment(attachment) {
      if (attachment.isImage && !attachment.isURL) {
        return attachment.data;
      }
      throw new Error("Unsupported attachment type");
    }
  };
  _Ollama.service = "ollama";
  _Ollama.DEFAULT_BASE_URL = "http://localhost:11434";
  _Ollama.DEFAULT_MODEL = "gemma3:4b";
  _Ollama.isLocal = true;
  let Ollama = _Ollama;
  const _OpenAI = class _OpenAI extends LLM2 {
    get chatUrl() {
      return join(this.baseUrl, "responses");
    }
    get modelsUrl() {
      return join(this.baseUrl, "models");
    }
    parseOptions(options) {
      options.input = options.messages;
      delete options.messages;
      if (options.max_tokens) {
        const max_tokens = options.max_tokens;
        delete options.max_tokens;
        options.max_output_tokens = max_tokens;
      }
      if (options.tools) {
        const tools = options.tools.map((tool) => wrapTool(tool));
        options.tools = tools;
      }
      if (options.think && !options.reasoning) {
        options.reasoning = { effort: "medium", summary: "detailed" };
      }
      delete options.think;
      return options;
    }
    parseContent(data2) {
      if (!data2 || !data2.output || !Array.isArray(data2.output)) return "";
      if (data2.object !== "response" || data2.status !== "completed") return "";
      for (const output of data2.output) {
        if (output.type !== "message" || output.role !== "assistant" || output.status !== "completed" || !output.content || !Array.isArray(output.content)) continue;
        for (const content of output.content) {
          if (content.type !== "output_text" || !content.text) continue;
          return content.text;
        }
      }
      return "";
    }
    parseTokenUsage(data2) {
      if (data2.response && data2.type === "response.completed") data2 = data2.response;
      if (!data2 || !data2.usage || !data2.usage.input_tokens || !data2.usage.output_tokens) return null;
      return {
        input_tokens: data2.usage.input_tokens,
        output_tokens: data2.usage.output_tokens
      };
    }
    parseTools(data2) {
      if (!data2 || !data2.output || !Array.isArray(data2.output)) return [];
      if (data2.object !== "response" || data2.status !== "completed") return [];
      const tool_calls = [];
      for (const output of data2.output) {
        if (output.type !== "function_call" || output.status !== "completed" || !output.call_id || !output.name || !output.arguments) continue;
        tool_calls.push({
          id: output.call_id,
          name: output.name,
          input: JSON.parse(output.arguments)
        });
      }
      return tool_calls;
    }
    parseToolsChunk(data2) {
      if (data2.type === "response.output_item.added" && data2.item && data2.item.type === "function_call") {
        this.cache["tool_call"] = data2.item;
      }
      if (this.cache["tool_call"] && data2.type === "response.function_call_arguments.done") {
        this.cache["tool_call_input"] = data2.arguments;
      }
      if (!this.cache["tool_call"]) return [];
      if (!this.cache["tool_call_input"]) return [];
      try {
        const input = JSON.parse(this.cache["tool_call_input"]);
        const tool_call = { id: this.cache["tool_call"].id, name: this.cache["tool_call"].name, input };
        delete this.cache["tool_call"];
        delete this.cache["tool_call_input"];
        return [tool_call];
      } catch (error) {
        return [];
      }
    }
    parseThinking(data2) {
      if (!data2 || !data2.output || !Array.isArray(data2.output)) return "";
      if (data2.object !== "response" || data2.status !== "completed") return "";
      for (const output of data2.output) {
        if (output.type !== "reasoning" || !output.summary || !Array.isArray(output.summary)) continue;
        for (const part of output.summary) {
          if (part.type !== "summary_text" || !part.text) continue;
          return part.text;
        }
      }
      return "";
    }
    parseThinkingChunk(chunk) {
      if (!chunk || chunk.type !== "response.reasoning_summary_text.delta" || !chunk.delta) return "";
      return chunk.delta;
    }
    parseContentChunk(chunk) {
      if (!chunk || !chunk.delta || chunk.type !== "response.output_text.delta") return "";
      return chunk.delta;
    }
    parseModel(model) {
      return {
        name: model.model,
        model: model.id,
        created: new Date(model.created * 1e3)
      };
    }
    parseAttachment(attachment) {
      const data2 = attachment.isURL ? attachment.data : `data:${attachment.contentType};base64,${attachment.data}`;
      if (attachment.isImage) {
        return { type: "input_image", image_url: data2 };
      } else if (attachment.isDocument) {
        return { type: "input_file", filename: crypto.randomUUID(), file_data: data2 };
      }
      throw new Error("Unsupported attachment type");
    }
    filterQualityModel(model) {
      const keywords = [
        "audio",
        "image",
        "davinci",
        "babbage",
        "dall-e",
        "tts",
        "whisper",
        "embedding",
        "vision",
        "moderation",
        "realtime",
        "computer-use",
        "transcribe",
        "instruct",
        "codex"
      ];
      return keywordFilter(model.model, keywords);
    }
  };
  _OpenAI.service = "openai";
  _OpenAI.DEFAULT_BASE_URL = "https://api.openai.com/v1";
  _OpenAI.DEFAULT_MODEL = "gpt-4o-mini";
  _OpenAI.isBearerAuth = true;
  _OpenAI.MessageExtendedContentInputKey = "input_text";
  let OpenAI = _OpenAI;
  function wrapTool(tool) {
    return {
      name: tool.name,
      parameters: Object.assign({}, tool.input_schema, { additionalProperties: false }),
      strict: true,
      type: "function",
      description: tool.description
    };
  }
  const _Google = class _Google extends LLM2 {
    get chatUrl() {
      return join(this.baseUrl, "chat/completions");
    }
    get modelsUrl() {
      return join(this.baseUrl, "models");
    }
    getChatUrl(opts) {
      return join(this.baseUrl, "models", `${opts.model}:generateContent?key=${this.apiKey}`);
    }
    getModelsUrl() {
      return `${this.modelsUrl}?key=${this.apiKey}`;
    }
    parseOptions(options) {
      const opts = deepClone(options);
      const messages = opts.messages || [];
      const system = filterMessageRole(messages, "system");
      const nonSystem = filterNotMessageRole(messages, "system");
      delete opts.messages;
      if (system.length > 0) {
        opts.system_instruction = { parts: system.map((message) => ({ text: message.content })) };
      }
      if (nonSystem.length > 0) {
        opts.contents = nonSystem.map(_Google.toGoogleMessage);
      }
      if (!opts.generationConfig) opts.generationConfig = {};
      if (typeof opts.temperature === "number") opts.generationConfig.temperature = opts.temperature;
      if (typeof opts.max_tokens === "number") opts.generationConfig.maxOutputTokens = opts.max_tokens;
      if (!opts.generationConfig.maxOutputTokens) opts.generationConfig.maxOutputTokens = this.max_tokens;
      if (opts.tools) {
        opts.tools = [{ functionDeclarations: opts.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema
        })) }];
      }
      if (opts.think) {
        if (!opts.generationConfig) opts.generationConfig = {};
        opts.generationConfig.thinkingConfig = { includeThoughts: true };
        delete opts.think;
      }
      delete opts.think;
      delete opts.max_tokens;
      delete opts.temperature;
      delete opts.stream;
      return opts;
    }
    parseMessages(messages) {
      return messages.map((message) => {
        const copy = deepClone(message);
        if (copy.role === "thinking" || copy.role === "tool_call") copy.role = "assistant";
        if (typeof copy.content !== "string" && !(copy.content && copy.content.attachments)) {
          copy.content = JSON.stringify(copy.content);
        }
        return copy;
      });
    }
    get llmHeaders() {
      const headers = super.llmHeaders;
      delete headers["x-api-key"];
      return headers;
    }
    parseContent(data2) {
      var _a, _b, _c;
      if (!((_c = (_b = (_a = data2 == null ? void 0 : data2.candidates) == null ? void 0 : _a[0]) == null ? void 0 : _b.content) == null ? void 0 : _c.parts)) return "";
      const parts = data2.candidates[0].content.parts;
      for (const part of parts) {
        if (part.thought) continue;
        return part.text;
      }
      return "";
    }
    parseTokenUsage(data2) {
      var _a, _b;
      if (!((_a = data2 == null ? void 0 : data2.usageMetadata) == null ? void 0 : _a.promptTokenCount) || !((_b = data2 == null ? void 0 : data2.usageMetadata) == null ? void 0 : _b.candidatesTokenCount)) return null;
      const usage = data2.usageMetadata;
      return { input_tokens: usage.promptTokenCount, output_tokens: usage.candidatesTokenCount };
    }
    parseModel(model) {
      return {
        name: model.displayName,
        model: model.name.replace(/^models\//, ""),
        created: /* @__PURE__ */ new Date(),
        // :(
        max_input_tokens: model.inputTokenLimit,
        max_output_tokens: model.outputTokenLimit
      };
    }
    parseTools(data2) {
      var _a, _b, _c, _d, _e;
      if (!((_e = (_d = (_c = (_b = (_a = data2 == null ? void 0 : data2.candidates) == null ? void 0 : _a[0]) == null ? void 0 : _b.content) == null ? void 0 : _c.parts) == null ? void 0 : _d[0]) == null ? void 0 : _e.functionCall)) return [];
      const functionCall = data2.candidates[0].content.parts[0].functionCall;
      return [{ id: uuid(), name: functionCall.name, input: functionCall.args }];
    }
    parseThinking(data2) {
      var _a, _b, _c;
      if (!((_c = (_b = (_a = data2 == null ? void 0 : data2.candidates) == null ? void 0 : _a[0]) == null ? void 0 : _b.content) == null ? void 0 : _c.parts)) return "";
      const parts = data2.candidates[0].content.parts;
      for (const part of parts) {
        if (part.thought !== true) continue;
        return part.text;
      }
      return "";
    }
    parseAttachment(attachment) {
      if (attachment.isImage) {
        if (!attachment.isURL) {
          return { "inline_data": { "mime_type": attachment.contentType, "data": attachment.data } };
        }
      }
      throw new Error("Unsupported attachment type");
    }
    parseAttachmentsContent(content) {
      var _a;
      const parts = ((_a = content.attachments) == null ? void 0 : _a.map(this.parseAttachment.bind(this))) || [];
      if (content.text) {
        parts.push({ text: content.text });
      }
      return parts;
    }
    filterQualityModel(model) {
      const keywords = ["embedding", "vision", "learnlm", "image-generation", "gemma-3", "gemma-3n", "gemini-1.5", "embedding"];
      return keywordFilter(model.model, keywords);
    }
    static toGoogleMessage(message) {
      if (message.content && typeof message.content === "object" && message.content.attachments) {
        const parts = [];
        for (const attachment of message.content.attachments) {
          if (attachment.contentType !== "url") {
            parts.push({
              inline_data: {
                mime_type: attachment.contentType,
                data: attachment.data
              }
            });
          } else {
            throw new Error("URL attachments are not supported with Google");
          }
        }
        if (message.content.text) {
          parts.push({ text: message.content.text });
        }
        return {
          role: message.role === "assistant" ? "model" : message.role,
          parts
        };
      } else {
        const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
        return {
          role: message.role === "assistant" ? "model" : message.role,
          parts: [{ text: content }]
        };
      }
    }
    static fromGoogleMessage(googleMessage) {
      const parts = googleMessage.parts;
      if (parts.length === 1 && "text" in parts[0] && parts[0].text) {
        return { role: googleMessage.role, content: parts[0].text };
      }
      if (parts.length === 2 && "inline_data" in parts[0] && "text" in parts[1] && parts[0].inline_data && parts[1].text) {
        return {
          role: googleMessage.role,
          content: {
            text: parts[1].text,
            attachments: [{
              type: "image",
              contentType: parts[0].inline_data.mime_type,
              data: parts[0].inline_data.data
            }]
          }
        };
      }
      throw new Error("Unsupported message type");
    }
  };
  _Google.service = "google";
  _Google.DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/";
  _Google.DEFAULT_MODEL = "gemini-2.5-flash-preview-05-20";
  let Google = _Google;
  const _APIv1 = class _APIv1 extends LLM2 {
    get chatUrl() {
      return join(this.baseUrl, "chat/completions");
    }
    get modelsUrl() {
      return join(this.baseUrl, "models");
    }
    parseOptions(options) {
      if (options.think && !options.reasoning_effort) {
        options.reasoning_effort = "high";
      }
      delete options.think;
      if (options.tools) {
        const tools = options.tools.map((tool) => wrapTool$1(tool));
        options.tools = tools;
      }
      if (options.stream) {
        options.stream_options = { include_usage: true };
      }
      return options;
    }
    parseContent(data2) {
      if (!data2) return "";
      if (!data2.choices) return "";
      if (!data2.choices[0]) return "";
      if (!data2.choices[0].message) return "";
      return data2.choices[0].message.content;
    }
    parseContentChunk(data2) {
      if (!data2) return "";
      if (!data2.choices) return "";
      if (!data2.choices[0]) return "";
      if (!data2.choices[0].delta) return "";
      if (!data2.choices[0].delta.content) return "";
      return data2.choices[0].delta.content;
    }
    parseThinking(data2) {
      const key = this.constructor.KEY_REASONING_CONTENT;
      if (!data2 || !data2.choices || !data2.choices[0] || !data2.choices[0].message || !data2.choices[0].message[key]) return "";
      return data2.choices[0].message[key];
    }
    parseThinkingChunk(data2) {
      const key = this.constructor.KEY_REASONING_CONTENT;
      if (!data2 || !data2.choices || !data2.choices[0] || !data2.choices[0].delta || !data2.choices[0].delta[key]) return "";
      return data2.choices[0].delta[key];
    }
    parseTokenUsage(data2) {
      if (!data2) return null;
      if (!data2.usage) return null;
      if (!data2.usage.prompt_tokens) return null;
      if (!data2.usage.completion_tokens) return null;
      return {
        input_tokens: data2.usage.prompt_tokens,
        output_tokens: data2.usage.completion_tokens
      };
    }
    parseModel(model) {
      let created = model.created ? new Date(model.created * 1e3) : /* @__PURE__ */ new Date();
      return { name: model.model, model: model.id, created };
    }
    parseTools(data2) {
      if (!data2 || !data2.choices || !data2.choices[0] || !data2.choices[0].message || !data2.choices[0].message.tool_calls) return [];
      return data2.choices[0].message.tool_calls.map((tool_call) => unwrapToolCall(tool_call));
    }
    parseToolsChunk(data2) {
      if (!data2 || !data2.choices || !data2.choices[0] || !data2.choices[0].delta || !data2.choices[0].delta.tool_calls) return [];
      return data2.choices[0].delta.tool_calls.map((tool_call) => unwrapToolCall(tool_call));
    }
    filterQualityModel(model) {
      const keywords = ["audio", "vision", "image"];
      return keywordFilter(model.model, keywords);
    }
    parseAttachment(attachment) {
      if (attachment.isImage) {
        if (attachment.isURL) {
          return { type: "image_url", image_url: { url: attachment.data, detail: "high" } };
        } else {
          return { type: "image_url", image_url: { url: `data:${attachment.contentType};base64,${attachment.data}`, detail: "high" } };
        }
      }
      throw new Error("Unsupported attachment type");
    }
  };
  _APIv1.service = "openai";
  _APIv1.DEFAULT_BASE_URL = "";
  _APIv1.DEFAULT_MODEL = "";
  _APIv1.isBearerAuth = true;
  _APIv1.KEY_REASONING_CONTENT = "reasoning_content";
  let APIv1 = _APIv1;
  const _xAI = class _xAI extends APIv1 {
  };
  _xAI.service = "xai";
  _xAI.DEFAULT_BASE_URL = "https://api.x.ai/v1/";
  _xAI.DEFAULT_MODEL = "grok-3";
  let xAI = _xAI;
  const _Groq = class _Groq extends APIv1 {
    parseOptions(options) {
      options = super.parseOptions(options);
      if (options.reasoning_effort === "high") {
        delete options.reasoning_effort;
        if (!options.reasoning_format) options.reasoning_format = "parsed";
      }
      return options;
    }
    // groq wraps usage in x_groq for streaming
    parseTokenUsage(data2) {
      if (!data2) return null;
      if (!data2.usage && data2.x_groq && data2.x_groq.usage) data2 = data2.x_groq;
      if (!data2 || !data2.usage) return null;
      if (!data2.usage.prompt_tokens) return null;
      if (!data2.usage.completion_tokens) return null;
      return {
        input_tokens: data2.usage.prompt_tokens,
        output_tokens: data2.usage.completion_tokens
      };
    }
    filterQualityModel(model) {
      return keywordFilter(model.model, ["whisper", "tts"]);
    }
  };
  _Groq.service = "groq";
  _Groq.DEFAULT_BASE_URL = "https://api.groq.com/openai/v1/";
  _Groq.DEFAULT_MODEL = "deepseek-r1-distill-llama-70b";
  _Groq.KEY_REASONING_CONTENT = "reasoning";
  let Groq = _Groq;
  const _DeepSeek = class _DeepSeek extends APIv1 {
  };
  _DeepSeek.service = "deepseek";
  _DeepSeek.DEFAULT_BASE_URL = "https://api.deepseek.com/v1/";
  _DeepSeek.DEFAULT_MODEL = "deepseek-chat";
  let DeepSeek = _DeepSeek;
  class Attachment {
    constructor(data2, type, contentType) {
      this.data = data2;
      this.type = type;
      this.contentType = contentType;
    }
    get isImage() {
      return this.type === "image";
    }
    get isDocument() {
      return this.type === "document";
    }
    get isURL() {
      return this.contentType === "url";
    }
    get content() {
      return { type: this.type, source: this.source };
    }
    get source() {
      if (this.contentType === "url") {
        return { type: "url", url: this.data };
      } else {
        return { type: "base64", media_type: this.contentType, data: this.data };
      }
    }
    static fromBase64(data2, type, contentType) {
      return new Attachment(data2, type, contentType);
    }
    static fromJPEG(data2) {
      return new Attachment(data2, "image", "image/jpeg");
    }
    static fromPNG(data2) {
      return new Attachment(data2, "image", "image/png");
    }
    static fromGIF(data2) {
      return new Attachment(data2, "image", "image/gif");
    }
    static fromWEBP(data2) {
      return new Attachment(data2, "image", "image/webp");
    }
    static fromSVG(data2) {
      return new Attachment(data2, "image", "image/svg+xml");
    }
    static fromTIFF(data2) {
      return new Attachment(data2, "image", "image/tiff");
    }
    static fromPDF(data2) {
      return new Attachment(data2, "document", "application/pdf");
    }
    static fromImageURL(url) {
      return new Attachment(url, "image", "url");
    }
    static fromDocumentURL(url) {
      return new Attachment(url, "document", "url");
    }
  }
  let SERVICES = [Anthropic, Ollama, OpenAI, Google, xAI, Groq, DeepSeek];
  function LLMShortHandImpl(initOrOpts, opts) {
    let input;
    let options;
    if (typeof initOrOpts === "string" || Array.isArray(initOrOpts)) {
      input = initOrOpts;
      options = opts || {};
    } else if (typeof initOrOpts === "object" && initOrOpts !== null) {
      input = void 0;
      options = initOrOpts;
    } else {
      input = void 0;
      options = {};
    }
    let llm;
    const service = (options == null ? void 0 : options.service) ?? config.service;
    let LLMClass = SERVICES.find((Service) => Service.service === service);
    if (!LLMClass) LLMClass = APIv1;
    llm = new LLMClass(input, options);
    if (new.target) return llm;
    const response = llm.send();
    return response;
  }
  const LLMWrapper = LLMShortHandImpl;
  LLMWrapper.parsers = parsers;
  LLMWrapper.services = SERVICES;
  LLMWrapper.ModelUsage = ModelUsage;
  LLMWrapper.Anthropic = Anthropic;
  LLMWrapper.Ollama = Ollama;
  LLMWrapper.OpenAI = OpenAI;
  LLMWrapper.Google = Google;
  LLMWrapper.xAI = xAI;
  LLMWrapper.Groq = Groq;
  LLMWrapper.DeepSeek = DeepSeek;
  LLMWrapper.APIv1 = APIv1;
  LLMWrapper.LLM = LLM2;
  LLMWrapper.Attachment = Attachment;
  LLMWrapper.register = (LLMClass) => {
    SERVICES.push(LLMClass);
  };
  LLMWrapper.unregister = (LLMClass) => {
    SERVICES = SERVICES.filter((Service) => Service !== LLMClass);
  };
  return LLMWrapper;
}();
//# sourceMappingURL=index.js.map
