package ru.donateplatform.plugin.service;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.RegisteredServiceProvider;
import ru.donateplatform.plugin.model.Action;
import ru.donateplatform.plugin.model.RouletteVariant;
import ru.donateplatform.plugin.util.PlaceholderUtil;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.logging.Logger;

public class ActionExecutor {
    private static final Logger log = Bukkit.getLogger();
    private static Object vaultChat = null;
    private static boolean vaultChecked = false;

    public static class ActionFailedException extends RuntimeException {
        public ActionFailedException(String message) {
            super(message);
        }
    }

    public static void execute(Action action, String playerName, String orderId) {
        if (action == null) return;

        switch (action.getType()) {
            case "command":
                executeCommand(action.getValue(), playerName, orderId);
                break;
            case "roulette":
                executeRoulette(action.getVariants(), playerName, orderId);
                break;
            case "if_has_permission":
            case "if_has_group":
            case "if_missing_group":
                executeConditional(action, playerName, orderId);
                break;
            default:
                log.warning("[DonatePlugin] Unsupported action type: " + action.getType());
        }
    }

    private static void executeCommand(String command, String playerName, String orderId) {
        String cmd = PlaceholderUtil.replace(command, playerName, orderId);
        boolean ok = Bukkit.dispatchCommand(Bukkit.getConsoleSender(), cmd);
        if (!ok) {
            throw new ActionFailedException("Command failed: " + cmd);
        }
    }

    private static void executeRoulette(List<RouletteVariant> variants, String playerName, String orderId) {
        if (variants == null || variants.isEmpty()) {
            throw new ActionFailedException("Roulette has no variants");
        }

        RouletteVariant picked = weightedRandom(variants);
        if (picked == null || picked.getCommand() == null || picked.getCommand().trim().isEmpty()) {
            throw new ActionFailedException("Roulette picked empty variant");
        }

        String[] commands = picked.getCommand().split(";");
        if (commands.length > 10) {
            throw new ActionFailedException("Roulette variant has too many sub-commands (" + commands.length + " > 10)");
        }
        for (String cmd : commands) {
            String trimmed = cmd.trim();
            if (!trimmed.isEmpty()) {
                executeCommand(trimmed, playerName, orderId);
            }
        }
    }

    private static void executeConditional(Action action, String playerName, String orderId) {
        Player player = Bukkit.getPlayer(playerName);
        boolean condition = false;

        switch (action.getType()) {
            case "if_has_permission":
                condition = player != null && player.hasPermission(action.getValue());
                break;
            case "if_has_group":
                condition = player != null && checkGroup(player, action.getValue());
                break;
            case "if_missing_group":
                condition = player == null || !checkGroup(player, action.getValue());
                break;
        }

        List<Action> branch = condition ? action.getThen() : action.getElse();
        if (branch != null) {
            for (Action sub : branch) {
                execute(sub, playerName, orderId);
            }
        }
    }

    private static boolean checkGroup(Player player, String group) {
        Object chat = getVaultChat();
        if (chat != null) {
            try {
                return (boolean) chat.getClass().getMethod("playerInGroup", Player.class, String.class)
                        .invoke(chat, player, group);
            } catch (Exception ignored) {}
        }
        return player.hasPermission("group." + group);
    }

    private static Object getVaultChat() {
        if (!vaultChecked) {
            vaultChecked = true;
            try {
                Class<?> chatClass = Class.forName("net.milkbowl.vault.chat.Chat");
                RegisteredServiceProvider<?> rsp = Bukkit.getServicesManager().getRegistration(chatClass);
                if (rsp != null) {
                    vaultChat = rsp.getProvider();
                }
            } catch (ClassNotFoundException | NoClassDefFoundError ignored) {
                log.info("[DonatePlugin] Vault not found, group checks fallback to permissions");
            }
        }
        return vaultChat;
    }

    private static RouletteVariant weightedRandom(List<RouletteVariant> variants) {
        double total = 0;
        for (RouletteVariant v : variants) {
            total += v.getChance();
        }
        double r = ThreadLocalRandom.current().nextDouble() * total;
        double cumulative = 0;
        for (RouletteVariant v : variants) {
            cumulative += v.getChance();
            if (r <= cumulative) return v;
        }
        return variants.get(variants.size() - 1);
    }

    public static void executeRollback(Action originalAction, String playerName, String orderId) {
        String reverseType = null;
        String value = originalAction.getValue();
        Integer amount = originalAction.getAmount();

        switch (originalAction.getType()) {
            case "add_group":
                reverseType = "remove_group";
                break;
            case "remove_group":
                reverseType = "add_group";
                break;
            case "give_item":
                reverseType = "remove_item";
                break;
            case "remove_item":
                reverseType = "give_item";
                break;
        }

        if (reverseType != null) {
            Action reverse = new Action(reverseType, value);
            if (amount != null && "remove_item".equals(reverseType)) {
                reverse.setAmount(amount);
            }
            execute(reverse, playerName, orderId);
        }
    }
}
