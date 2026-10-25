plugins {
    java
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

group = "ru.donateplatform"
version = "1.0.0"

java.sourceCompatibility = JavaVersion.VERSION_1_8
java.targetCompatibility = JavaVersion.VERSION_1_8

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
    maven("https://jitpack.io")
}

dependencies {
    compileOnly("com.destroystokyo.paper:paper-api:1.16.5-R0.1-SNAPSHOT")
    compileOnly("com.github.MilkBowl:VaultAPI:1.7") {
        exclude("org.bukkit", "bukkit")
    }
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.11.0")
}

tasks.shadowJar {
    archiveFileName.set("DonatePlugin-${project.version}.jar")
    relocate("okhttp3", "ru.donateplatform.libs.okhttp3")
    relocate("okio", "ru.donateplatform.libs.okio")
    relocate("com.google.gson", "ru.donateplatform.libs.gson")
    minimize()
}

tasks.assemble {
    dependsOn(tasks.shadowJar)
}
