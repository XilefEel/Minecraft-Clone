use crate::chunk::Chunk;
use crate::protocol::ServerMessage;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::sync::broadcast;

const WORLD_SIZE: i32 = 6;

pub struct PlayerState {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

pub struct GameState {
    pub players: HashMap<String, PlayerState>,
    pub world: HashMap<(i32, i32), Chunk>,
    pub tx: broadcast::Sender<ServerMessage>,
}

impl GameState {
    pub fn new() -> (Arc<RwLock<Self>>, broadcast::Sender<ServerMessage>) {
        let (tx, _) = broadcast::channel(100);
        let mut world = HashMap::new();
        for cx in -WORLD_SIZE..=WORLD_SIZE {
            for cz in -WORLD_SIZE..=WORLD_SIZE {
                let mut chunk = Chunk::new();
                chunk.fill_noise(cx, cz);
                world.insert((cx, cz), chunk);
            }
        }

        let state = Arc::new(RwLock::new(Self {
            players: HashMap::new(),
            world,
            tx: tx.clone(),
        }));

        (state, tx)
    }
}

pub type SharedState = Arc<RwLock<GameState>>;
