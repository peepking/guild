import { Adventurer } from '../src/models/Adventurer.js';
import { EquipmentService } from '../src/services/EquipmentService.js';

// Simple test harness (no test framework) – logs result to console
function assert(condition, message) {
    if (!condition) {
        console.error('FAIL:', message);
        process.exit(1);
    }
}

const adv = new Adventurer(1, 'Test', 'WARRIOR');
adv.personalMoney = 1000;
adv.equipmentLevel = 0;

const service = new EquipmentService();
const result = service.upgradeEquipment(adv);

assert(result.success, 'Equipment upgrade should succeed when enough money');
assert(adv.equipment.length === 1, 'Adventurer should have one equipment');
assert(adv.equipmentLevel === 1, 'Equipment level should increase');
assert(adv.personalMoney < 1000, 'Personal money should be deducted');

console.log('All equipment upgrade tests passed.');
