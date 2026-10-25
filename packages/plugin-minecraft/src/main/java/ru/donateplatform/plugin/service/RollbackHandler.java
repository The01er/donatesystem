package ru.donateplatform.plugin.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.bukkit.Bukkit;
import org.bukkit.plugin.java.JavaPlugin;
import ru.donateplatform.plugin.http.ApiClient;
import ru.donateplatform.plugin.model.Action;
import ru.donateplatform.plugin.model.Order;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class RollbackHandler {

    public static void rollback(Order order, List<Action> allActions, List<Integer> committedIndexes,
                                 ApiClient apiClient, String attemptId, String playerName, JavaPlugin plugin) {
        if (committedIndexes == null || committedIndexes.isEmpty()) return;

        // Parse full action list if not provided
        List<Action> actions = allActions;
        if (actions == null || actions.isEmpty()) {
            String json = order.getProduct().getActionsJson();
            if (json != null && !json.isEmpty()) {
                try {
                    Type listType = new TypeToken<List<Action>>() {}.getType();
                    actions = new Gson().fromJson(json, listType);
                } catch (Exception e) {
                    plugin.getLogger().warning("[DonatePlugin] Failed to parse actions for rollback");
                    return;
                }
            }
        }
        if (actions == null || actions.isEmpty()) return;

        final List<Action> finalActions = actions;
        final String orderId = order.getId();

        // Reverse to LIFO order — last committed action must be rolled back first
        List<Integer> reversed = new ArrayList<>(committedIndexes);
        Collections.sort(reversed, Collections.reverseOrder());

        Bukkit.getScheduler().runTask(plugin, () -> {
            for (int idx : reversed) {
                if (idx < 0 || idx >= finalActions.size()) continue;
                Action original = finalActions.get(idx);
                try {
                    ActionExecutor.executeRollback(original, playerName, orderId);
                } catch (Exception e) {
                    plugin.getLogger().warning("[DonatePlugin] Rollback failed for action " + idx + ": " + e.getMessage());
                }
            }
            // Notify backend about each rollback result
            if (attemptId != null && apiClient != null) {
                apiClient.reportRollbackResult(orderId, attemptId, 0, "rolled_back", null);
            }
        });
    }
}
