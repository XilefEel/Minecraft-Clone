use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum ServerMessage {
    ChunkData { cx: i32, cz: i32, blocks: Vec<u8> },
    PlayerJoined { id: String },
    PlayerLeft { id: String },
    PlayerPosition { id: String, x: f64, y: f64, z: f64 },
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum ClientMessage {
    Move { x: f64, y: f64, z: f64 },
}
