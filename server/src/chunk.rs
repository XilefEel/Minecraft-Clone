use std::sync::Arc;

use noise::{NoiseFn, Perlin};

pub const CHUNK_SIZE: i32 = 16;
pub const CHUNK_HEIGHT: i32 = 64;
const SEA_LEVEL: i32 = 28;

pub struct Chunk {
    pub blocks: Arc<Vec<u8>>,
}

fn get_index(x: i32, y: i32, z: i32) -> usize {
    (x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT) as usize
}

impl Chunk {
    pub fn new() -> Self {
        Self {
            blocks: Arc::new(vec![0; (CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE) as usize]),
        }
    }

    pub fn set_block(&mut self, x: i32, y: i32, z: i32, block: u8) {
        let index = (get_index(x, y, z)) as usize;
        Arc::make_mut(&mut self.blocks)[index] = block;
    }

    pub fn fill_noise(&mut self, cx: i32, cz: i32) {
        let perlin = Perlin::new(6767);
        let mut heights = [[0i32; CHUNK_SIZE as usize]; CHUNK_SIZE as usize];

        //  terrain
        for x in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                let wx = (cx * CHUNK_SIZE + x) as f64;
                let wz = (cz * CHUNK_SIZE + z) as f64;

                let n1 = perlin.get([wx / 300.0, wz / 300.0]);
                let n2 = perlin.get([wx / 80.0, wz / 80.0]);
                let n3 = perlin.get([wx / 20.0, wz / 20.0]);
                let n = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;
                let height = (n * 28.0 + 36.0) as i32;

                heights[x as usize][z as usize] = height;

                let surface_block = if height <= SEA_LEVEL + 2 {
                    6
                } else if height > 50 {
                    7
                } else {
                    1
                };

                for y in 0..CHUNK_HEIGHT {
                    let block = if y == 0 {
                        4
                    } else if y < height.saturating_sub(4) {
                        2
                    } else if y < height {
                        3
                    } else if y == height {
                        surface_block
                    } else if y <= SEA_LEVEL {
                        5
                    } else {
                        0
                    };
                    self.set_block(x, y, z, block);
                }
            }
        }

        // trees
        for x in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                let wx = (cx * CHUNK_SIZE + x) as f64;
                let wz = (cz * CHUNK_SIZE + z) as f64;
                let height = heights[x as usize][z as usize];

                let hash = ((wx as i64).wrapping_mul(374761393)
                    ^ (wz as i64).wrapping_mul(1103515245))
                .abs();

                let should_place_tree = hash % 500 == 0;

                if should_place_tree && height > SEA_LEVEL + 2 && height < 50 {
                    let trunk_height = 4 + (hash % 3) as i32;
                    for ty in height + 1..height + 1 + trunk_height {
                        if ty < CHUNK_HEIGHT {
                            self.set_block(x, ty, z, 8);
                        }
                    }

                    let leaf_center = height + trunk_height;
                    for lx in -1..=1 {
                        for ly in 0..=2 {
                            for lz in -1..=1 {
                                let bx = x + lx;
                                let by = leaf_center + ly;
                                let bz = z + lz;
                                if bx >= 0
                                    && bx < CHUNK_SIZE
                                    && by >= 0
                                    && by < CHUNK_HEIGHT
                                    && bz >= 0
                                    && bz < CHUNK_SIZE
                                {
                                    if self.blocks[get_index(bx, by, bz) as usize] == 0 {
                                        self.set_block(bx, by, bz, 9);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
