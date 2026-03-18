use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum ServerMessage {
    ChunkData { cx: i32, cz: i32, blocks: Vec<u8> },
    BlockUpdate { x: i32, y: i32, z: i32, block: u8 },
}
