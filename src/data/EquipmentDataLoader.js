// EquipmentDataLoader はブラウザ環境用にハードコードされた装備データを返します
import { EQUIPMENT_DATA } from '../data/equipmentData.js';

export class EquipmentDataLoader {
    /** ハードコードされた装備リストを返します。 */
    parse() {
        return EQUIPMENT_DATA;
    }
}
