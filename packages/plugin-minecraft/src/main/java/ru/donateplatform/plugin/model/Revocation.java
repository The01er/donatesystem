package ru.donateplatform.plugin.model;

public class Revocation {
    private String id;
    private String playerName;
    private String revokeCommand;
    private String serverId;

    public String getId() { return id; }
    public String getPlayerName() { return playerName; }
    public String getRevokeCommand() { return revokeCommand; }
    public String getServerId() { return serverId; }
}
