package ru.donateplatform.plugin.config;

import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

public class PluginConfig {
    private final JavaPlugin plugin;
    private String apiUrl;
    private String apiToken;
    private int pollInterval;

    public PluginConfig(JavaPlugin plugin) {
        this.plugin = plugin;
        reload();
    }

    public void reload() {
        plugin.saveDefaultConfig();
        plugin.reloadConfig();
        FileConfiguration cfg = plugin.getConfig();

        apiUrl = cfg.getString("api-url", "http://localhost:3001");
        apiToken = cfg.getString("api-token", "");
        pollInterval = cfg.getInt("poll-interval", 5);

        if (apiUrl.endsWith("/")) {
            apiUrl = apiUrl.substring(0, apiUrl.length() - 1);
        }
        if (pollInterval < 2) {
            pollInterval = 2;
        }
    }

    public String getApiUrl() { return apiUrl; }
    public String getApiToken() { return apiToken; }
    public int getPollInterval() { return pollInterval; }

    public boolean isValid() {
        return apiToken != null && !apiToken.isEmpty() && apiUrl != null && !apiUrl.isEmpty();
    }
}
