package ru.donateplatform.plugin.http;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import okhttp3.*;
import ru.donateplatform.plugin.config.PluginConfig;
import ru.donateplatform.plugin.model.Order;
import ru.donateplatform.plugin.model.Revocation;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class ApiClient {
    private final OkHttpClient client;
    private final Gson gson;
    private final String apiUrl;
    private final String token;

    public ApiClient(PluginConfig config) {
        this.apiUrl = config.getApiUrl();
        this.token = config.getApiToken();

        this.client = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .build();

        this.gson = new GsonBuilder().create();
    }

    private Request.Builder request(String path) {
        return new Request.Builder()
                .url(apiUrl + path)
                .header("X-Plugin-Token", token)
                .header("Content-Type", "application/json");
    }

    // ── GET /api/plugin/orders ──────────────────────────────
    public void fetchOrders(Callback<List<Order>> callback) {
        Request req = request("/api/plugin/orders").get().build();
        client.newCall(req).enqueue(new okhttp3.Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                try (ResponseBody body = response.body()) {
                    if (!response.isSuccessful()) {
                        callback.onError("fetchOrders: HTTP " + response.code());
                        return;
                    }
                    Type listType = new TypeToken<List<Order>>() {}.getType();
                    List<Order> orders = gson.fromJson(body.charStream(), listType);
                    callback.onSuccess(orders);
                } catch (Exception e) {
                    callback.onError("fetchOrders: " + e.getMessage());
                }
            }

            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("fetchOrders: " + e.getMessage());
            }
        });
    }

    // ── POST /api/plugin/orders/:id/start ───────────────────
    public void startOrder(String orderId, Callback<Order> onSuccess, Runnable onConflict, ErrorCallback onError) {
        Request req = request("/api/plugin/orders/" + orderId + "/start").post(emptyBody()).build();
        client.newCall(req).enqueue(new okhttp3.Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                try (ResponseBody body = response.body()) {
                    if (response.code() == 409) {
                        if (onConflict != null) onConflict.run();
                        return;
                    }
                    if (!response.isSuccessful()) {
                        onError.onError("startOrder: HTTP " + response.code());
                        return;
                    }
                    Order order = gson.fromJson(body.charStream(), Order.class);
                    onSuccess.onSuccess(order);
                } catch (Exception e) {
                    onError.onError("startOrder: " + e.getMessage());
                }
            }

            @Override
            public void onFailure(Call call, IOException e) {
                onError.onError("startOrder: " + e.getMessage());
            }
        });
    }

    // ── PATCH /api/plugin/orders/:id/heartbeat ──────────────
    public void heartbeat(String orderId) {
        Request req = request("/api/plugin/orders/" + orderId + "/heartbeat")
                .patch(emptyBody())
                .build();
        client.newCall(req).enqueue(new okhttp3.Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                response.close();
            }
            @Override
            public void onFailure(Call call, IOException e) {
                // silent — heartbeat is best-effort
            }
        });
    }

    // ── POST /api/plugin/orders/:id/action-result ──────────
    public void reportActionResult(String orderId, int actionIndex, String actionType,
                                   String status, String error, Callback<ActionResultResponse> callback) {
        String json = gson.toJson(new ActionResultRequest(actionIndex, actionType, status, error));
        Request req = request("/api/plugin/orders/" + orderId + "/action-result")
                .post(RequestBody.create(json, MediaType.parse("application/json")))
                .build();
        client.newCall(req).enqueue(new okhttp3.Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                try (ResponseBody body = response.body()) {
                    if (!response.isSuccessful()) {
                        callback.onError("reportActionResult: HTTP " + response.code());
                        return;
                    }
                    ActionResultResponse result = gson.fromJson(body.charStream(), ActionResultResponse.class);
                    callback.onSuccess(result);
                } catch (Exception e) {
                    callback.onError("reportActionResult: " + e.getMessage());
                }
            }

            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("reportActionResult: " + e.getMessage());
            }
        });
    }

    // ── POST /api/plugin/orders/:id/complete ────────────────
    public void completeOrder(String orderId, Runnable onSuccess, ErrorCallback onError) {
        Request req = request("/api/plugin/orders/" + orderId + "/complete")
                .post(emptyBody())
                .build();
        client.newCall(req).enqueue(new okhttp3.Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                boolean success = response.isSuccessful();
                int code = response.code();
                response.close();
                if (success && onSuccess != null) {
                    onSuccess.run();
                } else if (onError != null) {
                    onError.onError("completeOrder: HTTP " + code);
                }
            }

            @Override
            public void onFailure(Call call, IOException e) {
                if (onError != null) onError.onError("completeOrder: " + e.getMessage());
            }
        });
    }

    // ── POST /api/plugin/orders/:id/rollback-result ────────
    public void reportRollbackResult(String orderId, String attemptId, int actionIndex,
                                     String status, String error) {
        String json = gson.toJson(new RollbackRequest(attemptId, actionIndex, status, error));
        Request req = request("/api/plugin/orders/" + orderId + "/rollback-result")
                .post(RequestBody.create(json, MediaType.parse("application/json")))
                .build();
        client.newCall(req).enqueue(new okhttp3.Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                response.close();
            }
            @Override
            public void onFailure(Call call, IOException e) {
                // best-effort
            }
        });
    }

    // ── GET /api/plugin/revocations ─────────────────────────
    public void fetchRevocations(Callback<List<Revocation>> callback) {
        Request req = request("/api/plugin/revocations").get().build();
        client.newCall(req).enqueue(new okhttp3.Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                try (ResponseBody body = response.body()) {
                    if (!response.isSuccessful()) {
                        callback.onError("fetchRevocations: HTTP " + response.code());
                        return;
                    }
                    Type listType = new TypeToken<List<Revocation>>() {}.getType();
                    List<Revocation> revocations = gson.fromJson(body.charStream(), listType);
                    callback.onSuccess(revocations);
                } catch (Exception e) {
                    callback.onError("fetchRevocations: " + e.getMessage());
                }
            }

            @Override
            public void onFailure(Call call, IOException e) {
                callback.onError("fetchRevocations: " + e.getMessage());
            }
        });
    }

    // ── POST /api/plugin/orders/:id/revocation-result ──────
    public void reportRevocationResult(String orderId, String status, String error, Runnable onSuccess, ErrorCallback onError) {
        String json = gson.toJson(new RevocationResultRequest(status, error));
        Request req = request("/api/plugin/orders/" + orderId + "/revocation-result")
                .post(RequestBody.create(json, MediaType.parse("application/json")))
                .build();
        client.newCall(req).enqueue(new okhttp3.Callback() {
            @Override
            public void onResponse(Call call, Response response) {
                try (ResponseBody body = response.body()) {
                    if (!response.isSuccessful()) {
                        onError.onError("reportRevocationResult: HTTP " + response.code());
                        return;
                    }
                    if (onSuccess != null) onSuccess.run();
                } catch (Exception e) {
                    onError.onError("reportRevocationResult: " + e.getMessage());
                }
            }

            @Override
            public void onFailure(Call call, IOException e) {
                onError.onError("reportRevocationResult: " + e.getMessage());
            }
        });
    }

    // ── Response models ─────────────────────────────────────
    public static class ActionResultResponse {
        private boolean rollbackRequired;
        private String status;
        private java.util.List<Integer> committedActions;
        private String message;
        private AttemptInfo attempt;

        public boolean isRollbackRequired() { return rollbackRequired; }
        public String getStatus() { return status; }
        public java.util.List<Integer> getCommittedActions() { return committedActions; }
        public String getMessage() { return message; }
        public String getAttemptId() { return attempt != null ? attempt.id : null; }

        private static class AttemptInfo {
            String id;
        }
    }

    // ── Shutdown — evict connections and release threads ────
    public void shutdown() {
        client.dispatcher().executorService().shutdown();
        client.connectionPool().evictAll();
    }

    // ── Empty JSON body helper ──────────────────────────────
    private static RequestBody emptyBody() {
        return RequestBody.create("{}", MediaType.parse("application/json"));
    }

    // ── Callback interfaces ─────────────────────────────────
    public interface Callback<T> {
        void onSuccess(T result);
        void onError(String error);
    }

    public interface ErrorCallback {
        void onError(String error);
    }

    // ── Request body DTOs ───────────────────────────────────
    private static class ActionResultRequest {
        final int actionIndex;
        final String actionType;
        final String status;
        final String error;
        ActionResultRequest(int actionIndex, String actionType, String status, String error) {
            this.actionIndex = actionIndex;
            this.actionType = actionType;
            this.status = status;
            this.error = error;
        }
    }

    private static class RollbackRequest {
        final String attemptId;
        final int actionIndex;
        final String status;
        final String error;
        RollbackRequest(String attemptId, int actionIndex, String status, String error) {
            this.attemptId = attemptId;
            this.actionIndex = actionIndex;
            this.status = status;
            this.error = error;
        }
    }

    private static class RevocationResultRequest {
        final String status;
        final String error;
        RevocationResultRequest(String status, String error) {
            this.status = status;
            this.error = error;
        }
    }
}
