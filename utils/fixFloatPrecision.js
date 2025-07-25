/**
 * 修正浮点数精度问题，处理类似 0.n9999999 或 0.n000000000001 的情况
 * @param {number|string} input - 需要处理的数字或字符串
 * @param {number} [maxDecimals=15] - 最大保留小数位数，默认15位
 * @returns {number} 修正后的数字
 */
function fixFloatPrecision(input, maxDecimals = 15) {
    // 将输入转换为字符串
    const str = String(input).trim();

    // 检查是否符合数字格式（包括科学计数法）
    if (!/^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(str)) {
        return Number(input); // 如果不是有效数字格式，返回原始转换结果
    }

    // 将字符串转换为数字
    const num = Number(str);

    // 如果是整数或科学计数法表示的数，直接返回
    if (!str.includes('.') || str.includes('e') || str.includes('E')) {
        return num;
    }

    // 分离整数和小数部分
    const [integerPart, decimalPart] = str.split('.');

    // 检查小数部分是否存在连续的9或0
    const hasNines = /9{4,}$/.test(decimalPart);
    const hasZeros = /0{4,}$/.test(decimalPart);

    // 如果没有连续的9或0，直接返回原数字
    if (!hasNines && !hasZeros) {
        return num;
    }

    // 截取小数部分，最多保留maxDecimals位
    let correctedDecimal = decimalPart.substring(0, maxDecimals);

    // 处理连续的9
    if (hasNines) {
        // 找到第一个连续9的位置
        const firstNine = correctedDecimal.search(/9{2,}/);
        if (firstNine >= 0) {
            // 截取到第一个连续9之前的部分
            correctedDecimal = correctedDecimal.substring(0, firstNine);
            // 如果小数部分为空，整数部分加1
            if (correctedDecimal === '') {
                return Number(integerPart) + 1;
            }
            // 否则将剩余部分视为0
            correctedDecimal = correctedDecimal.padEnd(firstNine, '0');
        }
    }

    // 处理连续的0
    if (hasZeros) {
        // 找到第一个连续0的位置
        const firstZero = correctedDecimal.search(/0{2,}/);
        if (firstZero >= 0) {
            // 截取到第一个连续0之前的部分
            correctedDecimal = correctedDecimal.substring(0, firstZero);
        }
    }

    // 重新组合数字
    const correctedNum = Number(`${integerPart}.${correctedDecimal}`);

    return correctedNum;
}

// 如果在浏览器环境中，挂载到全局（window）
if (typeof window !== 'undefined') {
    window.fixFloatPrecision = fixFloatPrecision;
}

export default fixFloatPrecision;