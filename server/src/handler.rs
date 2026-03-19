use axum::extract::ws::{Message, WebSocket};
use rmp_serde::from_slice;
use uuid::Uuid;

use crate::{
    chunk::CHUNK_SIZE,
    protocol::{ClientEvent, ServerEvent},
    state::{PlayerState, SharedState},
};

async fn register_player(state: &SharedState, id: &str) {
    let mut state = state.write().await;
    state.players.insert(
        id.to_string(),
        PlayerState {
            x: 0.0,
            y: 0.0,
            z: 0.0,
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
        };
        let bytes = rmp_serde::to_vec_named(&msg).unwrap();
        let _ = socket.send(Message::Binary(bytes.into())).await;
    }
}

async fn send_chunks(socket: &mut WebSocket, state: &SharedState) -> Result<(), ()> {
    let state = state.read().await;
    for ((cx, cz), chunk) in &state.world {
        let msg = ServerEvent::ChunkData {
            cx: *cx,
            cz: *cz,
            blocks: chunk.blocks.clone(),
        };
        let bytes = rmp_serde::to_vec_named(&msg).unwrap();
        if socket.send(Message::Binary(bytes.into())).await.is_err() {
            return Err(());
        }
    }
    Ok(())
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

async fn process_client_message(msg: ClientEvent, state: &SharedState, id: &str) {
    match msg {
        // when a player moves
        ClientEvent::Move { x, y, z } => {
            {
                let mut state = state.write().await;
                if let Some(player) = state.players.get_mut(id) {
                    player.x = x;
                    player.y = y;
                    player.z = z;
                }
            }
            let state = state.read().await;
            let _ = state.tx.send(ServerEvent::PlayerPosition {
                id: id.to_string(),
                x,
                y,
                z,
            });
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
                match incoming {
                    Some(Ok(Message::Binary(data))) => {
                        if let Ok(client_msg) = from_slice::<ClientEvent>(&data) {
                            process_client_message(client_msg, state, id).await;
                        }
                    }
                    _ => break,
                }
            }

            broadcast = rx.recv() => {
                if let Ok(server_msg) = broadcast {
                    if !is_own_event(&server_msg, id) {
                        let bytes = rmp_serde::to_vec_named(&server_msg).unwrap();
                        if socket.send(Message::Binary(bytes.into())).await.is_err() {
                            break;
                        }
                    }
                }
            }
        }
    }
}

pub async fn handle_socket(mut socket: WebSocket, state: SharedState) {
    let id = Uuid::new_v4().to_string();

    let mut rx = state.read().await.tx.subscribe();

    register_player(&state, &id).await;
    notify_player_joined(&state, &id).await;
    sync_existing_players(&mut socket, &state, &id).await;

    if send_chunks(&mut socket, &state).await.is_err() {
        disconnect_player(&state, &id).await;
        return;
    }

    event_loop(&mut socket, &state, &id, &mut rx).await;

    disconnect_player(&state, &id).await;
}
