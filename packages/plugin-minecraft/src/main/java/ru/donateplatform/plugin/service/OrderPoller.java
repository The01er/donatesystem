package ru.donateplatform.plugin.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.HandlerList;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;
import ru.donateplatform.plugin.http.ApiClient;
import ru.donateplatform.plugin.model.Action;
import ru.donateplatform.plugin.model.Order;
import ru.donateplatform.plugin.model.Revocation;

import java.lang.reflect.Type;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

import static java.util.Collections.reverseOrder;

public class OrderPoller extends BukkitRunnable implements Listener {
    private final JavaPlugin plugin;
    private final ApiClient apiClient;
    private final Gson gson = new Gson();
    private final Map<String, HeartbeatTask> heartbeats = new ConcurrentHashMap<>();
    private final Map<String, List<PendingContext>> pendingOrders = new ConcurrentHashMap<>();
    private boolean running = true;

    private static final long PENDING_ORDER_TTL_MS = 3600000; // 1 hour

    private static class PendingContext {
        final Order order;
        final List<Action> actions;
        final long createdAt;
        PendingContext(Order order, List<Action> actions) {
            this.order = order;
            this.actions = actions;
            this.createdAt = System.currentTimeMillis();
        }
    }

    public OrderPoller(JavaPlugin plugin, ApiClient apiClient) {
        this.plugin = plugin;
        this.apiClient = apiClient;
    }

    public void start(int pollInterval) {
        long ticks = pollInterval * 20L;
        runTaskTimerAsynchronously(plugin, 0L, ticks);
        Bukkit.getPluginManager().registerEvents(this, plugin);
    }

    @Override
    public void run() {
        if (!running) return;

        apiClient.fetchOrders(new ApiClient.Callback<List<Order>>() {
            @Override
            public void onSuccess(List<Order> orders) {
                for (Order order : orders) {
                    processOrder(order);
                }
            }

            @Override
            public void onError(String error) {
                plugin.getLogger().warning("[DonatePlugin] " + error);
            }
        });

        apiClient.fetchRevocations(new ApiClient.Callback<List<Revocation>>() {
            @Override
            public void onSuccess(List<Revocation> revocations) {
                for (Revocation revocation : revocations) {
                    processRevocation(revocation);
                }
            }

            @Override
            public void onError(String error) {
                plugin.getLogger().warning("[DonatePlugin] fetchRevocations: " + error);
            }
        });
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        String playerName = event.getPlayer().getName().toLowerCase();
        List<PendingContext> pending = pendingOrders.remove(playerName);
        if (pending != null) {
            for (PendingContext ctx : pending) {
                if (System.currentTimeMillis() - ctx.createdAt > PENDING_ORDER_TTL_MS) {
                    plugin.getLogger().warning("[DonatePlugin] Expired pending order " + ctx.order.getId() + " dropped for " + playerName);
                    continue;
                }
                plugin.getLogger().info("[DonatePlugin] Player " + playerName + " joined, processing order " + ctx.order.getId());
                Bukkit.getScheduler().runTask(plugin, () ->
                    executeNext(ctx.order, ctx.actions, 0));
            }
        }
    }

    private void processOrder(Order order) {
        apiClient.startOrder(order.getId(),
            new ApiClient.Callback<Order>() {
                @Override
                public void onSuccess(Order startedOrder) {
                    List<Action> actionsList = parseActions(startedOrder.getProduct().getActionsJson());
                    if (actionsList == null || actionsList.isEmpty()) {
                        plugin.getLogger().warning("[DonatePlugin] Empty actions for order " + startedOrder.getId());
                        apiClient.completeOrder(startedOrder.getId(), null, null);
                        return;
                    }
                    final List<Action> finalActions = actionsList;
                    startHeartbeat(startedOrder.getId());

                    // Check if player is online (case-insensitive) — must be on main thread
                    final String orderPlayerName = startedOrder.getPlayerName();
                    final String orderId = startedOrder.getId();
                    final Order finalOrder = startedOrder;
                    Bukkit.getScheduler().runTask(plugin, () -> {
                        Player player = Bukkit.getPlayer(orderPlayerName);
                        if (player == null || !player.isOnline()) {
                            // Queue for delivery when player joins
                            String key = orderPlayerName.toLowerCase();
                            pendingOrders.computeIfAbsent(key, k -> Collections.synchronizedList(new ArrayList<>()))
                                    .add(new PendingContext(finalOrder, finalActions));
                            plugin.getLogger().info("[DonatePlugin] Player " + orderPlayerName
                                    + " offline, order " + orderId + " queued");
                            return;
                        }

                        executeNext(finalOrder, finalActions, 0);
                    });
                }

                @Override
                public void onError(String error) {
                    plugin.getLogger().warning("[DonatePlugin] " + error);
                }
            },
            new Runnable() {
                @Override
                public void run() {
                    // 409 conflict — order is being processed elsewhere, skip
                }
            },
            new ApiClient.ErrorCallback() {
                @Override
                public void onError(String error) {
                    plugin.getLogger().warning("[DonatePlugin] startOrder: " + error);
                }
            }
        );
    }

