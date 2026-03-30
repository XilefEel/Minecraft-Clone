use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum ServerEvent {
    Ready,
    ChunkData {
        cx: i32,
        cz: i32,
        blocks: Vec<u8>,
    },
    PlayerSync {
        id: String,
        username: String,
    },
    PlayerJoined {
        id: String,
        username: String,
    },
    PlayerLeft {
        id: String,
        username: String,
    },
    PlayerPosition {
        id: String,
        x: f64,
        y: f64,
        z: f64,
        yaw: f64,
    },
    BlockUpdate {
        x: i32,
        y: i32,
        z: i32,
        block_id: u8,
    },
    TimeUpdate {
        time: f64,
    },
    ChatMessage {
        username: String,
        message: String,
    },
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum ClientEvent {
    Join {
        username: String,
    },
    Move {
        x: f64,
        y: f64,
        z: f64,
        yaw: f64,
    },
    BlockBreak {
        x: i32,
        y: i32,
        z: i32,
    },
    BlockPlace {
        x: i32,
        y: i32,
        z: i32,
        block_id: u8,
    },
    RequestChunk {
        cx: i32,
        cz: i32,
    },
    ChatMessage {
        message: String,
    },
}
