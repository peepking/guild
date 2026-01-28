import { RecruitmentService } from '../src/services/RecruitmentService.js';
import { ORIGINS } from '../src/data/constants.js';

console.log("--- 冒険者生成テスト (各地域100人) ---");

const service = new RecruitmentService(null); // No guild needed for generation only

const regions = Object.keys(ORIGINS);
const statsSum = {};

regions.forEach(key => {
    const origin = ORIGINS[key];
    console.log(`\n### 地域: ${origin.name} (${origin.id}) ###`);

    const batch = service.generateTemplateBatch(100, origin.id);

    // Avg stats
    let totalSTR = 0, totalVIT = 0, totalMAG = 0, totalDEX = 0, totalINT = 0, totalCHA = 0;

    batch.forEach(adv => {
        totalSTR += adv.stats.STR;
        totalVIT += adv.stats.VIT;
        totalMAG += adv.stats.MAG;
        totalDEX += adv.stats.DEX;
        totalINT += adv.stats.INT;
        totalCHA += adv.stats.CHA;
    });

    console.log(`平均 STR: ${(totalSTR / 100).toFixed(1)}`);
    console.log(`平均 VIT: ${(totalVIT / 100).toFixed(1)}`);
    console.log(`平均 MAG: ${(totalMAG / 100).toFixed(1)}`);
    console.log(`平均 DEX: ${(totalDEX / 100).toFixed(1)}`);
    console.log(`平均 INT: ${(totalINT / 100).toFixed(1)}`);
    console.log(`平均 CHA: ${(totalCHA / 100).toFixed(1)}`);

    // Check Bias
    let bias = [];
    if ((totalSTR / 100) > 40) bias.push("STR");
    if ((totalVIT / 100) > 40) bias.push("VIT");
    if ((totalMAG / 100) > 40) bias.push("MAG");
    if ((totalDEX / 100) > 40) bias.push("DEX");

    console.log(`傾向: ${bias.join(', ')}`);
});
