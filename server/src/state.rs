use crate::protocol::ServerMessage;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::sync::broadcast;

pub struct PlayerState {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

pub struct GameState {
    pub players: HashMap<String, PlayerState>,
    pub tx: broadcast::Sender<ServerMessage>,
}

impl GameState {
    pub fn new() -> (Arc<RwLock<Self>>, broadcast::Sender<ServerMessage>) {
        let (tx, _) = broadcast::channel(100);
        let state = Arc::new(RwLock::new(Self {
            players: HashMap::new(),
            tx: tx.clone(),
        }));

        (state, tx)
    }
}

pub type SharedState = Arc<RwLock<GameState>>;
