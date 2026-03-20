use axum::extract::ws::{Message, WebSocket};
use rmp_serde::from_slice;
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
            x: 0.0,
            y: 0.0,
            z: 0.0,
            yaw: 0.0,
        },
    );
}

async fn notify_player_joined(state: &SharedState, id: &str) {
    println!("Player {} joined!", id);

    let state = state.read().await;
    let _ = state
        .tx
        .send(ServerEvent::PlayerJoined { id: id.to_string() });
}

async fn sync_existing_players(socket: &mut WebSocket, state: &SharedState, id: &str) {
    let state = state.read().await;
    for (existing_id, player) in &state.players {
        if existing_id == id {
            continue;
        }
        let msg = ServerEvent::PlayerPosition {
            id: existing_id.clone(),
            x: player.x,
            y: player.y,
            z: player.z,
            yaw: player.yaw,
        };
        let bytes = rmp_serde::to_vec_named(&msg).unwrap();
        let _ = socket.send(Message::Binary(bytes.into())).await;
    }
}

async fn disconnect_player(state: &SharedState, id: &str) {
    println!("Player {} left!", id);

    state.write().await.players.remove(id);
    let _ = state
        .read()
        .await
        .tx
        .send(ServerEvent::PlayerLeft { id: id.to_string() });
}

async fn stream_chunks(
    socket: &mut WebSocket,
    state: &SharedState,
    spawn_cx: i32,
    spawn_cz: i32,
    render_distance: i32,
) -> Result<(), ()> {
    let chunks: Vec<_> = {
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
    msg: ClientEvent,
    state: &SharedState,
    id: &str,
) -> Option<ServerEvent> {
    match msg {
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
            {
                let mut state = state.write().await;
                let cx = x.div_euclid(CHUNK_SIZE as i32);
                let cz = z.div_euclid(CHUNK_SIZE as i32);
                let lx = x.rem_euclid(CHUNK_SIZE as i32);
                let ly = y;
                let lz = z.rem_euclid(CHUNK_SIZE as i32);
                if let Some(chunk) = state.world.get_mut(&(cx, cz)) {
                    chunk.set_block(lx, ly, lz, 0);
                }
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
            {
                let mut state = state.write().await;
                let cx = x.div_euclid(CHUNK_SIZE as i32);
                let cz = z.div_euclid(CHUNK_SIZE as i32);
                let lx = x.rem_euclid(CHUNK_SIZE as i32);
                let ly = y;
                let lz = z.rem_euclid(CHUNK_SIZE as i32);
                if let Some(chunk) = state.world.get_mut(&(cx, cz)) {
                    chunk.set_block(lx, ly, lz, block_id);
                }
            }
            let state = state.read().await;
            let _ = state
                .tx
                .send(ServerEvent::BlockUpdate { x, y, z, block_id });
            None
        }

        ClientEvent::RequestChunk { cx, cz } => {
            if !state.read().await.world.contains_key(&(cx, cz)) {
                let blocks = tokio::task::spawn_blocking(move || {
                    let mut chunk = Chunk::new();
                    chunk.fill_noise(cx, cz);
                    chunk.blocks
                })
                .await
                .unwrap();

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
    }
}

fn is_own_event(event: &ServerEvent, id: &str) -> bool {
    match event {
        ServerEvent::PlayerPosition { id: sender_id, .. } => sender_id == id,
        ServerEvent::PlayerJoined { id: sender_id } => sender_id == id,
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

    let _ = stream_chunks(&mut socket, &state, 0, 0, 4).await;

    register_player(&state, &id).await;
    notify_player_joined(&state, &id).await;
    sync_existing_players(&mut socket, &state, &id).await;

    event_loop(&mut socket, &state, &id, &mut rx).await;

    disconnect_player(&state, &id).await;
}
