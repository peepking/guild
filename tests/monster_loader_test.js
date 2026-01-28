import { MonsterDataLoader } from '../src/data/MonsterDataLoader.js';

const loader = new MonsterDataLoader();
const data = loader.parse();
if (data['EAST'] && data['EAST']['E'] && data['EAST']['E'].length > 0) {
    const monster = data['EAST']['E'][0];
    if (monster.name && monster.rank && monster.mainType) {
        console.log('MonsterDataLoader passed: found EAST E monsters with valid properties');
    } else {
        console.error('MonsterDataLoader failed: Monster object malformed', monster);
        process.exit(1);
    }
} else {
    console.error('MonsterDataLoader failed: Could not find EAST E data');
    process.exit(1);
}
