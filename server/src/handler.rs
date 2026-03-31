use axum::extract::ws::{Message, WebSocket};
use rmp_serde::from_slice;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    chunk::{CHUNK_SIZE, Chunk},
    protocol::{ClientEvent, ServerEvent},
    state::{PlayerState, SharedState},
};

async fn send_event(socket: &mut WebSocket, event: ServerEvent) -> Result<(), ()> {
    let bytes = rmp_serde::to_vec_named(&event).unwrap();
    socket
        .send(Message::Binary(bytes.into()))
        .await
        .map_err(|_| ())
}

async fn register_player(state: &SharedState, id: &str) {
    let mut state = state.write().await;
    state.players.insert(
        id.to_string(),
        PlayerState {
            username: "Player".to_string(),
            x: 0.0,
            y: 0.0,
            z: 0.0,
            yaw: 0.0,
        },
    );
}

async fn set_player_username(state: &SharedState, id: &str, username: &str) {
    let mut state = state.write().await;
    if let Some(player) = state.players.get_mut(id) {
        player.username = username.to_string();
    }
}

async fn sync_existing_players(socket: &mut WebSocket, state: &SharedState, id: &str) {
    let state = state.read().await;
    for (existing_id, player) in &state.players {
        if existing_id == id {
            continue;
        }

        let sync = ServerEvent::PlayerSync {
            id: existing_id.clone(),
            username: player.username.clone(),
        };

        send_event(socket, sync).await.unwrap();

        let pos = ServerEvent::PlayerPosition {
            id: existing_id.clone(),
            x: player.x,
            y: player.y,
            z: player.z,
            yaw: player.yaw,
        };

        send_event(socket, pos).await.unwrap();
    }
}

async fn disconnect_player(state: &SharedState, id: &str) {
    println!("Player {} left!", id);

    let username = {
        let state = state.read().await;
        state
            .players
            .get(id)
            .map(|p| p.username.clone())
            .unwrap_or("Unknown".to_string())
    };

    state.write().await.players.remove(id);

    let _ = state.read().await.tx.send(ServerEvent::PlayerLeft {
        id: id.to_string(),
        username,
    });
}

async fn stream_chunks(
    socket: &mut WebSocket,
    state: &SharedState,
    spawn_cx: i32,
    spawn_cz: i32,
    render_distance: i32,
) -> Result<(), ()> {
    let mut chunks: Vec<_> = {
        let state = state.read().await;
        state
            .world
            .iter()
            .filter(|((cx, cz), _)| {
                let dx = cx - spawn_cx;
                let dz = cz - spawn_cz;
                dx.abs() <= render_distance && dz.abs() <= render_distance
            })
            .map(|((cx, cz), chunk)| (*cx, *cz, chunk.blocks.clone()))
            .collect()
    };

    chunks.sort_by_key(|(cx, cz, _)| {
        let dx = cx - spawn_cx;
        let dz = cz - spawn_cz;
        dx.abs() + dz.abs()
    });

    for (cx, cz, blocks) in chunks {
        send_event(
            socket,
            ServerEvent::ChunkData {
                cx,
                cz,
                blocks: blocks.to_vec(),
            },
        )
        .await?;
    }
    Ok(())
}

