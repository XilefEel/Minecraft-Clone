use std::sync::Arc;

use noise::{NoiseFn, Perlin};

pub const CHUNK_SIZE: i32 = 16;
pub const CHUNK_HEIGHT: i32 = 128;
const SEA_LEVEL: i32 = 43;
const SNOW_LEVEL: i32 = 85;

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
        let perlin = Perlin::new(67);
        let heights = self.generate_terrain(cx, cz, &perlin);
        self.generate_decorations(cx, cz, &perlin, &heights);
    }

    fn generate_terrain(
        &mut self,
        cx: i32,
        cz: i32,
        perlin: &Perlin,
    ) -> [[i32; CHUNK_SIZE as usize]; CHUNK_SIZE as usize] {
        let mut heights = [[0i32; CHUNK_SIZE as usize]; CHUNK_SIZE as usize];

        for x in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                let wx = (cx * CHUNK_SIZE + x) as f64;
                let wz = (cz * CHUNK_SIZE + z) as f64;

                let n1 = perlin.get([wx / 600.0, wz / 600.0]);
                let n2 = perlin.get([wx / 150.0, wz / 150.0]);
                let n3 = perlin.get([wx / 45.0, wz / 45.0]);

                let n = n1 * 0.6 + n2 * 0.25 + n3 * 0.15;

                let n = if n > 0.05 {
                    0.05 + (n - 0.05).powf(1.5) * 2.5
                } else {
                    n * 0.7
                };

                let height = (n * 32.0 + 48.0).min(127.0) as i32;

                heights[x as usize][z as usize] = height;

                let surface_block = if height <= SEA_LEVEL + 2 {
                    6
                } else if height > SNOW_LEVEL {
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

        heights
    }

    fn generate_decorations(
        &mut self,
        cx: i32,
        cz: i32,
        perlin: &Perlin,
        heights: &[[i32; CHUNK_SIZE as usize]; CHUNK_SIZE as usize],
    ) {
        for x in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                let wx = (cx * CHUNK_SIZE + x) as f64;
                let wz = (cz * CHUNK_SIZE + z) as f64;
                let height = heights[x as usize][z as usize];

                let hash = ((wx as i64).wrapping_mul(374761393)
                    ^ (wz as i64).wrapping_mul(1103515245))
                .abs();

                let biome_noise = perlin.get([wx / 500.0, wz / 500.0]);

                self.try_place_tree(x, z, height, hash, biome_noise);
                self.try_place_rock(x, z, height, hash);
                self.try_place_shrub(x, z, height, hash, biome_noise);
                self.try_place_stone_patch(x, z, height, hash);
            }
        }
    }

    fn try_place_tree(&mut self, x: i32, z: i32, height: i32, hash: i64, biome_noise: f64) {
        let hill_bonus = (height - SEA_LEVEL).max(0) as f64;

        let base_density = if biome_noise > 0.3 {
            150.0 // forest
        } else if biome_noise > -0.2 {
            600.0 // plains
        } else {
            400.0 // sparse forest
        };

        let leaf_color = match hash % 100 {
            0..=1 => 12,   // pink
            2..=19 => 11,  // red
            20..=39 => 10, // yellow
            _ => 9,        //  green
        };

        let density = (base_density - (hill_bonus * 3.0)).max(10.0) as i64;
        let should_place_tree = hash % density == 0;

        if should_place_tree && height > SEA_LEVEL + 2 && height < SNOW_LEVEL {
            let trunk_height = 3 + (hash % 3) as i32;
            for ty in height + 1..height + 1 + trunk_height {
                if ty < CHUNK_HEIGHT {
                    self.set_block(x, ty, z, 8);
                }
            }

            let leaf_center = height + trunk_height;

            for ly in 0..=3 {
                let (range, threshold) = if ly >= 2 { (1i32, 1) } else { (2i32, 3) };

                for lx in -range..=range {
                    for lz in -range..=range {
                        if lx.abs() + lz.abs() > threshold {
                            continue;
                        }

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
                                self.set_block(bx, by, bz, leaf_color);
                            }
                        }
                    }
                }
            }
        }
    }

    fn try_place_rock(&mut self, x: i32, z: i32, height: i32, hash: i64) {
        let rock_hash = hash.wrapping_mul(2654435761);
        let should_place_rock = rock_hash % 2000 == 0;
        if should_place_rock && height > SEA_LEVEL && height < SNOW_LEVEL {
            for rx in -1i32..=1 {
                for rz in -1i32..=1 {
                    if rx.abs() + rz.abs() > 1 {
                        continue;
                    }
                    let bx = x + rx;
                    let bz = z + rz;
                    if bx >= 0 && bx < CHUNK_SIZE && bz >= 0 && bz < CHUNK_SIZE {
                        self.set_block(bx, height + 1, bz, 2);
                    }
                }
            }
            self.set_block(x, height + 2, z, 2);
        }
    }

    fn try_place_shrub(&mut self, x: i32, z: i32, height: i32, hash: i64, biome_noise: f64) {
        let shrub_hash = hash.wrapping_mul(1234567891);
        let shrub_density = if biome_noise > 0.3 {
            1500 // forest
        } else if biome_noise > -0.2 {
            500 // plains
        } else {
            750 // sparse forest
        };
        let should_place_shrub = shrub_hash % shrub_density == 0;

        if should_place_shrub && height > SEA_LEVEL + 2 && height < SNOW_LEVEL {
            for sx in -1i32..=1 {
                for sz in -1i32..=1 {
                    if sx.abs() + sz.abs() > 1 {
                        continue;
                    }
                    let bx = x + sx;
                    let bz = z + sz;
                    if bx >= 0 && bx < CHUNK_SIZE && bz >= 0 && bz < CHUNK_SIZE {
                        self.set_block(bx, height + 1, bz, 9);
                    }
                }
            }
            self.set_block(x, height + 2, z, 9);
        }
    }

    fn try_place_stone_patch(&mut self, x: i32, z: i32, height: i32, hash: i64) {
        let stone_hash = hash.wrapping_mul(987654321);
        let should_place_stone = stone_hash % 5000 == 0;
        if should_place_stone && height > SEA_LEVEL && height < SNOW_LEVEL {
            for px in -3i32..=3 {
                for pz in -3i32..=3 {
                    if px.abs() + pz.abs() > 4 {
                        continue;
                    }
                    let bx = x + px;
                    let bz = z + pz;
                    if bx >= 0 && bx < CHUNK_SIZE && bz >= 0 && bz < CHUNK_SIZE {
                        self.set_block(bx, height, bz, 2);
                    }
                }
            }
        }
    }
}
