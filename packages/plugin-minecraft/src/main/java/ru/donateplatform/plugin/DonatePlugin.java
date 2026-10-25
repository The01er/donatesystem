package ru.donateplatform.plugin;

import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;
import ru.donateplatform.plugin.config.PluginConfig;
import ru.donateplatform.plugin.http.ApiClient;
import ru.donateplatform.plugin.service.OrderPoller;

public class DonatePlugin extends JavaPlugin {
    private PluginConfig pluginConfig;
    private ApiClient apiClient;
    private OrderPoller orderPoller;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        pluginConfig = new PluginConfig(this);

        if (!pluginConfig.isValid()) {
            getLogger().severe("[DonatePlugin] Invalid config: api-url and api-token are required");
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        apiClient = new ApiClient(pluginConfig);
        orderPoller = new OrderPoller(this, apiClient);
        orderPoller.start(pluginConfig.getPollInterval());

        getLogger().info("[DonatePlugin] Enabled. Polling " + pluginConfig.getApiUrl()
                + " every " + pluginConfig.getPollInterval() + "s");
    }

    @Override
    public void onDisable() {
        if (orderPoller != null) {
            orderPoller.stopAll();
        }
        getLogger().info("[DonatePlugin] Disabled");
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!command.getName().equalsIgnoreCase("donate")) return false;

        if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
            if (!sender.hasPermission("donateplugin.reload")) {
                sender.sendMessage("§cYou don't have permission.");
                return true;
            }
            if (orderPoller != null) orderPoller.stopAll();
            if (apiClient != null) apiClient.shutdown();
            pluginConfig.reload();
            if (!pluginConfig.isValid()) {
                sender.sendMessage("§cInvalid config after reload.");
                return true;
            }
            apiClient = new ApiClient(pluginConfig);
            orderPoller = new OrderPoller(this, apiClient);
            orderPoller.start(pluginConfig.getPollInterval());
            sender.sendMessage("§aDonatePlugin reloaded.");
            getLogger().info("[DonatePlugin] Reloaded by " + sender.getName());
            return true;
        }

        sender.sendMessage("§6DonatePlugin §fv" + getDescription().getVersion());
        sender.sendMessage("§7/donate reload §f- Reload config");
        return true;
    }
}