async fn process_client_event(
    event: ClientEvent,
    state: &SharedState,
    id: &str,
) -> Option<ServerEvent> {
    match event {
        // when a player joins
        ClientEvent::Join { username } => {
            {
                let mut state = state.write().await;
                if let Some(player) = state.players.get_mut(id) {
                    player.username = username.clone();
                }
            }

            let state = state.read().await;
            let _ = state.tx.send(ServerEvent::PlayerJoined {
                id: id.to_string(),
                username,
            });

            None
        }

        // when a player moves
        ClientEvent::Move { x, y, z, yaw } => {
            {
                let mut state = state.write().await;
                if let Some(player) = state.players.get_mut(id) {
                    player.x = x;
                    player.y = y;
                    player.z = z;
                    player.yaw = yaw;
                }
            }

            let state = state.read().await;
            let _ = state.tx.send(ServerEvent::PlayerPosition {
                id: id.to_string(),
                x,
                y,
                z,
                yaw,
            });

            None
        }

        // when a player breaks a block
        ClientEvent::BlockBreak { x, y, z } => {
            let blocks_to_save;
            {
                let mut state = state.write().await;
                let cx = x.div_euclid(CHUNK_SIZE);
                let cz = z.div_euclid(CHUNK_SIZE);

                let lx = x.rem_euclid(CHUNK_SIZE);
                let ly = y;
                let lz = z.rem_euclid(CHUNK_SIZE);

                blocks_to_save = if let Some(chunk) = state.world.get_mut(&(cx, cz)) {
                    chunk.set_block(lx, ly, lz, 0);
                    Some((cx, cz, chunk.blocks.clone()))
                } else {
                    None
                };
            }

            if let Some((cx, cz, blocks)) = blocks_to_save {
                let world_dir = format!("worlds/{}", state.read().await.world_name);
                tokio::task::spawn_blocking(move || {
                    std::fs::write(format!("{}/chunk_{}_{}.bin", world_dir, cx, cz), &*blocks)
                        .unwrap();
                });
            }

            let state = state.read().await;
            let _ = state.tx.send(ServerEvent::BlockUpdate {
                x,
                y,
                z,
                block_id: 0,
            });

            None
        }

        // when a player places a block
        ClientEvent::BlockPlace { x, y, z, block_id } => {
            let blocks_to_save;
            {
                let mut state = state.write().await;
                let cx = x.div_euclid(CHUNK_SIZE);
                let cz = z.div_euclid(CHUNK_SIZE);

                let lx = x.rem_euclid(CHUNK_SIZE);
                let ly = y;
                let lz = z.rem_euclid(CHUNK_SIZE);

                blocks_to_save = if let Some(chunk) = state.world.get_mut(&(cx, cz)) {
                    chunk.set_block(lx, ly, lz, block_id);
                    Some((cx, cz, chunk.blocks.clone()))
                } else {
                    None
                };
            }

            if let Some((cx, cz, blocks)) = blocks_to_save {
                let world_dir = format!("worlds/{}", state.read().await.world_name);
                tokio::task::spawn_blocking(move || {
                    std::fs::write(format!("{}/chunk_{}_{}.bin", world_dir, cx, cz), &*blocks)
                        .unwrap();
                });
            }

            let state = state.read().await;
            let _ = state
                .tx
                .send(ServerEvent::BlockUpdate { x, y, z, block_id });

            None
        }

        // when a player requests chunk data
        ClientEvent::RequestChunk { cx, cz } => {
            println!("Chunk requested: {}, {}", cx, cz);
            if !state.read().await.world.contains_key(&(cx, cz)) {
                let world_dir = format!("worlds/{}", state.read().await.world_name);
                let path = format!("{}/chunk_{}_{}.bin", world_dir, cx, cz);

                let blocks = if let Ok(data) = std::fs::read(&path) {
                    Arc::new(data) // read from disk if it exists
                } else {
                    // create new chunk
                    let seed = state.read().await.seed;
                    let blocks = tokio::task::spawn_blocking(move || {
                        let mut chunk = Chunk::new();
                        chunk.fill_noise(cx, cz, seed);
                        chunk.blocks
                    })
                    .await
                    .unwrap();

                    blocks
                };

                state
                    .write()
                    .await
                    .world
                    .entry((cx, cz))
                    .or_insert(Chunk { blocks });
            }

            let blocks = state.read().await.world[&(cx, cz)].blocks.clone();

            Some(ServerEvent::ChunkData {
                cx,
                cz,
                blocks: blocks.to_vec(),
            })
        }

        // when a player sends a chat message
        ClientEvent::ChatMessage { message } => {
            let state = state.read().await;
            let username = state
                .players
                .get(id)
                .map(|p| p.username.clone())
                .unwrap_or_default();

            let _ = state
                .tx
                .send(ServerEvent::ChatMessage { username, message });

            None
        }
    }
}

fn is_own_event(event: &ServerEvent, id: &str) -> bool {
    match event {
        ServerEvent::PlayerPosition { id: sender_id, .. } => sender_id == id,
        ServerEvent::PlayerJoined { id: sender_id, .. } => sender_id == id,
        _ => false,
    }
}

async fn event_loop(
    socket: &mut WebSocket,
    state: &SharedState,
    id: &str,
    rx: &mut tokio::sync::broadcast::Receiver<ServerEvent>,
) {
    loop {
        tokio::select! {
            incoming = socket.recv() => {
                let Some(Ok(Message::Binary(data))) = incoming else { break };
                let Ok(event) = from_slice::<ClientEvent>(&data) else { continue };

                if let Some(response) = process_client_event(event, state, id).await {
                    if send_event(socket, response).await.is_err() { break }
                }
            }

            broadcast = rx.recv() => match broadcast {
                Ok(msg) if !is_own_event(&msg, id) => {
                    let bytes = rmp_serde::to_vec_named(&msg).unwrap();
                    if socket.send(Message::Binary(bytes.into())).await.is_err() { break }
                }

                Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                    eprintln!("Player {} lagged, dropped {} messages", id, n);
                }

                Err(_) => break,
                _ => {}
            }
        }
    }
}

pub async fn handle_socket(mut socket: WebSocket, state: SharedState) {
    let id = Uuid::new_v4().to_string();
    let mut rx = state.read().await.tx.subscribe();

    if let Some(Ok(Message::Binary(data))) = socket.recv().await {
        if let Ok(ClientEvent::Join { username }) = from_slice::<ClientEvent>(&data) {
            let _ = stream_chunks(&mut socket, &state, 0, 0, 4).await;

            let time = state.read().await.get_world_time();
            let _ = send_event(&mut socket, ServerEvent::TimeUpdate { time }).await;

            register_player(&state, &id).await;

            set_player_username(&state, &id, &username).await;
            let _ = state.read().await.tx.send(ServerEvent::PlayerJoined {
                id: id.to_string(),
                username,
            });

            sync_existing_players(&mut socket, &state, &id).await;

            let _ = send_event(&mut socket, ServerEvent::Ready).await;
        }
    }

    event_loop(&mut socket, &state, &id, &mut rx).await;
    disconnect_player(&state, &id).await;
}
