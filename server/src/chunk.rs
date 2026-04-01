use std::sync::Arc;

use noise::{NoiseFn, Perlin};

pub const CHUNK_SIZE: i32 = 16;
pub const CHUNK_HEIGHT: i32 = 128;
const SEA_LEVEL: i32 = 43;
const SNOW_LEVEL: i32 = 85;

const CHUNK_VOL: usize = (CHUNK_SIZE as usize) * (CHUNK_HEIGHT as usize) * (CHUNK_SIZE as usize);

pub struct Chunk {
    pub blocks: Arc<Vec<u8>>,
}

#[inline(always)]
fn get_index(x: i32, y: i32, z: i32) -> usize {
    (x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT) as usize
}

impl Chunk {
    pub fn new() -> Self {
        Self {
            blocks: Arc::new(vec![0; CHUNK_VOL]),
        }
    }

    pub fn set_block(&mut self, x: i32, y: i32, z: i32, block: u8) {
        let index = get_index(x, y, z);
        Arc::make_mut(&mut self.blocks)[index] = block;
    }

    #[inline(always)]
    fn set_block_matrix(blocks: &mut [u8], x: i32, y: i32, z: i32, block: u8) {
        let idx = get_index(x, y, z);
        blocks[idx] = block;
    }

    pub fn fill_noise(&mut self, cx: i32, cz: i32, seed: u64) {
        let perlin = Perlin::new(seed as u32);

        let mut blocks = vec![0u8; CHUNK_VOL];
        let heights = Self::generate_terrain(cx, cz, &perlin, &mut blocks);
        Self::generate_decorations(cx, cz, &perlin, &heights, &mut blocks);

        self.blocks = Arc::new(blocks);
    }

    fn generate_terrain(
        cx: i32,
        cz: i32,
        perlin: &Perlin,
        blocks: &mut [u8],
    ) -> [[i32; CHUNK_SIZE as usize]; CHUNK_SIZE as usize] {
        let mut heights = [[0i32; CHUNK_SIZE as usize]; CHUNK_SIZE as usize];

        for x in 0..CHUNK_SIZE {
            for z in 0..CHUNK_SIZE {
                let wx = (cx * CHUNK_SIZE + x) as f64;
                let wz = (cz * CHUNK_SIZE + z) as f64;

                let n1 = perlin.get([wx / 600.0, wz / 600.0]);
                let n2 = perlin.get([wx / 150.0, wz / 150.0]);
                let n3 = perlin.get([wx / 45.0, wz / 45.0]);

                let mut n = n1 * 0.6 + n2 * 0.25 + n3 * 0.15;

                n = if n > 0.05 {
                    0.05 + (n - 0.05).powf(1.5) * 2.5
                } else {
                    n * 0.7
                };

                let height = (n * 32.0 + 48.0).min(127.0) as i32;

                heights[x as usize][z as usize] = height;

                let surface_block = if height <= SEA_LEVEL + 2 {
                    6 // sand
                } else if height > SNOW_LEVEL {
                    7 // snow
                } else {
                    1 // grass
                };

                // bedrock
                Self::set_block_matrix(blocks, x, 0, z, 4);

                // stone
                let stone_end = height.saturating_sub(4).clamp(1, CHUNK_HEIGHT - 1);
                for y in 1..stone_end {
                    Self::set_block_matrix(blocks, x, y, z, 2);
                }

                // dirt
                let dirt_end = height.clamp(1, CHUNK_HEIGHT - 1);
                for y in stone_end..dirt_end {
                    Self::set_block_matrix(blocks, x, y, z, 3);
                }

                // surface
                if height >= 1 && height < CHUNK_HEIGHT {
                    Self::set_block_matrix(blocks, x, height, z, surface_block);
                }

                // water
                if height < SEA_LEVEL {
                    let start = (height + 1).clamp(1, CHUNK_HEIGHT);
                    let end = (SEA_LEVEL + 1).clamp(1, CHUNK_HEIGHT);
                    for y in start..end {
                        Self::set_block_matrix(blocks, x, y, z, 5);
                    }
                }
            }
        }

        heights
    }

    fn generate_decorations(
        cx: i32,
        cz: i32,
        perlin: &Perlin,
        heights: &[[i32; CHUNK_SIZE as usize]; CHUNK_SIZE as usize],
        blocks: &mut [u8],
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

                Self::try_place_tree(blocks, x, z, height, hash, biome_noise);
                Self::try_place_rock(blocks, x, z, height, hash);
                Self::try_place_shrub(blocks, x, z, height, hash, biome_noise);
                Self::try_place_stone_patch(blocks, x, z, height, hash);
            }
        }
    }

    fn try_place_tree(blocks: &mut [u8], x: i32, z: i32, height: i32, hash: i64, biome_noise: f64) {
        let hill_bonus = (height - SEA_LEVEL).max(0) as f64;

        let base_density = if biome_noise > 0.3 {
            150.0 // forest
        } else if biome_noise > -0.2 {
            600.0 // plains
        } else {
            400.0 // sparse forest
        };

        let leaf_color: u8 = match hash % 100 {
            0..=1 => 12,
            2..=19 => 11,
            20..=39 => 10,
            _ => 9,
        };

        let density = (base_density - (hill_bonus * 3.0)).max(10.0) as i64;
        let should_place_tree = hash % density == 0;

        if should_place_tree && height > SEA_LEVEL + 2 && height < SNOW_LEVEL {
            let trunk_height = 3 + (hash % 3) as i32;
            for ty in height + 1..height + 1 + trunk_height {
                if ty < CHUNK_HEIGHT {
                    Self::set_block_matrix(blocks, x, ty, z, 8);
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
                            let idx = get_index(bx, by, bz);
                            if blocks[idx] == 0 {
                                blocks[idx] = leaf_color;
                            }
                        }
                    }
                }
            }
        }
    }

    fn try_place_rock(blocks: &mut [u8], x: i32, z: i32, height: i32, hash: i64) {
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
                    if bx >= 0
                        && bx < CHUNK_SIZE
                        && bz >= 0
                        && bz < CHUNK_SIZE
                        && height + 1 < CHUNK_HEIGHT
                    {
                        Self::set_block_matrix(blocks, bx, height + 1, bz, 2);
                    }
                }
            }
            if height + 2 < CHUNK_HEIGHT {
                Self::set_block_matrix(blocks, x, height + 2, z, 2);
            }
        }
    }

    fn try_place_shrub(
        blocks: &mut [u8],
        x: i32,
        z: i32,
        height: i32,
        hash: i64,
        biome_noise: f64,
    ) {
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
                    if bx >= 0
                        && bx < CHUNK_SIZE
                        && bz >= 0
                        && bz < CHUNK_SIZE
                        && height + 1 < CHUNK_HEIGHT
                    {
                        Self::set_block_matrix(blocks, bx, height + 1, bz, 9);
                    }
                }
            }
            if height + 2 < CHUNK_HEIGHT {
                Self::set_block_matrix(blocks, x, height + 2, z, 9);
            }
        }
    }

    fn try_place_stone_patch(blocks: &mut [u8], x: i32, z: i32, height: i32, hash: i64) {
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
                    if bx >= 0
                        && bx < CHUNK_SIZE
                        && bz >= 0
                        && bz < CHUNK_SIZE
                        && height >= 0
                        && height < CHUNK_HEIGHT
                    {
                        Self::set_block_matrix(blocks, bx, height, bz, 2);
                    }
                }
            }
        }
    }
}
