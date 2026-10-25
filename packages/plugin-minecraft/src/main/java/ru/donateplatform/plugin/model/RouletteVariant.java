package ru.donateplatform.plugin.model;

public class RouletteVariant {
    private double chance;
    private String description;
    private String command;

    public double getChance() { return chance; }
    public void setChance(double chance) { this.chance = chance; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCommand() { return command; }
    public void setCommand(String command) { this.command = command; }
}
