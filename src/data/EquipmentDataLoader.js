// EquipmentDataLoader returns hardcoded equipment data for browser environment
import { EQUIPMENT_DATA } from '../data/equipmentData.js';

export class EquipmentDataLoader {
    /** Return the hardcoded equipment list. */
    parse() {
        return EQUIPMENT_DATA;
    }
}