    private void executeNext(Order order, List<Action> actions, int index) {
        if (index >= actions.size()) {
            stopHeartbeat(order.getId());
            apiClient.completeOrder(order.getId(), () ->
                plugin.getLogger().info("[DonatePlugin] Order " + order.getId() + " delivered"),
                null);
            return;
        }

        Action action = actions.get(index);
        String playerName = order.getPlayerName();
        String orderId = order.getId();

        Bukkit.getScheduler().runTask(plugin, () -> {
            String error = null;
            try {
                ActionExecutor.execute(action, playerName, orderId);
            } catch (ActionExecutor.ActionFailedException e) {
                error = e.getMessage();
            } catch (Exception e) {
                error = e.getMessage();
            }

            String status = (error == null) ? "success" : "failed";
            apiClient.reportActionResult(orderId, index, action.getType(), status, error,
                new ApiClient.Callback<ApiClient.ActionResultResponse>() {
                    @Override
                    public void onSuccess(ApiClient.ActionResultResponse result) {
                        if (result.isRollbackRequired()) {
                            stopHeartbeat(orderId);
                            plugin.getLogger().warning("[DonatePlugin] Rollback required for order " + orderId);
                            RollbackHandler.rollback(order, actions, result.getCommittedActions(),
                                    apiClient, result.getAttemptId(), playerName, plugin);
                        } else if ("paid".equals(result.getStatus()) || "failed".equals(result.getStatus())) {
                            stopHeartbeat(orderId);
                            plugin.getLogger().info("[DonatePlugin] Order " + orderId + " -> " + result.getStatus());
                        } else {
                            executeNext(order, actions, index + 1);
                        }
                    }

                    @Override
                    public void onError(String err) {
                        plugin.getLogger().warning("[DonatePlugin] reportActionResult: " + err);
                        // Continue to next action — delivery is still in progress
                        executeNext(order, actions, index + 1);
                    }
                });
        });
    }

    private void processRevocation(Revocation revocation) {
        String orderId = revocation.getId();
        String playerName = revocation.getPlayerName();
        String revokeCommand = revocation.getRevokeCommand();

        if (revokeCommand == null || revokeCommand.trim().isEmpty()) {
            apiClient.reportRevocationResult(orderId, "failed", "Empty revoke command", null,
                error -> plugin.getLogger().warning("[DonatePlugin] reportRevocationResult: " + error));
            return;
        }

        Bukkit.getScheduler().runTask(plugin, () -> {
            String error = null;
            try {
                ActionExecutor.execute(new Action("command", revokeCommand), playerName, orderId);
                plugin.getLogger().info("[DonatePlugin] Revocation successful for order " + orderId);
            } catch (ActionExecutor.ActionFailedException e) {
                error = e.getMessage();
            } catch (Exception e) {
                error = e.getMessage();
            }

            String resultStatus = (error == null) ? "revoked" : "failed";
            apiClient.reportRevocationResult(orderId, resultStatus, error,
                () -> plugin.getLogger().info("[DonatePlugin] Revocation " + resultStatus + " for order " + orderId),
                err -> plugin.getLogger().warning("[DonatePlugin] reportRevocationResult: " + err));
        });
    }

    private List<Action> parseActions(String actionsJson) {
        if (actionsJson == null || actionsJson.trim().isEmpty()) return Collections.emptyList();
        try {
            Type listType = new TypeToken<List<Action>>() {}.getType();
            return gson.fromJson(actionsJson, listType);
        } catch (Exception e) {
            plugin.getLogger().log(Level.WARNING, "[DonatePlugin] Failed to parse actionsJson", e);
            return Collections.emptyList();
        }
    }

    private void startHeartbeat(String orderId) {
        HeartbeatTask task = new HeartbeatTask(orderId);
        heartbeats.put(orderId, task);
        task.runTaskTimerAsynchronously(plugin, 40L, 40L);
    }

    private void stopHeartbeat(String orderId) {
        HeartbeatTask task = heartbeats.remove(orderId);
        if (task != null) {
            try {
                task.cancel();
            } catch (Exception ignored) {}
        }
    }

    public void stopAll() {
        running = false;
        HandlerList.unregisterAll(this);
        try { cancel(); } catch (Exception ignored) {}
        for (HeartbeatTask task : heartbeats.values()) {
            try { task.cancel(); } catch (Exception ignored) {}
        }
        heartbeats.clear();
        pendingOrders.clear();
    }

    private class HeartbeatTask extends BukkitRunnable {
        private final String orderId;
        HeartbeatTask(String orderId) { this.orderId = orderId; }
        @Override
        public void run() {
            apiClient.heartbeat(orderId);
        }
    }
}
