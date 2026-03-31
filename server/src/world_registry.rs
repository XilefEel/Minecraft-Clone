use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

const REGISTRY_PATH: &str = "worlds.json";

#[derive(Serialize, Deserialize)]
struct WorldMetaData {
    seed: u64,
    created_at: DateTime<Utc>,
    last_played: DateTime<Utc>,
}

type WorldRegistry = HashMap<String, WorldMetaData>;

fn load_registry() -> WorldRegistry {
    fs::read_to_string(REGISTRY_PATH)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_registry(registry: &WorldRegistry) {
    let json = serde_json::to_string_pretty(registry).unwrap();
    fs::write(REGISTRY_PATH, json).unwrap();
}

pub fn list() {
    let registry = load_registry();

    if registry.is_empty() {
        println!("No worlds found.");
        return;
    }

    println!(
        "{:<20} {:<12} {:<20} {:<20}",
        "NAME", "SEED", "CREATED", "LAST PLAYED"
    );
    println!("{}", "-".repeat(74));

    for (name, meta) in &registry {
        println!(
            "{:<20} {:<12} {:<20} {:<20}",
            name,
            meta.seed,
            meta.created_at.format("%Y-%m-%d %H:%M:%S"),
            meta.last_played.format("%Y-%m-%d %H:%M:%S"),
        );
    }
}

pub fn create(world_name: &str, seed: u64) {
    let mut registry = load_registry();

    if registry.contains_key(world_name) {
        eprintln!(
            "World '{}' already exists. Use load to switch to it.",
            world_name
        );
        std::process::exit(1);
    }

    let now = Utc::now();

    registry.insert(
        world_name.to_string(),
        WorldMetaData {
            seed,
            created_at: now,
            last_played: now,
        },
    );
    save_registry(&registry);
    println!("Created world '{}' with seed {}", world_name, seed);
}

pub fn load(world_name: &str) -> u64 {
    let mut registry = load_registry();

    match registry.get_mut(world_name) {
        Some(meta) => {
            println!("Loading world '{}' with seed {}", world_name, meta.seed);
            let seed = meta.seed;
            meta.last_played = Utc::now();
            save_registry(&registry);
            seed
        }
        None => {
            eprintln!("World '{}' not found. Create it first.", world_name);
            std::process::exit(1);
        }
    }
}

pub fn rename(old_name: &str, new_name: &str) {
    let mut registry = load_registry();

    if !registry.contains_key(old_name) {
        eprintln!("World '{}' not found.", old_name);
        std::process::exit(1);
    }

    if registry.contains_key(new_name) {
        eprintln!("World '{}' already exists.", new_name);
        std::process::exit(1);
    }

    let meta = registry.remove(old_name).unwrap();
    registry.insert(new_name.to_string(), meta);
    save_registry(&registry);

    let old_dir = format!("worlds/{}", old_name);
    let new_dir = format!("worlds/{}", new_name);

    if std::fs::rename(&old_dir, &new_dir).is_ok() {
        println!("Renamed '{}' to '{}'", old_name, new_name);
    } else {
        println!("Renamed in registry, but no chunk folder found to rename.");
    }
}

pub fn delete(world_name: &str) {
    let mut registry = load_registry();

    if !registry.contains_key(world_name) {
        eprintln!("World '{}' not found.", world_name);
        std::process::exit(1);
    }

    registry.remove(world_name);
    save_registry(&registry);

    let world_dir = format!("worlds/{}", world_name);

    if std::fs::remove_dir_all(&world_dir).is_ok() {
        println!("Deleted world '{}' and its chunks", world_name);
    } else {
        println!(
            "Deleted world '{}' from registry (no chunk folder found)",
            world_name
        );
    }
}
