package ru.donateplatform.plugin.model;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class Action {
    private String type;
    private String value;
    private List<RouletteVariant> variants;
    @SerializedName("then") private List<Action> then;
    @SerializedName("else") private List<Action> _else;
    private Integer amount;
    private String duration;

    public Action() {}

    public Action(String type, String value) {
        this.type = type;
        this.value = value;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public List<RouletteVariant> getVariants() { return variants; }
    public void setVariants(List<RouletteVariant> variants) { this.variants = variants; }

    public List<Action> getThen() { return then; }
    public void setThen(List<Action> then) { this.then = then; }

    public List<Action> getElse() { return _else; }
    public void setElse(List<Action> _else) { this._else = _else; }

    public Integer getAmount() { return amount; }
    public void setAmount(Integer amount) { this.amount = amount; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }
}
