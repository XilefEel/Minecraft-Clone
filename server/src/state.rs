use crate::chunk::Chunk;
use crate::protocol::ServerEvent;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::sync::broadcast;

const SPAWN_CHUNKS: i32 = 4;

pub struct PlayerState {
    pub username: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub yaw: f64,
}

pub struct GameState {
    pub players: HashMap<String, PlayerState>,
    pub world: HashMap<(i32, i32), Chunk>,
    pub world_time: std::time::Instant,
    pub tx: broadcast::Sender<ServerEvent>,
    pub world_name: String,
    pub seed: u64,
}

impl GameState {
    pub fn new(world_name: &str, seed: u64) -> (Arc<RwLock<Self>>, broadcast::Sender<ServerEvent>) {
        let (tx, _) = broadcast::channel(100);
        let mut world = HashMap::new();

        let world_dir = format!("worlds/{}", world_name);
        std::fs::create_dir_all(&world_dir).unwrap();

        for cx in -SPAWN_CHUNKS..=SPAWN_CHUNKS {
            for cz in -SPAWN_CHUNKS..=SPAWN_CHUNKS {
                let path = format!("{}/chunk_{}_{}.bin", world_dir, cx, cz);

                let chunk = if let Ok(data) = std::fs::read(&path) {
                    Chunk {
                        blocks: Arc::new(data),
                    }
                } else {
                    let mut chunk = Chunk::new();
                    chunk.fill_noise(cx, cz, seed);
                    chunk
                };

                world.insert((cx, cz), chunk);
            }
        }

        let state = Arc::new(RwLock::new(Self {
            players: HashMap::new(),
            world,
            world_time: std::time::Instant::now(),
            tx: tx.clone(),
            world_name: world_name.to_string(),
            seed,
        }));

        let state_clone = state.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(120));
            loop {
                interval.tick().await;
                let s = state_clone.read().await;
                let _ = s.tx.send(ServerEvent::TimeUpdate {
                    time: s.get_world_time(),
                });
            }
        });

        (state, tx)
    }

    pub fn get_world_time(&self) -> f64 {
        self.world_time.elapsed().as_secs_f64()
    }
}

pub type SharedState = Arc<RwLock<GameState>>;
