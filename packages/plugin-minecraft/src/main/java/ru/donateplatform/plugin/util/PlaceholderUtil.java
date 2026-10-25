package ru.donateplatform.plugin.util;

public class PlaceholderUtil {

    /**
     * Sanitize a value for use in Minecraft console commands.
     * Strips '@' selectors to prevent {@code @a}, {@code @e}, etc. injection.
     */
    private static String sanitize(String value) {
        if (value == null) return "";
        return value.replace("@", "");
    }

    public static String replace(String template, String playerName, String orderId) {
        if (template == null) return "";
        return template
                .replace("{player}", sanitize(playerName))
                .replace("{order_id}", orderId != null && orderId.length() >= 8 ? orderId.substring(0, 8) : (orderId != null ? orderId : ""))
                .replace("{server}", "");
    }
}
