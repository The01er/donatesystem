package ru.donateplatform.plugin.model;

import java.util.List;

public class Order {
    private String id;
    private String playerName;
    private String status;
    private int retryCount;
    private int maxRetries;
    private String lastError;
    private String committedActions;
    private String couponCode;
    private boolean upgrade;
    private Product product;
    private String serverId;
    private String createdAt;
    private String updatedAt;

    public static class Product {
        private String id;
        private String name;
        private double price;
        private String actionsJson;
        private String actionsSchemaVersion;

        public String getId() { return id; }
        public String getName() { return name; }
        public double getPrice() { return price; }
        public String getActionsJson() { return actionsJson; }
    }

    public String getId() { return id; }
    public String getPlayerName() { return playerName; }
    public String getStatus() { return status; }
    public int getRetryCount() { return retryCount; }
    public int getMaxRetries() { return maxRetries; }
    public String getCommittedActions() { return committedActions; }
    public Product getProduct() { return product; }
}
