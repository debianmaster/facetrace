import { hammingDistance } from '../src/utils/phash-utils';

const hash1 = '07f240f1cccfc585'; // 2:17:25
const hash2 = '6fc240f148ce5d95'; // 2:17:19

const distance = hammingDistance(hash1, hash2);
console.log(`Hash 1: ${hash1}`);
console.log(`Hash 2: ${hash2}`);
console.log(`Hamming Distance: ${distance}`);
